import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Plus,
  Trash2,
  Play,
  Copy,
  Check,
  Download,
  Code2,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface MockApiStudioProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface MockRoute {
  id: string;
  enabled: boolean;
  method: HttpMethod;
  path: string;
  status: number;
  delayMs: number;
  headersJson: string;
  bodyJson: string;
  description: string;
}

interface SimulatedResponse {
  status: number;
  elapsedMs: number;
  matchedRoute: string;
  headers: Record<string, string>;
  body: string;
  ok: boolean;
}

interface AccessLogEntry {
  id: string;
  time: string;
  method: HttpMethod;
  path: string;
  status: number;
  elapsedMs: number;
}

const DEFAULT_ROUTES: MockRoute[] = [
  {
    id: 'route-users-list',
    enabled: true,
    method: 'GET',
    path: '/api/users',
    status: 200,
    delayMs: 180,
    headersJson: '{\n  "Content-Type": "application/json",\n  "X-Mock-Server": "DevForge"\n}',
    bodyJson: JSON.stringify(
      {
        data: [
          { id: '1', name: 'Nattapong Dev', role: 'admin', active: true },
          { id: '2', name: 'Suda QA', role: 'engineer', active: true },
        ],
        total: 2,
      },
      null,
      2
    ),
    description: 'List active team members',
  },
  {
    id: 'route-user-detail',
    enabled: true,
    method: 'GET',
    path: '/api/users/:id',
    status: 200,
    delayMs: 120,
    headersJson: '{\n  "Content-Type": "application/json"\n}',
    bodyJson: JSON.stringify(
      {
        id: '{{params.id}}',
        name: 'Developer #{{params.id}}',
        verified: true,
        fetchedAt: '{{timestamp}}',
      },
      null,
      2
    ),
    description: 'Get single user with dynamic :id parameter',
  },
  {
    id: 'route-auth-login',
    enabled: true,
    method: 'POST',
    path: '/api/auth/login',
    status: 200,
    delayMs: 350,
    headersJson: '{\n  "Content-Type": "application/json"\n}',
    bodyJson: JSON.stringify(
      {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.payload',
        requestId: '{{uuid}}',
        expiresIn: 3600,
      },
      null,
      2
    ),
    description: 'Simulate auth token login',
  },
  {
    id: 'route-rate-limit',
    enabled: true,
    method: 'POST',
    path: '/api/orders',
    status: 429,
    delayMs: 80,
    headersJson: '{\n  "Content-Type": "application/json",\n  "Retry-After": "30"\n}',
    bodyJson: JSON.stringify(
      {
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: 30,
      },
      null,
      2
    ),
    description: 'Simulate 429 error handling in frontend',
  },
];

const STORAGE_KEY = 'devforge_mock_api_routes_v1';

function matchRoutePattern(
  pattern: string,
  actualPath: string
): { matched: boolean; params: Record<string, string> } {
  const cleanPattern = pattern.split('?')[0].replace(/\/+$/, '') || '/';
  const cleanPath = actualPath.split('?')[0].replace(/\/+$/, '') || '/';

  const pSegs = cleanPattern.split('/');
  const aSegs = cleanPath.split('/');
  if (pSegs.length !== aSegs.length) return { matched: false, params: {} };

  const params: Record<string, string> = {};
  for (let i = 0; i < pSegs.length; i++) {
    if (pSegs[i].startsWith(':')) {
      params[pSegs[i].slice(1)] = decodeURIComponent(aSegs[i]);
    } else if (pSegs[i] !== aSegs[i]) {
      return { matched: false, params: {} };
    }
  }
  return { matched: true, params };
}

function interpolateTemplate(raw: string, params: Record<string, string>): string {
  let out = raw;
  Object.entries(params).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\{\\{params\\.${k}\\}\\}`, 'g'), v);
  });
  out = out.replace(/\{\{timestamp\}\}/g, new Date().toISOString());
  out = out.replace(/\{\{uuid\}\}/g, crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  return out;
}

export const MockApiStudio: React.FC<MockApiStudioProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<'designer' | 'export'>('designer');
  const [routes, setRoutes] = useState<MockRoute[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ROUTES;
    } catch {
      return DEFAULT_ROUTES;
    }
  });

  const [selectedId, setSelectedId] = useState<string>(routes[0]?.id || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<'node' | 'msw'>('node');
  const [exportPort, setExportPort] = useState(4000);

  // Simulator state
  const [testMethod, setTestMethod] = useState<HttpMethod>('GET');
  const [testPath, setTestPath] = useState('/api/users/42');
  const [testReqBody, setTestReqBody] = useState('{\n  "email": "dev@example.com"\n}');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResponse, setSimResponse] = useState<SimulatedResponse | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch { /* ignore */ }
  }, [routes]);

  const activeRoute = routes.find((r) => r.id === selectedId) || routes[0] || null;

  const jsonValidation = useMemo(() => {
    if (!activeRoute) return { validBody: true, validHeaders: true, bodyErr: '', headerErr: '' };
    let validBody = true;
    let bodyErr = '';
    try {
      JSON.parse(activeRoute.bodyJson);
    } catch (e) {
      validBody = false;
      bodyErr = e instanceof Error ? e.message : 'Invalid JSON';
    }

    let validHeaders = true;
    let headerErr = '';
    try {
      JSON.parse(activeRoute.headersJson);
    } catch (e) {
      validHeaders = false;
      headerErr = e instanceof Error ? e.message : 'Invalid JSON';
    }
    return { validBody, validHeaders, bodyErr, headerErr };
  }, [activeRoute]);

  const updateRoute = (id: string, patch: Partial<MockRoute>) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleAddRoute = () => {
    const newRoute: MockRoute = {
      id: `route-${Date.now()}`,
      enabled: true,
      method: 'GET',
      path: '/api/items',
      status: 200,
      delayMs: 100,
      headersJson: '{\n  "Content-Type": "application/json"\n}',
      bodyJson: JSON.stringify({ ok: true, items: [] }, null, 2),
      description: 'New mock endpoint',
    };
    setRoutes((prev) => [...prev, newRoute]);
    setSelectedId(newRoute.id);
    setTestMethod('GET');
    setTestPath('/api/items');
    onNotify('Added new mock endpoint');
  };

  const handleDeleteRoute = (id: string) => {
    const remaining = routes.filter((r) => r.id !== id);
    setRoutes(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id || '');
    }
    onNotify('Deleted mock route', 'info');
  };

  const handleFormatJson = () => {
    if (!activeRoute) return;
    try {
      const formattedBody = JSON.stringify(JSON.parse(activeRoute.bodyJson), null, 2);
      const formattedHeaders = JSON.stringify(JSON.parse(activeRoute.headersJson), null, 2);
      updateRoute(activeRoute.id, { bodyJson: formattedBody, headersJson: formattedHeaders });
      onNotify('Formatted JSON response & headers');
    } catch {
      onNotify('Fix JSON syntax errors before formatting', 'error');
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    const start = performance.now();

    if (['POST', 'PUT', 'PATCH'].includes(testMethod) && testReqBody.trim()) {
      try {
        JSON.parse(testReqBody);
      } catch {
        setIsSimulating(false);
        onNotify('Request body is not valid JSON', 'error');
        return;
      }
    }

    let found: { route: MockRoute; params: Record<string, string> } | null = null;
    for (const r of routes) {
      if (!r.enabled || r.method !== testMethod) continue;
      const m = matchRoutePattern(r.path, testPath);
      if (m.matched) {
        found = { route: r, params: m.params };
        break;
      }
    }

    const delay = found ? Math.max(0, found.route.delayMs) : 20;
    await new Promise((resolve) => setTimeout(resolve, delay));
    const elapsedMs = Math.round(performance.now() - start);

    if (!found) {
      const res: SimulatedResponse = {
        status: 404,
        elapsedMs,
        matchedRoute: 'No matching route',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          { error: 'Not Found', message: `No enabled ${testMethod} mock route matches ${testPath}` },
          null,
          2
        ),
        ok: false,
      };
      setSimResponse(res);
      setAccessLogs((prev) => [
        { id: Math.random().toString(36).slice(2), time: new Date().toLocaleTimeString(), method: testMethod, path: testPath, status: 404, elapsedMs },
        ...prev.slice(0, 19),
      ]);
      setIsSimulating(false);
      return;
    }

    let parsedHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      parsedHeaders = JSON.parse(found.route.headersJson);
    } catch { /* fallback */ }

    const resolvedBody = interpolateTemplate(found.route.bodyJson, found.params);
    const res: SimulatedResponse = {
      status: found.route.status,
      elapsedMs,
      matchedRoute: `${found.route.method} ${found.route.path}`,
      headers: parsedHeaders,
      body: resolvedBody,
      ok: found.route.status >= 200 && found.route.status < 400,
    };

    setSimResponse(res);
    setAccessLogs((prev) => [
      {
        id: Math.random().toString(36).slice(2),
        time: new Date().toLocaleTimeString(),
        method: testMethod,
        path: testPath,
        status: found.route.status,
        elapsedMs,
      },
      ...prev.slice(0, 19),
    ]);
    setIsSimulating(false);
  };

  const generatedNodeServer = useMemo(() => {
    const enabled = routes.filter((r) => r.enabled);
    const serialized = JSON.stringify(
      enabled.map((r) => {
        let headers = { 'Content-Type': 'application/json' };
        try {
          headers = JSON.parse(r.headersJson);
        } catch { /* ignore */ }
        return {
          method: r.method,
          path: r.path,
          status: r.status,
          delayMs: r.delayMs,
          headers,
          body: r.bodyJson,
        };
      }),
      null,
      2
    );

    return `// Zero-dependency Mock API Server (Node.js 18+ / Termux ready)
// Run with: node mock-server.mjs
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = process.env.PORT || ${exportPort};
const ROUTES = ${serialized};

function matchRoute(pattern, actualPath) {
  const pSegs = (pattern.split('?')[0].replace(/\\/+$/, '') || '/').split('/');
  const aSegs = (actualPath.split('?')[0].replace(/\\/+$/, '') || '/').split('/');
  if (pSegs.length !== aSegs.length) return null;
  const params = {};
  for (let i = 0; i < pSegs.length; i++) {
    if (pSegs[i].startsWith(':')) params[pSegs[i].slice(1)] = decodeURIComponent(aSegs[i]);
    else if (pSegs[i] !== aSegs[i]) return null;
  }
  return params;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const reqPath = (req.url || '/').split('?')[0];
  let matched = null;
  let params = {};

  for (const route of ROUTES) {
    if (route.method !== req.method) continue;
    const m = matchRoute(route.path, reqPath);
    if (m) {
      matched = route;
      params = m;
      break;
    }
  }

  if (!matched) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not Found', path: reqPath }));
  }

  if (matched.delayMs > 0) {
    await new Promise((r) => setTimeout(r, matched.delayMs));
  }

  let body = matched.body;
  for (const [k, v] of Object.entries(params)) {
    body = body.replaceAll(\`{{params.\${k}}}\`, v);
  }
  body = body.replaceAll('{{timestamp}}', new Date().toISOString());
  body = body.replaceAll('{{uuid}}', crypto.randomUUID());

  res.writeHead(matched.status, matched.headers);
  res.end(body);
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${reqPath} -> \${matched.status}\`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(\`Mock API Server listening on http://localhost:\${PORT}\`);
});`;
  }, [routes, exportPort]);

  const generatedMswHandlers = useMemo(() => {
    const enabled = routes.filter((r) => r.enabled);
    const handlerBlocks = enabled.map((r) => {
      const mswMethod = r.method.toLowerCase();
      let safeBody = r.bodyJson;
      try {
        safeBody = JSON.stringify(JSON.parse(r.bodyJson), null, 4);
      } catch { /* raw */ }
      return `  http.${mswMethod}('${r.path}', async ({ params }) => {
    ${r.delayMs > 0 ? `await delay(${r.delayMs});` : ''}
    return HttpResponse.json(${safeBody}, { status: ${r.status} });
  }),`;
    });

    return `// MSW v2 Handlers (src/mocks/handlers.ts)
import { http, HttpResponse, delay } from 'msw';
import { copyToClipboard } from '../../utils/clipboard';

export const handlers = [
${handlerBlocks.join('\n')}
];`;
  }, [routes]);

  const handleCopy = (text: string, id: string, label: string) => {
    void copyToClipboard(text);
    setCopiedId(id);
    onNotify(`Copied ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadNodeServer = () => {
    const blob = new Blob([generatedNodeServer], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mock-server.mjs';
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Downloaded mock-server.mjs');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Mock API Server
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Define REST JSON endpoints with custom status codes, dynamic :id params, and latency delays. Simulate requests live in-browser or export a standalone Node.js / MSW server.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setSubTab('designer')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'designer' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Routes &amp; Simulator
          </button>
          <button
            onClick={() => setSubTab('export')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'export' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Run Local Server / Export
          </button>
        </div>
      </div>

      {subTab === 'designer' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Routes List & Editor */}
          <div className="xl:col-span-7 space-y-5">
            {/* Route Selector */}
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Defined Endpoints ({routes.filter((r) => r.enabled).length} active / {routes.length} total)
                </span>
                <button
                  onClick={handleAddRoute}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Route</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {routes.map((route) => {
                  const isSelected = activeRoute?.id === route.id;
                  return (
                    <div
                      key={route.id}
                      onClick={() => {
                        setSelectedId(route.id);
                        setTestMethod(route.method);
                        setTestPath(route.path.replace(':id', '42'));
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'bg-amber-950/35 border-amber-500/70'
                          : 'bg-neutral-950/70 border-stone-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={route.enabled}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateRoute(route.id, { enabled: e.target.checked });
                          }}
                          className="accent-amber-500"
                          title="Enable or disable route"
                        />
                        <span className="font-mono text-xs font-bold text-amber-300 w-14 shrink-0">
                          {route.method}
                        </span>
                        <span className="font-mono text-xs text-slate-100 truncate">
                          {route.path}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono tabular-nums shrink-0">
                        <span
                          className={
                            route.status >= 400 ? 'text-rose-400' : 'text-emerald-400'
                          }
                        >
                          {route.status}
                        </span>
                        <span className="text-slate-500">{route.delayMs}ms</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoute(route.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Delete route"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Route Editor */}
            {activeRoute && (
              <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800">
                  <span className="text-sm font-bold text-slate-100">Endpoint Configuration</span>
                  <button
                    onClick={handleFormatJson}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                  >
                    Format JSON
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-slate-400 font-semibold block">Method</label>
                    <select
                      value={activeRoute.method}
                      onChange={(e) => updateRoute(activeRoute.id, { method: e.target.value as HttpMethod })}
                      className="w-full px-2.5 py-2 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-slate-100"
                    >
                      {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-slate-400 font-semibold block">Path (supports :params)</label>
                    <input
                      type="text"
                      value={activeRoute.path}
                      onChange={(e) => updateRoute(activeRoute.id, { path: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-400 font-semibold block">Status</label>
                    <input
                      type="number"
                      min={100}
                      max={599}
                      value={activeRoute.status}
                      onChange={(e) =>
                        updateRoute(activeRoute.id, { status: Number(e.target.value) || 200 })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-neutral-950 border border-stone-800 font-mono tabular-nums text-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-400 font-semibold block">Delay (ms)</label>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={50}
                      value={activeRoute.delayMs}
                      onChange={(e) =>
                        updateRoute(activeRoute.id, { delayMs: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-neutral-950 border border-stone-800 font-mono tabular-nums text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-400 font-semibold">
                      Response Body JSON (supports {'{{params.id}}'}, {'{{timestamp}}'}, {'{{uuid}}'})
                    </label>
                    {!jsonValidation.validBody ? (
                      <span className="text-rose-400 font-mono">{jsonValidation.bodyErr}</span>
                    ) : (
                      <span className="text-emerald-400 font-mono">Valid JSON</span>
                    )}
                  </div>
                  <textarea
                    value={activeRoute.bodyJson}
                    onChange={(e) => updateRoute(activeRoute.id, { bodyJson: e.target.value })}
                    rows={8}
                    spellCheck={false}
                    className="w-full p-3 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-amber-200 leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-400 font-semibold">Response Headers (JSON)</label>
                    {!jsonValidation.validHeaders && (
                      <span className="text-rose-400 font-mono">{jsonValidation.headerErr}</span>
                    )}
                  </div>
                  <textarea
                    value={activeRoute.headersJson}
                    onChange={(e) => updateRoute(activeRoute.id, { headersJson: e.target.value })}
                    rows={3}
                    spellCheck={false}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-slate-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Simulator & Access Logs */}
          <div className="xl:col-span-5 space-y-5">
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-100">Request Simulator</span>
                <span className="text-xs text-slate-400">Matches enabled routes</span>
              </div>

              <div className="flex gap-2">
                <select
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value as HttpMethod)}
                  className="px-2.5 py-2 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs font-bold text-amber-300"
                >
                  {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={testPath}
                  onChange={(e) => setTestPath(e.target.value)}
                  placeholder="/api/users/42"
                  className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-slate-100"
                />
                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-xs font-semibold transition-colors shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Sending...' : 'Send'}</span>
                </button>
              </div>

              {['POST', 'PUT', 'PATCH'].includes(testMethod) && (
                <div className="space-y-1 text-xs">
                  <label className="text-slate-400 font-semibold block">Request Body (JSON)</label>
                  <textarea
                    value={testReqBody}
                    onChange={(e) => setTestReqBody(e.target.value)}
                    rows={3}
                    spellCheck={false}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-slate-200"
                  />
                </div>
              )}

              {simResponse && (
                <div className="space-y-3 pt-2 border-t border-stone-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <div className="flex items-center gap-2">
                      {simResponse.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className={simResponse.ok ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                        HTTP {simResponse.status}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400">{simResponse.elapsedMs}ms</span>
                    </div>
                    <span className="text-slate-500 truncate">{simResponse.matchedRoute}</span>
                  </div>

                  <pre className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-emerald-200 overflow-x-auto max-h-64 leading-relaxed">
                    <code>{simResponse.body}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Access Log */}
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Server Access Log ({accessLogs.length})</span>
                </div>
                {accessLogs.length > 0 && (
                  <button
                    onClick={() => setAccessLogs([])}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto font-mono text-xs">
                {accessLogs.length === 0 ? (
                  <div className="text-slate-500 py-3 text-center">
                    Send a simulated request above to inspect live logs.
                  </div>
                ) : (
                  accessLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-neutral-950 border border-stone-800 tabular-nums"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-500 shrink-0">{log.time}</span>
                        <span className="text-amber-300 font-bold shrink-0">{log.method}</span>
                        <span className="text-slate-200 truncate">{log.path}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={log.status >= 400 ? 'text-rose-400' : 'text-emerald-400'}>
                          {log.status}
                        </span>
                        <span className="text-slate-500">{log.elapsedMs}ms</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'export' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-stone-800">
                <button
                  onClick={() => setExportTarget('node')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    exportTarget === 'node' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Standalone Node.js Server (.mjs)
                </button>
                <button
                  onClick={() => setExportTarget('msw')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    exportTarget === 'msw' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MSW v2 Handlers (.ts)
                </button>
              </div>

              {exportTarget === 'node' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-semibold">Port:</span>
                  <input
                    type="number"
                    value={exportPort}
                    onChange={(e) => setExportPort(Number(e.target.value) || 4000)}
                    className="w-24 px-2.5 py-1 rounded-lg bg-neutral-950 border border-stone-800 font-mono tabular-nums text-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleCopy(
                    exportTarget === 'node' ? generatedNodeServer : generatedMswHandlers,
                    'export-server',
                    exportTarget === 'node' ? 'Node.js mock server' : 'MSW handlers'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                {copiedId === 'export-server' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Code</span>
              </button>
              {exportTarget === 'node' && (
                <button
                  onClick={handleDownloadNodeServer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download mock-server.mjs</span>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Code2 className="w-4 h-4 text-amber-400" />
              {exportTarget === 'node' ? (
                <span>
                  Run in Termux or local terminal with zero npm installs: <code className="font-mono text-amber-300">node mock-server.mjs</code>
                </span>
              ) : (
                <span>
                  Save as <code className="font-mono text-amber-300">src/mocks/handlers.ts</code> for Vitest/Playwright API mocking
                </span>
              )}
            </div>
            <pre className="p-4 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-200 overflow-x-auto leading-relaxed max-h-[480px]">
              <code>{exportTarget === 'node' ? generatedNodeServer : generatedMswHandlers}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
