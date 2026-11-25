export interface ParsedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  queryParams: Record<string, string>;
}

export function parseCurl(curlCommand: string): ParsedRequest {
  const clean = curlCommand.replace(/\\\n/g, ' ').replace(/\\\r\n/g, ' ').trim();
  
  // Default values
  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let body = '';

  // Extract URL
  const urlMatch = clean.match(/curl\s+(?:-[A-Za-z]\s+)*(?:'([^']+)'|"([^"]+)"|(\S+))/);
  if (urlMatch) {
    url = urlMatch[1] || urlMatch[2] || urlMatch[3] || '';
  }

  // Extract -X or --request
  const methodMatch = clean.match(/(?:-X|--request)\s+['"]?([A-Z]+)['"]?/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  }

  // Extract headers: -H or --header
  const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = headerRegex.exec(clean)) !== null) {
    const rawHeader = match[1];
    const colonIdx = rawHeader.indexOf(':');
    if (colonIdx > 0) {
      const key = rawHeader.slice(0, colonIdx).trim();
      const val = rawHeader.slice(colonIdx + 1).trim();
      headers[key] = val;
    }
  }

  // Extract body: -d, --data, --data-raw, --data-binary
  const dataMatch = clean.match(/(?:-d|--data|--data-raw|--data-binary)\s+('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\S+)/);
  if (dataMatch) {
    let rawBody = dataMatch[1];
    if ((rawBody.startsWith("'") && rawBody.endsWith("'")) || (rawBody.startsWith('"') && rawBody.endsWith('"'))) {
      rawBody = rawBody.slice(1, -1);
    }
    body = rawBody;
    if (method === 'GET') {
      method = 'POST';
    }
  }

  // Parse query params if URL contains ?
  const queryParams: Record<string, string> = {};
  try {
    if (url.includes('?')) {
      const parsedUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
      parsedUrl.searchParams.forEach((v, k) => {
        queryParams[k] = v;
      });
    }
  } catch {
    // Ignore invalid url format
  }

  return {
    method,
    url: url || 'https://api.example.com/v1/users',
    headers,
    body,
    queryParams,
  };
}

export function generateFetchCode(req: ParsedRequest): string {
  const options: Record<string, unknown> = {
    method: req.method,
  };

  if (Object.keys(req.headers).length > 0) {
    options.headers = req.headers;
  }

  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = req.headers['Content-Type']?.includes('application/json')
      ? `JSON.stringify(${req.body})`
      : req.body;
  }

  let bodyStr = '';
  if (options.body) {
    if (typeof options.body === 'string' && options.body.startsWith('JSON.stringify(')) {
      bodyStr = `\n  body: ${options.body},`;
    } else {
      bodyStr = `\n  body: ${JSON.stringify(options.body)},`;
    }
  }

  const headersStr = Object.keys(req.headers).length > 0
    ? `\n  headers: ${JSON.stringify(req.headers, null, 4).replace(/\n/g, '\n  ')},`
    : '';

  return `// Native Fetch (Browser & Node.js 18+)
const response = await fetch(${JSON.stringify(req.url)}, {
  method: '${req.method}',${headersStr}${bodyStr}
});

const data = await response.json();
console.log(data);`;
}

export function generateAxiosCode(req: ParsedRequest): string {
  const configParts: string[] = [`  method: '${req.method.toLowerCase()}'`, `  url: '${req.url}'`];

  if (Object.keys(req.headers).length > 0) {
    configParts.push(`  headers: ${JSON.stringify(req.headers, null, 4).replace(/\n/g, '\n  ')}`);
  }

  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const json = JSON.parse(req.body);
      configParts.push(`  data: ${JSON.stringify(json, null, 4).replace(/\n/g, '\n  ')}`);
    } catch {
      configParts.push(`  data: ${JSON.stringify(req.body)}`);
    }
  }

  return `import axios from 'axios';

try {
  const response = await axios({
${configParts.join(',\n')}
  });
  console.log(response.data);
} catch (error) {
  console.error(error);
}`;
}

export function generatePythonRequestsCode(req: ParsedRequest): string {
  const lines = ['import requests\n', `url = "${req.url}"`];

  if (Object.keys(req.headers).length > 0) {
    lines.push(`headers = ${JSON.stringify(req.headers, null, 4)}`);
  }

  let dataArg = '';
  if (req.body && req.method !== 'GET') {
    try {
      const parsed = JSON.parse(req.body);
      lines.push(`payload = ${JSON.stringify(parsed, null, 4)}`);
      dataArg = ', json=payload';
    } catch {
      lines.push(`payload = """${req.body}"""`);
      dataArg = ', data=payload';
    }
  }

  const headerArg = Object.keys(req.headers).length > 0 ? ', headers=headers' : '';
  lines.push(`\nresponse = requests.${req.method.toLowerCase()}(url${headerArg}${dataArg})`);
  lines.push('print(response.status_code)');
  lines.push('print(response.json())');

  return lines.join('\n');
}

export function generateGoCode(req: ParsedRequest): string {
  const hasBody = req.body && req.method !== 'GET';
  return `package main

import (
\t"fmt"
\t"io"
\t"net/http"
${hasBody ? '\t"strings"\n' : ''})

func main() {
\tclient := &http.Client{}
${hasBody ? `\tbodyReader := strings.NewReader(\`${req.body.replace(/`/g, '')}\`)\n\treq, err := http.NewRequest("${req.method}", "${req.url}", bodyReader)` : `\treq, err := http.NewRequest("${req.method}", "${req.url}", nil)`}
\tif err != nil {
\t\tpanic(err)
\t}

${Object.entries(req.headers).map(([k, v]) => `\treq.Header.Set("${k}", "${v}")`).join('\n')}

\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, _ := io.ReadAll(resp.Body)
\tfmt.Println(string(body))
}`;
}

export function formatAsCurl(req: ParsedRequest): string {
  const parts = [`curl -X ${req.method} "${req.url}"`];
  for (const [k, v] of Object.entries(req.headers)) {
    parts.push(`  -H "${k}: ${v}"`);
  }
  if (req.body && req.method !== 'GET') {
    parts.push(`  -d '${req.body}'`);
  }
  return parts.join(' \\\n');
}

// Realistic mock JSON templates for quick testing
export const MOCK_TEMPLATES = {
  usersList: [
    {
      id: "usr_998124",
      name: "Alex Vance",
      email: "alex.vance@blackmesa.org",
      role: "Lead Engineer",
      status: "active",
      teams: ["Infrastructure", "Core Runtime"],
      metadata: { lastLogin: "2026-10-24T09:12:00Z", verified: true }
    },
    {
      id: "usr_998125",
      name: "Somchai Prasert",
      email: "somchai.p@techcorp.co.th",
      role: "Staff DevOps",
      status: "active",
      teams: ["Kubernetes", "Observability"],
      metadata: { lastLogin: "2026-10-24T10:04:15Z", verified: true }
    }
  ],
  ecommerceOrder: {
    orderId: "ord_2026_88921",
    customer: {
      id: "cust_4402",
      name: "Ploy Pailin",
      email: "ploy.p@bangkok.dev",
      currency: "THB"
    },
    items: [
      { sku: "DEV-KEYBOARD-PRO", name: "Mechanical 75% Wireless Keyboard", qty: 1, unitPrice: 4290 },
      { sku: "DEV-DESK-MAT", name: "Topo Cordura Desk Mat", qty: 2, unitPrice: 690 }
    ],
    pricing: { subtotal: 5670, discount: 500, shipping: 0, total: 5170 },
    payment: { method: "PROMPT_PAY_QR", status: "PAID", transactionRef: "TXN_77301928" },
    shippingAddress: { city: "Bangkok", postalCode: "10110", country: "TH" }
  },
  paginatedResponse: {
    data: [
      { id: 1, title: "Optimizing PostgreSQL Indices", reads: 4200, published: true },
      { id: 2, title: "Building Resilient Distributed Event Queues", reads: 7890, published: true }
    ],
    pagination: {
      page: 1,
      perPage: 20,
      totalCount: 142,
      totalPages: 8,
      hasNext: true,
      hasPrev: false
    }
  }
};
