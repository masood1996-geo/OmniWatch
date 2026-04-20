import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { runSweep, getLastSweep, getPreviousEvents } from './pipeline/sweep';

let currentIntel: OmniEvent[] = [];
let sweepInProgress = false;
let initialSweepDone = false;
let sseClients: express.Response[] = [];

// === Mutex-protected sweep to prevent races ===
async function performSweep(): Promise<void> {
    if (sweepInProgress) {
        console.log('[Sweep] Sweep already in progress, skipping duplicate.');
        return;
    }
    sweepInProgress = true;
    try {
        currentIntel = await runSweep();
        initialSweepDone = true;
        broadcastSSE({
            type: 'sweep_complete',
            count: currentIntel.length,
            timestamp: new Date().toISOString()
        });
    } finally {
        sweepInProgress = false;
    }
}

// Wait for initial sweep to complete before serving data
async function waitForInitialSweep(): Promise<void> {
    if (initialSweepDone) return;
    // Wait up to 60s for the initial sweep
    for (let i = 0; i < 120; i++) {
        if (initialSweepDone) return;
        await new Promise(r => setTimeout(r, 500));
    }
}

// === SSE: Server-Sent Events for real-time push ===
app.get('/api/stream', (req: express.Request, res: express.Response) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.push(res);
    req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
    });
    // Keep alive ping every 15s
    const keepAlive = setInterval(() => {
        try { res.write(':ping\n\n'); } catch { clearInterval(keepAlive); }
    }, 15000);
    req.on('close', () => clearInterval(keepAlive));
});

function broadcastSSE(data: any) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => {
        try { client.write(payload); } catch {}
    });
}

// === Sweep cycle (15 min) ===
setInterval(performSweep, 15 * 60 * 1000);

// === GET /api/events ===
app.get('/api/events', async (req: express.Request, res: express.Response) => {
    // Wait for initial sweep — don't trigger a competing one
    await waitForInitialSweep();

    let filtered = [...currentIntel];
    const { source, severity, timeRange, eventType } = req.query;

    if (source && typeof source === 'string') {
        filtered = filtered.filter(e => e.source === source);
    }
    if (severity && typeof severity === 'string') {
        filtered = filtered.filter(e => e.severity === severity);
    }
    if (eventType && typeof eventType === 'string') {
        filtered = filtered.filter(e => e.eventType === eventType);
    }
    if (timeRange && typeof timeRange === 'string') {
        const now = Date.now();
        const ranges: Record<string, number> = { hour: 3600000, day: 86400000, week: 604800000 };
        const ms = ranges[timeRange];
        if (ms) {
            filtered = filtered.filter(e => now - new Date(e.timestamp).getTime() < ms);
        }
    }

    const sweep = getLastSweep();
    res.json({
        success: true,
        count: filtered.length,
        totalCount: currentIntel.length,
        timestamp: sweep?.timestamp || new Date().toISOString(),
        sources: sweep?.sources || {},
        sweepDurationMs: sweep?.sweepDurationMs || 0,
        events: filtered
    });
});

// === GET /api/health ===
app.get('/api/health', async (req: express.Request, res: express.Response) => {
    const sweep = getLastSweep();
    res.json({
        status: 'operational',
        uptime: process.uptime(),
        lastSweep: sweep?.timestamp || null,
        sweepDurationMs: sweep?.sweepDurationMs || 0,
        totalSignals: currentIntel.length,
        sources: sweep?.sources || {},
        sseClients: sseClients.length,
        memory: process.memoryUsage()
    });
});

// === GET /api/delta ===
app.get('/api/delta', async (req: express.Request, res: express.Response) => {
    const previous = getPreviousEvents();
    const prevIds = new Set(previous.map(e => e.id));
    const currIds = new Set(currentIntel.map(e => e.id));

    const newEvents = currentIntel.filter(e => !prevIds.has(e.id));
    const removedEvents = previous.filter(e => !currIds.has(e.id));
    const escalated = currentIntel.filter(e => {
        const prev = previous.find(p => p.id === e.id);
        if (!prev) return false;
        const severityOrder: Record<string, number> = { minor: 0, moderate: 1, major: 2, critical: 3 };
        return (severityOrder[e.severity] || 0) > (severityOrder[prev.severity] || 0);
    });

    res.json({
        timestamp: new Date().toISOString(),
        delta: {
            new: newEvents.length,
            removed: removedEvents.length,
            escalated: escalated.length,
            newEvents: newEvents.slice(0, 20),
            removedEvents: removedEvents.slice(0, 20),
            escalatedEvents: escalated.slice(0, 10)
        }
    });
});

// === POST /api/chat ===
app.post('/api/chat', async (req: express.Request, res: express.Response) => {
    const query = req.body.query || '';
    const key = process.env.OLLAMA_API_KEY || '';
    const host = process.env.OLLAMA_HOST || 'https://ollama.com';

    try {
        const criticals = currentIntel.filter(e => e.severity === 'critical' || e.severity === 'major').slice(0, 50);

        const ollama = new Ollama({
          host: host,
          headers: { 'Authorization': `Bearer ${key}` }
        });

        const response = await ollama.chat({
            model: process.env.OLLAMA_MODEL || 'gemma3:27b',
            messages: [
               { role: 'system', content: `You are J.A.R.V.I.S, the OmniWatch GeoScience & OSINT AI assistant. You have access to real-time intelligence from ${currentIntel.length} signals across 30 data sources including USGS earthquakes, NASA fires, NOAA weather, military aircraft, GDELT conflicts, satellite tracking, maritime vessels, radiation monitoring, volcanic activity, air quality, space weather, financial markets, Ukraine frontline, carrier groups, rail networks, SatNOGS, prediction markets, and internet outages. Current critical/major intel:\n${JSON.stringify(criticals.slice(0, 30))}` },
               { role: 'user', content: query }
            ]
        });

        res.json({ reply: response.message.content || '[No response]' });
    } catch(err: any) {
        console.error('[Ollama Error]', err.message);
        const criticals = currentIntel.filter(e => e.severity === 'critical');
        const majors = currentIntel.filter(e => e.severity === 'major');
        const fallbackReport = `[OFFLINE MODE] LLM unavailable. Rule-based summary:\n\n` +
            `• ${currentIntel.length} total signals tracked across 30 sources\n` +
            `• ${criticals.length} CRITICAL alerts\n` +
            `• ${majors.length} MAJOR alerts\n` +
            `• Top threats: ${criticals.slice(0, 3).map(e => e.title).join('; ') || 'None'}\n\n` +
            `Error: ${err.message || 'Network timeout'}`;
        res.json({ reply: fallbackReport });
    }
});

// === POST /api/sweep ===
app.post('/api/sweep', async (req: express.Request, res: express.Response) => {
    try {
        await performSweep();
        res.json({
            success: true,
            count: currentIntel.length,
            timestamp: new Date().toISOString()
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// === GET /api/live-tracking — fast-poll aircraft + vessel positions ===
app.get('/api/live-tracking', async (req: express.Request, res: express.Response) => {
    try {
        const tracks = await refreshLiveTracks();
        res.json({
            success: true,
            count: tracks.length,
            aircraft: tracks.filter(t => t.type === 'aircraft').length,
            vessels: tracks.filter(t => t.type === 'vessel').length,
            timestamp: new Date().toISOString(),
            tracks
        });
    } catch (err: any) {
        res.json({ success: false, count: 0, tracks: [], error: err.message });
    }
});

const PORT = process.env.PORT || 4100;

// HuggingFace Spaces / Production mode
const clientBuildPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../../client/out')
    : path.join(__dirname, '../../omniwatch-client/out');

app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[OmniWatch Server] Running on http://localhost:${PORT}`);
    console.log(`[OmniWatch Server] Endpoints: /api/events, /api/health, /api/delta, /api/stream, /api/chat, /api/sweep, /api/live-tracking`);
    // Start initial sweep (non-blocking)
    performSweep();
    // Start live aircraft/vessel tracking (15s refresh)
    startLiveTracking();
});
