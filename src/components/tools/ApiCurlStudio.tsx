import React, { useState } from 'react';
import { Play, Copy, Check, Sparkles, Terminal, Code, ArrowRight, CornerDownRight, RotateCcw } from 'lucide-react';
import { parseCurl, generateFetchCode, generateAxiosCode, generatePythonRequestsCode, generateGoCode, formatAsCurl, ParsedRequest, MOCK_TEMPLATES } from '../../utils/curlParser';
import { copyToClipboard } from '../../utils/clipboard';

interface ApiCurlStudioProps {
  onNotify: (msg: string) => void;
}

type CodeTarget = 'fetch' | 'axios' | 'python' | 'go' | 'curl';

export const ApiCurlStudio: React.FC<ApiCurlStudioProps> = ({ onNotify }) => {
  const [curlInput, setCurlInput] = useState<string>(
    `curl -X POST "https://jsonplaceholder.typicode.com/posts" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer dev_sample_token_2026" \\\n  -d '{"title": "DevForge Studio Release", "body": "God-tier developer tools suite", "userId": 1}'`
  );

  const [activeCodeTarget, setActiveCodeTarget] = useState<CodeTarget>('fetch');
  const [copied, setCopied] = useState(false);

  // Live HTTP sandbox states
  const [httpMethod, setHttpMethod] = useState('POST');
  const [httpUrl, setHttpUrl] = useState('https://jsonplaceholder.typicode.com/posts');
  const [headersList, setHeadersList] = useState<{ key: string; value: string }[]>([
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Accept', value: 'application/json' },
  ]);
  const [requestBody, setRequestBody] = useState('{\n  "title": "DevForge Studio Release",\n  "body": "God-tier developer tools suite",\n  "userId": 1\n}');

  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseData, setResponseData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  // Parse cURL
  let parsedReq: ParsedRequest;
  try {
    parsedReq = parseCurl(curlInput);
  } catch {
    parsedReq = {
      method: 'GET',
      url: 'https://api.example.com',
      headers: {},
      body: '',
      queryParams: {},
    };
  }

  // Sync cURL to HTTP Sandbox
  const handleSyncToSandbox = () => {
    setHttpMethod(parsedReq.method);
    setHttpUrl(parsedReq.url);
    const newHeaders = Object.entries(parsedReq.headers).map(([key, value]) => ({ key, value }));
    if (newHeaders.length === 0) {
      newHeaders.push({ key: 'Content-Type', value: 'application/json' });
    }
    setHeadersList(newHeaders);
    setRequestBody(parsedReq.body || '');
    onNotify('Loaded cURL configuration into live HTTP sandbox');
  };

  const getGeneratedCode = (): string => {
    switch (activeCodeTarget) {
      case 'fetch':
        return generateFetchCode(parsedReq);
      case 'axios':
        return generateAxiosCode(parsedReq);
      case 'python':
        return generatePythonRequestsCode(parsedReq);
      case 'go':
        return generateGoCode(parsedReq);
      case 'curl':
        return formatAsCurl(parsedReq);
    }
  };

  const handleCopyCode = () => {
    void copyToClipboard(getGeneratedCode());
    setCopied(true);
    onNotify('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Add header row
  const addHeaderRow = () => {
    setHeadersList([...headersList, { key: '', value: '' }]);
  };

  const removeHeaderRow = (idx: number) => {
    setHeadersList(headersList.filter((_, i) => i !== idx));
  };

  const updateHeaderRow = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...headersList];
    updated[idx][field] = val;
    setHeadersList(updated);
  };

  // Execute live HTTP request
  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseError(null);
    setResponseData(null);
    setResponseStatus(null);
    setResponseLatency(null);

    const startTime = performance.now();
    try {
      const headersObj: Record<string, string> = {};
      headersList.forEach((h) => {
        if (h.key.trim()) {
          headersObj[h.key.trim()] = h.value;
        }
      });

      const options: RequestInit = {
        method: httpMethod,
        headers: headersObj,
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod) && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(httpUrl, options);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      setResponseStatus(res.status);
      setResponseLatency(latency);

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });
      setResponseHeaders(resHeaders);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        setResponseData(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setResponseData(text);
      }
      onNotify(`HTTP ${res.status} response received in ${latency}ms`);
    } catch (err) {
      const endTime = performance.now();
      setResponseLatency(Math.round(endTime - startTime));
      setResponseError((err as Error).message || 'Network request failed (possibly blocked by CORS or offline)');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockTemplate = (templateKey: keyof typeof MOCK_TEMPLATES) => {
    const data = MOCK_TEMPLATES[templateKey];
    setRequestBody(JSON.stringify(data, null, 2));
    onNotify(`Loaded ${templateKey} mock template`);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">API & cURL Workbench</h2>
          <p className="text-sm text-slate-400 mt-1">
            Convert cURL commands across modern runtimes and test live HTTP endpoints with millisecond telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncToSandbox}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-neutral-900 border border-stone-800 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-amber-400" />
            <span>Send cURL to Live Sandbox</span>
          </button>
        </div>
      </div>

      {/* Grid: cURL input & Multi-language Code Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Raw cURL input */}
        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-neutral-950/40">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">cURL Command</span>
            </div>
            <button
              onClick={() => {
                setCurlInput(`curl "https://httpbin.org/get" -H "Accept: application/json"`);
                onNotify('Loaded GET test example');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Reset Example
            </button>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <textarea
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder="Paste raw curl command here..."
              rows={8}
              className="w-full flex-1 bg-neutral-950 p-3 rounded-lg border border-stone-800 font-mono text-xs text-slate-200 leading-relaxed resize-none focus:outline-none focus:border-amber-500/60"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Method:</span>
                <span className="font-mono font-semibold text-amber-300">{parsedReq.method}</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="text-slate-500">Headers:</span>
                <span className="font-mono text-slate-300">{Object.keys(parsedReq.headers).length}</span>
              </div>
              <span className="text-slate-500 truncate max-w-xs">{parsedReq.url}</span>
            </div>
          </div>
        </div>

        {/* Right: Generated Code */}
        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40">
            <div className="flex items-center gap-1">
              {(['fetch', 'axios', 'python', 'go', 'curl'] as CodeTarget[]).map((target) => (
                <button
                  key={target}
                  onClick={() => setActiveCodeTarget(target)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeCodeTarget === target
                      ? 'bg-amber-500 text-neutral-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {target === 'fetch'
                    ? 'Fetch'
                    : target === 'axios'
                    ? 'Axios'
                    : target === 'python'
                    ? 'Python'
                    : target === 'go'
                    ? 'Go'
                    : 'Beautified cURL'}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col bg-neutral-950">
            <pre className="flex-1 overflow-x-auto text-xs font-mono text-amber-200 leading-relaxed p-1">
              <code>{getGeneratedCode()}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Live HTTP Sandbox */}
      <div className="rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-neutral-950/30">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Live Client HTTP Sandbox</h3>
            <span className="text-xs text-slate-500">· Test directly inside your browser</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Insert Mock:</span>
            <button
              onClick={() => loadMockTemplate('usersList')}
              className="px-2 py-1 text-[11px] font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Users
            </button>
            <button
              onClick={() => loadMockTemplate('ecommerceOrder')}
              className="px-2 py-1 text-[11px] font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Order
            </button>
            <button
              onClick={() => loadMockTemplate('paginatedResponse')}
              className="px-2 py-1 text-[11px] font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Paginated
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Method + URL + Send */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={httpMethod}
              onChange={(e) => setHttpMethod(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input
              type="text"
              value={httpUrl}
              onChange={(e) => setHttpUrl(e.target.value)}
              placeholder="https://api.example.com/v1/..."
              className="flex-1 px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />

            <button
              onClick={handleSendRequest}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Send Request</span>
                </>
              )}
            </button>
          </div>

          {/* Request Headers & Body split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Headers Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Request Headers</span>
                <button onClick={addHeaderRow} className="text-amber-400 hover:text-amber-300">
                  + Add Header
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {headersList.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Header Key"
                      value={h.key}
                      onChange={(e) => updateHeaderRow(i, 'key', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 bg-neutral-950 border border-stone-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Header Value"
                      value={h.value}
                      onChange={(e) => updateHeaderRow(i, 'value', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 bg-neutral-950 border border-stone-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => removeHeaderRow(i)}
                      className="px-2 text-slate-500 hover:text-rose-400 text-xs"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Request Body (JSON / Raw)</span>
                {['GET', 'HEAD'].includes(httpMethod) && (
                  <span className="text-[11px] text-amber-400">Body not typically used with {httpMethod}</span>
                )}
              </div>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder="Request body contents..."
                rows={5}
                className="w-full bg-neutral-950 p-2.5 rounded-lg border border-stone-800 font-mono text-xs text-slate-200 resize-none focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Response Telemetry and Data */}
          {(responseStatus !== null || responseError !== null || isLoading) && (
            <div className="pt-4 border-t border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300">Response</span>
                  {responseStatus !== null && (
                    <span
                      className={`text-xs font-mono font-bold ${
                        responseStatus >= 200 && responseStatus < 300
                          ? 'text-emerald-400'
                          : responseStatus >= 400
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      Status: {responseStatus}
                    </span>
                  )}
                  {responseLatency !== null && (
                    <span className="text-xs font-mono tabular-nums text-slate-400">
                      Latency: {responseLatency}ms
                    </span>
                  )}
                </div>

                {responseData && (
                  <button
                    onClick={() => {
                      void copyToClipboard(responseData);
                      onNotify('Copied response payload');
                    }}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Response</span>
                  </button>
                )}
              </div>

              {responseError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                  {responseError}
                </div>
              )}

              {responseData && (
                <pre className="max-h-72 overflow-y-auto p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-slate-200 leading-relaxed">
                  <code>{responseData}</code>
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
