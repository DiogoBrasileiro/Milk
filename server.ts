import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { cloudStore } from './server/cloudStore';
import { familySnapshotData } from './server/familyPersistence';
import { classifySupabaseFailure, type SyncIssueCode } from './src/lib/syncDiagnostics';
import {
  testSupabaseHealth,
  syncFamilyDataToSupabase,
  persistFamilyDataToSupabase,
  loadFamilyDataFromSupabase,
  SUPABASE_CONFIG,
} from './server/supabase';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: '10mb' }));

// ============================================================================
// ⚡ REAL-TIME MULTI-DEVICE SSE (SERVER-SENT EVENTS) BROADCAST ENGINE
// ============================================================================
const sseSubscribers = new Map<string, Set<express.Response>>();

function addSseSubscriber(familyId: string, res: express.Response) {
  if (!sseSubscribers.has(familyId)) {
    sseSubscribers.set(familyId, new Set());
  }
  sseSubscribers.get(familyId)!.add(res);
}

function removeSseSubscriber(familyId: string, res: express.Response) {
  const set = sseSubscribers.get(familyId);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      sseSubscribers.delete(familyId);
    }
  }
}

function broadcastFamilyUpdate(familyId: string, payload: any) {
  const set = sseSubscribers.get(familyId);
  if (set && set.size > 0) {
    const rawData = `data: ${JSON.stringify(payload)}\n\n`;
    for (const clientRes of set) {
      try {
        clientRes.write(rawData);
      } catch (err) {
        console.warn('Error broadcasting to SSE subscriber, removing client', err);
        set.delete(clientRes);
      }
    }
  }
}

// Keep-alive heartbeat interval to prevent mobile connection drops
setInterval(() => {
  for (const [_, clients] of sseSubscribers.entries()) {
    for (const clientRes of clients) {
      try {
        clientRes.write(':ping\n\n');
      } catch (_) {
        clients.delete(clientRes);
      }
    }
  }
}, 15000);

// ============================================================================
// ☁️ MULTI-DEVICE CLOUD AUTHENTICATION & FAMILY SYNC ROUTES
// ============================================================================

// GET /api/family/:familyId/events - Live Real-time SSE Stream for all devices
app.get('/api/family/:familyId/events', (req, res) => {
  const { familyId } = req.params;
  if (!familyId) {
    return res.status(400).send('Family ID is required');
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial handshake and current data snapshot
  res.write(':connected\n\n');
  const initialData = cloudStore.getFamilyData(familyId);
  res.write(
    `data: ${JSON.stringify({
      type: 'snapshot',
      family: initialData.family,
      babies: initialData.babies,
      familyData: initialData.familyData,
      serverTime: new Date().toISOString(),
    })}\n\n`
  );

  addSseSubscriber(familyId, res);

  req.on('close', () => {
    removeSseSubscriber(familyId, res);
  });
});

// POST /api/auth/signup - Cadastrar conta e família na nuvem
app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const result = cloudStore.registerUser(name, email, password);
    syncFamilyDataToSupabase(result.family.id, result.familyData).catch(() => {});

    return res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarColor: result.user.avatarColor,
        role: result.user.role,
        currentFamilyId: result.user.familyId,
        createdAt: result.user.createdAt,
        emailVerified: true,
      },
      family: result.family,
      babies: result.babies,
      familyData: result.familyData,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Erro ao criar conta.' });
  }
});

// POST /api/auth/sync-session - Sincroniza sessão ativa de qualquer aparelho existente para a nuvem
app.post('/api/auth/sync-session', (req, res) => {
  try {
    const { user, family, babies, familyData, password } = req.body;
    if (!user || !user.email) {
      return res.status(400).json({ success: false, error: 'Usuário inválido para sincronização.' });
    }

    const result = cloudStore.syncOrUpsertSession({
      user,
      family,
      babies,
      familyData,
      password,
    });

    syncFamilyDataToSupabase(result.family.id, result.familyData).catch(() => {});

    broadcastFamilyUpdate(result.family.id, {
      type: 'data_updated',
      family: result.family,
      babies: result.babies,
      familyData: result.familyData,
      serverTime: new Date().toISOString(),
    });

    return res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarColor: result.user.avatarColor,
        role: result.user.role,
        currentFamilyId: result.user.familyId,
        createdAt: result.user.createdAt,
        emailVerified: true,
      },
      family: result.family,
      babies: result.babies,
      familyData: result.familyData,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Erro ao sincronizar sessão na nuvem.' });
  }
});

// POST /api/auth/login-code - Conectar outro celular via Código da Família de 6 dígitos
app.post('/api/auth/login-code', (req, res) => {
  try {
    const { code, caregiverName } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Informe o código da família de 6 dígitos.' });
    }

    const result = cloudStore.loginWithFamilyCode(code, caregiverName);
    return res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarColor: result.user.avatarColor,
        role: result.user.role,
        currentFamilyId: result.user.familyId,
        createdAt: result.user.createdAt,
        emailVerified: true,
      },
      family: result.family,
      babies: result.babies,
      familyData: result.familyData,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Código da família inválido.' });
  }
});

// POST /api/auth/login - Login unificado com acesso de qualquer aparelho
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Informe e-mail e senha.' });
    }

    const result = cloudStore.loginUser(email, password);
    return res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarColor: result.user.avatarColor,
        role: result.user.role,
        currentFamilyId: result.user.familyId,
        createdAt: result.user.createdAt,
        emailVerified: true,
      },
      family: result.family,
      babies: result.babies,
      familyData: result.familyData,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'E-mail ou senha inválidos.' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mail obrigatório.' });
    }
    cloudStore.resetPassword(email);
    return res.json({
      success: true,
      message: `Instruções de redefinição de senha enviadas para ${email}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/family/:familyId/sync - Buscar dados mais recentes da nuvem (Cloud & Supabase)
app.get('/api/family/:familyId/sync', async (req, res) => {
  try {
    const { familyId } = req.params;
    if (!familyId) return res.status(400).json({ error: 'Family ID obrigatório' });

    let supabaseActive = false;
    let supabaseIssue: SyncIssueCode | null = null;
    // A missing or RLS-hidden row is NOT proof the family's history was deleted.
    // Never overwrite the fallback copy or claim success without a remote row.
    try {
      const supaData = await loadFamilyDataFromSupabase(familyId);
      if (supaData) {
        cloudStore.saveFamilyData(familyId, {
          family: supaData.family,
          babies: supaData.babies,
          data: familySnapshotData(supaData),
        });
        supabaseActive = true;
      } else {
        supabaseIssue = 'not_visible';
      }
    } catch (error) {
      supabaseIssue = classifySupabaseFailure(error);
      // No SQL, identifiers, or credentials are written to the response/log.
      console.warn('Supabase family read was not confirmed:', supabaseIssue);
    }

    const result = cloudStore.getFamilyData(familyId);

    return res.json({
      success: true,
      family: result.family,
      babies: result.babies,
      familyData: result.familyData,
      serverTime: new Date().toISOString(),
      supabaseActive,
      supabaseIssue,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Não foi possível consultar o histórico.' });
  }
});

// POST /api/family/:familyId/sync - Salvar e mesclar alterações na nuvem e no Supabase
app.post('/api/family/:familyId/sync', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { family, babies, data } = req.body;

    if (!familyId) return res.status(400).json({ error: 'Family ID obrigatório' });

    // Keep a durable local copy while Supabase is unavailable.
    const updatedData = cloudStore.saveFamilyData(familyId, { family, babies, data });
    const fullFamilyInfo = cloudStore.getFamilyData(familyId);

    // The persistence adapter re-reads and merges on every CAS conflict. It
    // rejects network/RLS/write errors instead of acknowledging a local save.
    const committed = await persistFamilyDataToSupabase(familyId, {
      familyId,
      family: fullFamilyInfo.family,
      babies: fullFamilyInfo.babies,
      data: updatedData,
    });
    const committedData = familySnapshotData(committed);
    cloudStore.saveFamilyData(familyId, {
      family: committed.family,
      babies: committed.babies,
      data: committedData,
    });

    // Publish only the snapshot confirmed by the database, not an unrelated
    // request that may still be pending in this process's local cache.
    broadcastFamilyUpdate(familyId, {
      type: 'data_updated',
      family: committed.family,
      babies: committed.babies,
      familyData: committedData,
      serverTime: new Date().toISOString(),
    });

    return res.json({
      success: true,
      family: committed.family,
      babies: committed.babies,
      familyData: committedData,
      serverTime: new Date().toISOString(),
      supabaseSynced: true,
    });
  } catch (err: any) {
    const errorCode = classifySupabaseFailure(err);
    console.warn('Supabase family write was not confirmed:', errorCode);
    return res.status(503).json({
      success: false,
      supabaseSynced: false,
      errorCode,
      error: 'Gravação no Supabase não confirmada. Os registros pendentes serão reenviados.',
    });
  }
});

// ============================================================================
// ⚡ SUPABASE INTEGRATION ROUTES
// ============================================================================

// GET /api/supabase/status - Test connection and status with Supabase
app.get('/api/supabase/status', async (req, res) => {
  try {
    const health = await testSupabaseHealth();
    return res.json(health);
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      projectUrl: SUPABASE_CONFIG.url,
      message: 'Falha ao consultar a configuração do banco.',
      testedAt: new Date().toISOString(),
    });
  }
});

// POST /api/supabase/sync/:familyId - Force manual push of family data to Supabase
app.post('/api/supabase/sync/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    if (!familyId) return res.status(400).json({ error: 'Family ID obrigatório' });

    const localData = cloudStore.getFamilyData(familyId);
    const success = await syncFamilyDataToSupabase(familyId, {
      family: localData.family,
      babies: localData.babies,
      familyData: localData.familyData,
      manualSync: true,
      syncedAt: new Date().toISOString(),
    });

    return res.status(success ? 200 : 503).json({
      success,
      projectUrl: SUPABASE_CONFIG.url,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Do not allow public HTTP requests to mutate the database destination or
// API credentials. This was an unauthenticated runtime-configuration endpoint.
app.post('/api/supabase/config', (_req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Configure o Supabase pelas variáveis de ambiente do servidor, não pela API pública.',
  });
});

// Do not offer a permissive RLS policy to users as a quick SQL fix.
app.get('/api/supabase/schema', (_req, res) => {
  return res.status(410).json({
    error: 'O assistente SQL público foi desativado para proteger os dados das famílias.',
  });
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    multiDeviceCloudSync: 'requires-database-confirmation',
    supabase: {
      url: SUPABASE_CONFIG.url,
      configured: Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey),
    },
  });
});

// Start Express and integrate Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    const address = server.address();
    const port = address && typeof address !== 'string' ? address.port : PORT;
    console.log(`MilkFlow Baby server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
