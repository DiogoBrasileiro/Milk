"""Browser regression for persistence. All identities and API responses are synthetic.

Run a frontend-only server first (never `npm run dev`, which starts the backend):
  npx vite --host 127.0.0.1 --port 5178 --strictPort
  python tests/browser_persistence.py

Requires Playwright for Python and Chromium. No Supabase or other external
endpoint is contacted. `--baseline` documents the old failure behavior.
"""
import argparse
import asyncio
import copy
import json
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from playwright.async_api import async_playwright


NOW = datetime.now(timezone.utc).isoformat()
COLLECTIONS = (
    "batches", "transactions", "feedings", "pumpings", "diapers",
    "discomforts", "weights", "sleepLogs", "medications", "medicationLogs",
    "diaperStockItems", "diaperStockTransactions", "diaperShoppingItems",
    "feedingPhases", "auditLogs", "aiInsights", "caregivers",
)


def fixture(suffix):
    family_id, baby_id = f"fam_qa_{suffix}", f"baby_qa_{suffix}"
    user = {"id": f"usr_qa_{suffix}", "email": f"qa-{suffix}@example.invalid",
            "name": f"Cuidador Teste {suffix}", "role": "OWNER", "avatarColor": "#2563eb",
            "currentFamilyId": family_id, "createdAt": NOW, "emailVerified": True}
    family = {"id": family_id, "name": f"Família Teste {suffix}", "ownerId": user["id"],
              "createdAt": NOW, "babyIds": [baby_id]}
    baby = {"id": baby_id, "familyId": family_id, "createdBy": user["id"],
            "name": f"Bebê Teste {suffix}", "birthDate": "2026-07-01", "gender": "feminino",
            "birthWeight": 3000, "currentWeight": 6000, "birthLength": 49, "currentLength": 60}
    member = {"userId": user["id"], "familyId": family_id, "name": user["name"],
              "email": user["email"], "role": "OWNER", "joinedAt": NOW, "avatarColor": "#2563eb"}
    session = {"user": user, "family": family, "babies": [baby], "members": [member], "activeBabyId": baby_id}
    snapshot = {key: [] for key in COLLECTIONS}
    snapshot.update({"baby": baby, "protocolId": "brasil_ms", "lastUpdatedAt": NOW,
                     "customReminderIntervalMinutes": 165, "deletedItemIds": {},
                     "caregivers": [{"id": f"cg_qa_{suffix}", "name": user["name"], "role": "mae", "avatarColor": "#2563eb"}],
                     "feedings": [{"id": f"seed_feeding_{suffix}", "timestamp": NOW, "createdAt": NOW, "updatedAt": NOW,
                                   "type": "formula", "consumedMl": 60, "offeredMl": 60, "caregiverId": f"cg_qa_{suffix}", "caregiverName": user["name"]}],
                     "diapers": [{"id": f"seed_diaper_{suffix}", "timestamp": NOW, "createdAt": NOW, "updatedAt": NOW,
                                  "type": "xixi", "caregiverId": f"cg_qa_{suffix}", "caregiverName": user["name"]}]})
    return session, snapshot


def merge(old, new):
    result = {**old, **new}
    for key in COLLECTIONS:
        if key in old or key in new:
            by_id = {item["id"]: item for item in old.get(key, [])}
            by_id.update({item["id"]: item for item in new.get(key, [])})
            result[key] = list(by_id.values())
    return result


class Api:
    def __init__(self):
        self.sessions, self.snapshots = {}, {}
        for suffix in ("a", "b"):
            session, snapshot = fixture(suffix)
            self.sessions[session["family"]["id"]] = session
            self.snapshots[session["family"]["id"]] = snapshot
        self.fail_posts = False
        self.fail_reads = False
        self.false_ack = False
        self.posts = []
        self.blocked_external = []
        self.delay_next_post = False
        self.post_started = asyncio.Event()
        self.release_post = asyncio.Event()

    async def route(self, route):
        request, parsed = route.request, urlparse(route.request.url)
        if parsed.hostname not in ("127.0.0.1", "localhost"):
            self.blocked_external.append(parsed.hostname)
            await route.abort()
            return
        if not parsed.path.startswith("/api/"):
            await route.continue_()
            return
        path = parsed.path
        family_id = next((family for family in self.sessions if family in path), "fam_qa_a")
        session = self.sessions[family_id]
        body = {"success": True, "supabaseActive": True, **session, "familyData": self.snapshots[family_id]}
        if path == "/api/auth/login":
            payload = request.post_data_json
            family_id = "fam_qa_b" if payload.get("email") == "qa-b@example.invalid" else "fam_qa_a"
            session = self.sessions[family_id]
            body = {"success": True, "supabaseActive": True, **session, "familyData": self.snapshots[family_id]}
        elif path.endswith("/events"):
            # Empty SSE is enough to open the connection without fabricating a
            # successful write confirmation. All reads still use mocked /sync.
            await route.fulfill(status=200, content_type="text/event-stream", body=": heartbeat\n\n")
            return
        elif path.endswith("/sync") and request.method == "POST":
            payload = request.post_data_json
            self.posts.append(copy.deepcopy({"familyId": family_id, "payload": payload}))
            if self.delay_next_post:
                self.delay_next_post = False
                self.post_started.set()
                await self.release_post.wait()
            if self.fail_posts:
                await route.fulfill(status=503, content_type="application/json", body=json.dumps({"success": False, "supabaseSynced": False, "errorCode": "permission_denied", "error": "Synthetic database unavailable"}))
                return
            if self.false_ack:
                body = {"success": True, "supabaseSynced": False}
            else:
                self.snapshots[family_id] = merge(self.snapshots[family_id], payload.get("data", payload))
                body = {"success": True, "supabaseActive": True, "supabaseSynced": True, "familyData": self.snapshots[family_id]}
        elif path.endswith("/sync") and request.method == "GET" and self.fail_reads:
            body = {"success": True, "supabaseActive": False, "supabaseIssue": "permission_denied",
                    **session, "familyData": self.snapshots[family_id]}
        elif path == "/api/supabase/status":
            body = {"connected": True, "latencyMs": 1, "testedAt": NOW, "message": "Synthetic endpoint"}
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(body))


async def cache(page, family_id="fam_qa_a"):
    return await page.evaluate("family => JSON.parse(localStorage.getItem('milkflow_family_data_' + family) || '{}')", family_id)


async def wait_counts(page, feedings, diapers, family_id="fam_qa_a"):
    await page.wait_for_function("([family, f, d]) => { const v=JSON.parse(localStorage.getItem('milkflow_family_data_'+family)||'{}'); return v.feedings?.length===f && v.diapers?.length===d; }", arg=[family_id, feedings, diapers])


async def add_feeding(page):
    await page.locator("#main-quick-record-fab").click()
    await page.locator("#btn-quick-mamada").click()
    await page.get_by_role("button", name=re.compile("Direto no Peito")).click()
    await page.get_by_role("button", name=re.compile("No Peito.*Direto na mama")).click()
    await page.get_by_role("button", name="Preencher Minutos (Retroativo)").click()
    await page.get_by_role("button", name="Salvar Mamada", exact=True).click()


async def add_diaper(page, poop=False):
    await page.locator("#main-quick-record-fab").click()
    await page.locator("#btn-quick-coco" if poop else "#btn-quick-xixi").click()


async def badge(page):
    # The successful label is hidden at some responsive widths. Its title is
    # present in every viewport and exposes the actual status to the user.
    return await page.locator("#cloud-sync-status-btn").get_attribute("title") or ""


async def pending(page, family_id="fam_qa_a"):
    return await page.evaluate("family => Object.keys(localStorage).filter(k => k.startsWith('milkflow_outbox_v1:' + encodeURIComponent(family) + ':')).map(k => JSON.parse(localStorage.getItem(k)))", family_id)


async def wait_acknowledged(page, family_id="fam_qa_a"):
    # The mock can receive a write before React consumes its response. Wait for
    # acknowledgment, not just server receipt, before changing failure modes.
    await page.wait_for_function("""family => {
        const prefix = 'milkflow_outbox_v1:' + encodeURIComponent(family) + ':';
        const empty = !Object.keys(localStorage).some(key => key.startsWith(prefix));
        const title = document.querySelector('#cloud-sync-status-btn')?.title || '';
        return empty && title.includes('Tempo Real Ativo');
    }""", arg=family_id)


async def wait_pending_error(page):
    await page.wait_for_function("() => document.querySelector('#cloud-sync-status-btn')?.title.startsWith('Envio pendente:')")


async def wait_remote(page, api, feedings, diapers, family_id="fam_qa_a"):
    for _ in range(120):
        remote = api.snapshots[family_id]
        if len(remote["feedings"]) == feedings and len(remote["diapers"]) == diapers:
            return
        await page.wait_for_timeout(100)
    raise AssertionError(f"server did not confirm expected counts {feedings}/{diapers}; got {len(remote['feedings'])}/{len(remote['diapers'])}")


async def login(page, suffix):
    await page.locator("#user-account-menu-btn").click()
    await page.get_by_role("button", name="Sair da Conta").click()
    await page.get_by_placeholder("seu.email@exemplo.com").fill(f"qa-{suffix}@example.invalid")
    await page.get_by_placeholder("Mínimo 6 caracteres").fill("synthetic-password-only")
    await page.get_by_role("button", name="ENTRAR COM E-MAIL").click()
    await page.locator("#main-quick-record-fab").wait_for()


async def run(args):
    api, outcomes = Api(), []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=args.chromium or None, args=["--no-sandbox"])
        context = await browser.new_context(viewport={"width": 1280, "height": 960}, timezone_id="America/Bahia")
        await context.route("**/*", api.route)
        await context.add_init_script("""(seed => {
            if (!localStorage.getItem('qa_persistence_seeded')) {
                localStorage.setItem('milkflow_auth_session_v2', JSON.stringify(seed.session));
                localStorage.setItem('milkflow_family_data_fam_qa_a', JSON.stringify(seed.snapshot));
                localStorage.setItem('qa_persistence_seeded', 'yes');
            }
        })(""" + json.dumps({"session": api.sessions["fam_qa_a"], "snapshot": api.snapshots["fam_qa_a"]}) + ");")
        page = await context.new_page()
        await page.goto(args.url)
        await page.locator("#main-quick-record-fab").wait_for()
        await wait_counts(page, 1, 1)
        if not args.baseline:
            await wait_acknowledged(page)
        await add_feeding(page)
        await add_diaper(page)
        await wait_counts(page, 2, 2)
        await wait_remote(page, api, 2, 2)
        if not args.baseline:
            await wait_acknowledged(page)
        await page.reload()
        await page.locator("#main-quick-record-fab").wait_for()
        await wait_counts(page, 2, 2)
        if not args.baseline:
            await wait_acknowledged(page)
        outcomes.append("PASS: real feeding/diaper UI saves and reload retains history")

        if not args.baseline:
            api.fail_reads = True
            await page.locator("#cloud-sync-status-btn").click()
            await page.get_by_text("O Supabase recusou a consulta", exact=False).wait_for(timeout=10000)
            assert "Consulta ao banco não confirmada" in await badge(page), "read error was presented as an unsaved write"
            assert not await pending(page), "unexpected queued writes while testing read-only failure"
            api.fail_reads = False
            await page.locator("#cloud-sync-status-btn").click()
            await wait_acknowledged(page)
            outcomes.append("PASS: read permission failures are distinct from pending writes and recover on retry")

        api.fail_posts = True
        await add_diaper(page, poop=True)
        await wait_counts(page, 2, 3)
        await page.wait_for_timeout(3600)  # Covers the legacy poll/SSE overwrite.
        failed_badge = await badge(page)
        outcomes.append("OBSERVED failed-write status: " + failed_badge)
        if not args.baseline:
            assert "Envio pendente:" in failed_badge, "failed write displayed as synchronized"
            await page.get_by_text("O Supabase recusou a gravação", exact=False).wait_for(timeout=10000)
            assert await pending(page), "failed write is missing a durable outbox entry"
            await page.reload()
            await page.locator("#main-quick-record-fab").wait_for()
            await wait_counts(page, 2, 3)
            await wait_pending_error(page)
            assert await pending(page), "reload discarded pending changes"
            outcomes.append("PASS: failed write survives a reload while remote history is stale")
        before = len(api.posts)
        api.fail_posts = False
        await page.evaluate("window.dispatchEvent(new Event('online'))")
        if args.baseline:
            await page.wait_for_timeout(3600)
        else:
            await wait_remote(page, api, 2, 3)
            await wait_acknowledged(page)
        outcomes.append(f"OBSERVED automatic retry posts: {len(api.posts)-before}")

        if not args.baseline:
            api.false_ack = True
            await add_diaper(page)
            await wait_counts(page, 2, 4)
            await wait_pending_error(page)
            assert await pending(page), "success:true with supabaseSynced:false removed the pending write"
            assert "Envio pendente:" in await badge(page), "false database acknowledgment was presented as synced"
            api.false_ack = False
            await page.evaluate("window.dispatchEvent(new Event('online'))")
            await wait_remote(page, api, 2, 4)
            await wait_acknowledged(page)
            outcomes.append("PASS: a server response without database acknowledgment does not clear the outbox")

            api.delay_next_post = True
            await add_diaper(page)
            await asyncio.wait_for(api.post_started.wait(), timeout=10)
            await add_feeding(page)
            await wait_counts(page, 3, 5)
            api.release_post.set()
            await wait_remote(page, api, 3, 5)
            await wait_acknowledged(page)
            outcomes.append("PASS: late acknowledgment preserves the newer queued mutation")

            await context.set_offline(True)
            await page.wait_for_function("() => navigator.onLine === false")
            before = len(api.posts)
            await add_diaper(page)
            await wait_counts(page, 3, 6)
            assert await pending(page), "offline mutation was not queued"
            assert len(api.posts) == before, "offline mutation should wait for connectivity"
            await context.set_offline(False)
            await wait_remote(page, api, 3, 6)
            await wait_acknowledged(page)
            outcomes.append("PASS: offline write is resent automatically when connectivity returns")

            first_family_ids = {item["id"] for item in (await cache(page))["feedings"]}
            await login(page, "b")
            await wait_counts(page, 1, 1, "fam_qa_b")
            await wait_acknowledged(page, "fam_qa_b")
            await add_feeding(page)
            await wait_counts(page, 2, 1, "fam_qa_b")
            await wait_remote(page, api, 2, 1, "fam_qa_b")
            await wait_acknowledged(page, "fam_qa_b")
            second_family_ids = {item["id"] for item in (await cache(page, "fam_qa_b"))["feedings"]}
            assert not first_family_ids.intersection(second_family_ids), "changing family mixed private records"
            await login(page, "a")
            await wait_counts(page, 3, 6)
            await wait_acknowledged(page)
            outcomes.append("PASS: logout/login switches families without copying records across accounts")

        print(json.dumps({"results": outcomes, "mock_posts": len(api.posts), "external_requests_blocked": sorted(set(api.blocked_external))}, indent=2, ensure_ascii=False))
        await browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5178/")
    parser.add_argument("--chromium", default=os.environ.get("MILK_BROWSER_EXECUTABLE", "/usr/bin/chromium"))
    parser.add_argument("--baseline", action="store_true")
    asyncio.run(run(parser.parse_args()))
