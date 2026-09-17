import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { cloudStore } from './server/cloudStore';
import {
  testSupabaseHealth,
  syncFamilyDataToSupabase,
  loadFamilyDataFromSupabase,
  getSupabaseSchemaSql,
  updateSupabaseCredentials,
  SUPABASE_CONFIG,
} from './server/supabase';

dotenv.config();

const app = express();
const PORT = 3000;

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

    // Always attempt to hydrate from Supabase database to ensure cross-device consistency
    try {
      const supaData = await loadFamilyDataFromSupabase(familyId);
      if (supaData) {
        cloudStore.saveFamilyData(familyId, {
          family: supaData.family,
          babies: supaData.babies,
          data: supaData.data || supaData,
        });
      }
    } catch (e) {
      console.warn('Supabase fetch notice on GET sync:', e);
    }

    const result = cloudStore.getFamilyData(familyId);

    return res.json({
      success: true,
      family: result.family,
      babies: result.babies,
      familyData: result.familyData,
      serverTime: new Date().toISOString(),
      supabaseActive: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/family/:familyId/sync - Salvar e mesclar alterações na nuvem e no Supabase
app.post('/api/family/:familyId/sync', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { family, babies, data } = req.body;

    if (!familyId) return res.status(400).json({ error: 'Family ID obrigatório' });

    // 1. Pull Supabase first to merge any concurrent updates from other devices
    try {
      const supaData = await loadFamilyDataFromSupabase(familyId);
      if (supaData) {
        cloudStore.saveFamilyData(familyId, {
          family: supaData.family,
          babies: supaData.babies,
          data: supaData.data || supaData,
        });
      }
    } catch (e) {
      console.warn('Pre-merge Supabase notice:', e);
    }

    // 2. Merge incoming payload with Last-Write-Wins
    const updatedData = cloudStore.saveFamilyData(familyId, { family, babies, data });
    const fullFamilyInfo = cloudStore.getFamilyData(familyId);

    // 3. Persist authoritative merged state to Supabase
    try {
      await syncFamilyDataToSupabase(familyId, {
        familyId,
        family: fullFamilyInfo.family,
        babies: fullFamilyInfo.babies,
        data: updatedData,
        syncedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Supabase sync warning:', e?.message);
    }

    // 4. Instantly notify all connected devices of this family in real-time
    broadcastFamilyUpdate(familyId, {
      type: 'data_updated',
      family: fullFamilyInfo.family,
      babies: fullFamilyInfo.babies,
      familyData: updatedData,
      serverTime: new Date().toISOString(),
    });

    return res.json({
      success: true,
      family: fullFamilyInfo.family,
      babies: fullFamilyInfo.babies,
      familyData: updatedData,
      serverTime: new Date().toISOString(),
      supabaseSynced: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
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
      message: err.message,
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

    return res.json({
      success,
      projectUrl: SUPABASE_CONFIG.url,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/supabase/config - Update Supabase credentials runtime
app.post('/api/supabase/config', async (req, res) => {
  try {
    const { url, anonKey } = req.body;
    updateSupabaseCredentials(url, anonKey);
    const health = await testSupabaseHealth();
    return res.json({
      success: health.connected,
      health,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/supabase/schema - Get SQL script to create tables in Supabase
app.get('/api/supabase/schema', (req, res) => {
  res.json({
    sql: getSupabaseSchemaSql(),
    projectUrl: SUPABASE_CONFIG.url,
  });
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    multiDeviceCloudSync: true,
    supabase: {
      url: SUPABASE_CONFIG.url,
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MilkFlow Baby server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
