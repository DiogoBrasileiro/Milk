/**
 * Auth persistence regression: real React DOM, isolated jsdom and a fake
 * Supabase client. All accounts and records are synthetic; no remote requests.
 *
 * From the repository root after installing its normal dependencies:
 *   npm install --prefix /tmp/milk-auth-qa --no-save --package-lock=false jsdom@26.1.0
 *   MILK_QA_JSDOM_PATH=/tmp/milk-auth-qa/node_modules/jsdom node tests/auth_persistence.mjs
 *
 * If jsdom is already available to Node, omit MILK_QA_JSDOM_PATH. esbuild is a
 * project devDependency. The optional jsdom runtime is kept outside the app.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../package.json', import.meta.url));
const { build } = require('esbuild');
const { JSDOM, VirtualConsole } = require(process.env.MILK_QA_JSDOM_PATH || 'jsdom');
const project = fileURLToPath(new URL('../', import.meta.url));
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CloudAuthProvider } from './src/context/CloudAuthProvider';
import { AuthProvider, useAuth } from './src/context/AuthContext';
window.testState = { user: {id:'user-a',email:'test@example.invalid',created_at:'2026-01-01T00:00:00Z'}, membership: {family_id:'family-a',role:'OWNER'}, record: {data: {baby:{id:'baby-a',name:'Test',familyId:'family-a'},feedings:[{id:'remote-feeding'}],diapers:[{id:'remote-diaper'}]}}, calls:0, recordCalls:0, holds:[] };
window.testClient = {
 auth: {
  getUser: async () => { window.testState.calls++; return {data:{user:window.testState.user},error:window.testState.authError || null}; },
  onAuthStateChange: fn => {window.authChanged=fn; return {data:{subscription:{unsubscribe(){}}}};},
  signOut: async () => { window.authChanged('SIGNED_OUT',null); return {error:null}; },
 },
 from: (table) => { const q = {select(){return q},eq(){return q},maybeSingle:async()=>({data:window.testState.membership,error:null}),single:async()=> { window.testState.recordCalls++; const record=window.testState.record; if(window.testState.holdNextRecord) {window.testState.holdNextRecord=false; await new Promise(resolve=>window.testState.holds.push(resolve));} return {data:{value:record},error:null}; }}; return q; }
};
function Capture(){ const auth=useAuth();window.auth=auth;return <div id='identity'>{auth.currentUser?.id||'signed-out'}</div>; }
const root=createRoot(document.getElementById('root'));
window.mountCloud=()=>root.render(<React.StrictMode><CloudAuthProvider><Capture/></CloudAuthProvider></React.StrictMode>);
window.mountLegacy=()=>root.render(<AuthProvider><Capture/></AuthProvider>);
`;
const output = await build({stdin:{contents:entry,loader:'tsx',resolveDir:project,sourcefile:'auth-harness.tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"development"','import.meta.env':JSON.stringify({BASE_URL:'/',MODE:'pages',VITE_SUPABASE_URL:'https://example.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'public-test'})},plugins:[{name:'mock-supabase',setup(b){b.onResolve({filter:/supabaseClient$/},()=>({path:'mock-client',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const getClientSupabase=()=>window.testClient;',loader:'js'}));}}]});
const errors=[];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom = new JSDOM('<div id="root"></div>',{url:'http://milk.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole});
const win=dom.window;
win.structuredClone=globalThis.structuredClone;
const page={
 evaluate:async(fn)=>{const result=await win.eval('('+fn.toString()+')()');return result===undefined?undefined:JSON.parse(JSON.stringify(result));},
 waitForTimeout:ms=>new Promise(r=>setTimeout(r,ms)),
 waitForFunction:async(fn)=>{const start=Date.now();while(!(await page.evaluate(fn))){if(Date.now()-start>3000)throw new Error('Wait timed out: '+fn);await page.waitForTimeout(10);}},
};
win.eval(output.outputFiles[0].text);
await page.evaluate(()=>{
 localStorage.setItem('milkflow_family_data_family-a',JSON.stringify({baby:{id:'baby-a'},feedings:[{id:'local-feeding'}],diapers:[{id:'local-diaper'}]}));
 localStorage.setItem('milkflow_outbox_v1:family-a:tab-test',JSON.stringify({familyId:'family-a',revision:'write-test',data:{diapers:[{id:'outbox-diaper'}]}}));
 localStorage.setItem('milkflow_family_data_family-b',JSON.stringify({feedings:[{id:'family-b-private'}]}));
 window.mountCloud();
});
await page.waitForFunction(()=>window.auth?.currentUser?.id==='user-a');
const cache = () => page.evaluate(()=>JSON.parse(localStorage.getItem('milkflow_family_data_family-a')));
let data=await cache();
assert.deepEqual(data.feedings.map(x=>x.id).sort(),['local-feeding','remote-feeding']);
assert.deepEqual(data.diapers.map(x=>x.id).sort(),['local-diaper','outbox-diaper','remote-diaper']);
console.log('PASS auth hydrate merges remote, local and pending records without another family');
let calls=await page.evaluate(()=>window.testState.calls);
await page.evaluate(()=>{window.authChanged('TOKEN_REFRESHED',{user:window.testState.user});window.authChanged('SIGNED_IN',{user:window.testState.user});});
await page.waitForTimeout(30);
assert.equal(await page.evaluate(()=>window.testState.calls),calls);
console.log('PASS token refresh and repeated sign-in do not overwrite cache or rehydrate');
await page.evaluate(()=>{window.testState.holdNextRecord=true;void window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.testState.holds.length===1);
await page.evaluate(()=>{const key='milkflow_family_data_family-a';const data=JSON.parse(localStorage.getItem(key));data.feedings.push({id:'feeding-during-hydration'});localStorage.setItem(key,JSON.stringify(data));window.testState.holds.shift()();});
await page.waitForTimeout(30);
assert.ok((await cache()).feedings.some(x=>x.id==='feeding-during-hydration'));
console.log('PASS cache is read after network: new feeding during hydration survives');
await page.evaluate(async()=>{window.testState.authError={name:'AuthRetryableFetchError',status:0,message:'Failed to fetch'};await window.auth.refreshCloudAccess();});
assert.equal(await page.evaluate(()=>window.auth.currentUser?.id),'user-a');
console.log('PASS temporary auth network failure retains verified identity and local records');
await page.evaluate(async()=>{window.testState.authError=null;window.testState.membership=null;await window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.auth.currentUser===null);
assert.ok((await cache()).feedings.some(x=>x.id==='feeding-during-hydration'));
console.log('PASS revoked membership clears identity without deleting cache');
await page.evaluate(async()=>{window.testState.membership={family_id:'family-a',role:'OWNER'};await window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.auth.currentUser?.id==='user-a');
await page.evaluate(()=>{window.testState.holdNextRecord=true;window.testState.record.data.feedings.push({id:'late-remote'});void window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.testState.holds.length===1);
await page.evaluate(()=>{window.auth.signOutUser();window.testState.holds.shift()();});
await page.waitForTimeout(30);
assert.equal(await page.evaluate(()=>window.auth.currentUser),null);
assert.ok(!(await cache()).feedings.some(x=>x.id==='late-remote'));
console.log('PASS logout invalidates in-flight hydration before identity/cache commit');
await page.evaluate(async()=>{await window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.auth.currentUser?.id==='user-a');
await page.evaluate(async()=>{window.testState.authError={name:'AuthSessionMissingError',status:400,message:'Missing session'};await window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.auth.currentUser===null);
assert.equal(await page.evaluate(()=>window.auth.cloudUserId),null);
console.log('PASS missing/invalid auth session clears identity rather than granting offline access');

await page.evaluate(async()=>{window.testState.authError=null;await window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.auth.currentUser?.id==='user-a');
await page.evaluate(()=>{window.testState.holdNextRecord=true;void window.auth.refreshCloudAccess();});
await page.waitForFunction(()=>window.testState.holds.length===1);
await page.evaluate(()=>{window.testState.user={id:'user-b',email:'b@example.invalid',created_at:'2026-01-01T00:00:00Z'};window.testState.membership={family_id:'family-b',role:'OWNER'};window.testState.record={data:{baby:{id:'baby-b',name:'B'},feedings:[{id:'b-remote'}]}};window.authChanged('SIGNED_IN',{user:window.testState.user});});
await page.waitForFunction(()=>window.auth.currentUser?.id==='user-b');
await page.evaluate(()=>window.testState.holds.shift()());
await page.waitForTimeout(30);
assert.equal(await page.evaluate(()=>window.auth.currentUser.id),'user-b');
assert.equal(await page.evaluate(()=>window.auth.currentFamily.id),'family-b');
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('milkflow_family_data_family-b')).feedings.map(x=>x.id).sort()),['b-remote','family-b-private']);
console.log('PASS switching accounts invalidates old hydration and keeps family caches isolated');
await page.evaluate(()=>{localStorage.clear();window.mountLegacy();});
await page.waitForFunction(()=>window.auth && !window.auth.refreshCloudAccess && window.auth.currentUser===null);
await page.evaluate(()=>{
 window.legacyData={success:true,user:{id:'legacy-user',email:'legacy@example.invalid',name:'Tester',role:'OWNER',createdAt:'2026-01-01T00:00:00Z'},family:{id:'legacy-family',name:'Test',ownerId:'legacy-user',babyIds:['legacy-baby'],createdAt:'2026-01-01T00:00:00Z'},babies:[{id:'legacy-baby',name:'Test'}],familyData:{feedings:[{id:'legacy-remote'}],diapers:[]}};
 window.fetch=async()=>({ok:true,json:async()=>window.legacyData});
 localStorage.setItem('milkflow_family_data_legacy-family',JSON.stringify({feedings:[{id:'legacy-local'}],diapers:[{id:'legacy-diaper'}]}));
 localStorage.setItem('milkflow_outbox_v1:legacy-family:tab',JSON.stringify({familyId:'legacy-family',revision:'write-legacy',data:{diapers:[{id:'legacy-pending'}]}}));
});
await page.evaluate(()=>window.auth.signInWithEmail('legacy@example.invalid','test-password'));
await page.waitForFunction(()=>window.auth.currentUser?.id==='legacy-user');
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('milkflow_family_data_legacy-family')).feedings.map(x=>x.id).sort()),['legacy-local','legacy-remote']);
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('milkflow_family_data_legacy-family')).diapers.map(x=>x.id).sort()),['legacy-diaper','legacy-pending']);
console.log('PASS legacy email login preserves local and queued feeding/diaper records');
await page.evaluate(()=>window.auth.signOutUser());
await page.waitForFunction(()=>window.auth.currentUser===null);
await page.evaluate(()=>{window.legacyData.familyData={feedings:[],diapers:[]};return window.auth.signInWithFamilyCode('ABCDEF','Tester');});
await page.waitForFunction(()=>window.auth.currentUser?.id==='legacy-user');
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('milkflow_family_data_legacy-family')).feedings.map(x=>x.id).sort()),['legacy-local','legacy-remote']);
console.log('PASS legacy family-code login cannot replace history with an empty remote snapshot');
await page.evaluate(()=>window.auth.signUpWithEmail('Tester','legacy@example.invalid','test-password'));
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('milkflow_family_data_legacy-family')).diapers.map(x=>x.id).sort()),['legacy-diaper','legacy-pending']);
console.log('PASS registration response also preserves existing scoped cache');
assert.deepEqual(errors,[]);
dom.window.close();
console.log('AUTH REGRESSION: 11 checks passed');
