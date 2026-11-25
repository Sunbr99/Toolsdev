import React, { useState, useEffect, useMemo, useRef } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import {
  Layout,
  Play,
  Copy,
  Check,
  Download,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  RotateCcw,
  Terminal,
  Code2,
  Trash2,
} from 'lucide-react';

interface SiteBuilderStudioProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  js: string;
}

interface ConsoleEntry {
  id: string;
  level: 'log' | 'warn' | 'error';
  message: string;
  time: string;
}

interface CodeSnippet {
  id: string;
  title: string;
  language: 'HTML/CSS' | 'React TS' | 'Express TS' | 'Python';
  description: string;
  htmlAppend?: string;
  cssAppend?: string;
  code: string;
}

const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  {
    id: 'saas-landing',
    name: 'Product Landing Page',
    description: 'Responsive navbar, hero banner, 3-column feature grid, pricing cards, and interactive FAQ.',
    html: `<header class="site-header">
  <div class="container nav-inner">
    <a href="#" class="brand">Northstar</a>
    <nav class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">FAQ</a>
    </nav>
    <a href="#pricing" class="btn btn-primary">Get Started</a>
  </div>
</header>

<main>
  <section class="hero">
    <div class="container hero-inner">
      <p class="kicker">Built for modern web teams</p>
      <h1>Ship faster websites with clean, predictable code.</h1>
      <p class="subtitle">
        A complete responsive starter layout with accessible typography, flexible CSS Grid sections, and zero external dependencies.
      </p>
      <div class="hero-actions">
        <a href="#pricing" class="btn btn-primary">Start Building</a>
        <a href="#features" class="btn btn-secondary">Explore Features</a>
      </div>
    </div>
  </section>

  <section id="features" class="section">
    <div class="container">
      <h2>Core Capabilities</h2>
      <div class="grid-3">
        <article class="card">
          <h3>Responsive Layout</h3>
          <p>Fluid CSS Grid columns adapt automatically from widescreen monitors down to mobile phones.</p>
        </article>
        <article class="card">
          <h3>Semantic HTML5</h3>
          <p>Structured with header, main, section, and article tags for strong SEO and screen-reader support.</p>
        </article>
        <article class="card">
          <h3>Interactive Controls</h3>
          <p>Lightweight vanilla JavaScript powers interactive components without heavy framework overhead.</p>
        </article>
      </div>
    </div>
  </section>

  <section id="pricing" class="section alt-bg">
    <div class="container">
      <h2>Simple Pricing</h2>
      <div class="grid-2">
        <article class="card">
          <h3>Starter</h3>
          <p class="price">$0 <span>/ month</span></p>
          <p>Everything you need for personal sites, portfolios, and static exports.</p>
          <button class="btn btn-secondary select-plan" data-plan="Starter">Choose Starter</button>
        </article>
        <article class="card highlight">
          <h3>Pro Team</h3>
          <p class="price">$24 <span>/ month</span></p>
          <p>Shared component libraries, custom domains, and automated deployment hooks.</p>
          <button class="btn btn-primary select-plan" data-plan="Pro Team">Choose Pro</button>
        </article>
      </div>
    </div>
  </section>

  <section id="faq" class="section">
    <div class="container faq-wrap">
      <h2>Frequently Asked Questions</h2>
      <button class="faq-item" aria-expanded="false">
        <span>Can I export this as a standalone HTML file?</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer" hidden>
        Yes. Click "Download index.html" in the toolbar to export a single self-contained file ready for hosting anywhere.
      </div>
      <button class="faq-item" aria-expanded="false">
        <span>Does it work on mobile devices?</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer" hidden>
        Yes. All layouts use responsive CSS variables, flexible grids, and mobile-friendly spacing.
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="container">
    <p>&copy; 2026 Northstar Studio. Built cleanly in HTML, CSS &amp; JS.</p>
  </div>
</footer>`,
    css: `:root {
  --bg: #0b1120;
  --surface: #111827;
  --border: #1f2937;
  --text: #f3f4f6;
  --muted: #9ca3af;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 20px;
}

.site-header {
  border-bottom: 1px solid var(--border);
  background: rgba(11, 17, 32, 0.9);
  position: sticky;
  top: 0;
  backdrop-filter: blur(8px);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: 16px;
}

.brand {
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.9rem;
}

.nav-links a:hover { color: #fff; }

.btn {
  display: inline-block;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-hover); }

.btn-secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
}
.btn-secondary:hover { border-color: var(--muted); }

.hero {
  padding: 80px 0 64px;
  text-align: center;
}

.kicker {
  font-size: 0.85rem;
  color: #818cf8;
  font-weight: 600;
  margin-bottom: 12px;
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1.15;
  max-width: 720px;
  margin: 0 auto 16px;
}

.subtitle {
  color: var(--muted);
  max-width: 580px;
  margin: 0 auto 28px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.section { padding: 64px 0; }
.alt-bg { background: #0f172a; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }

.section h2 {
  font-size: 1.65rem;
  margin-bottom: 28px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card.highlight { border-color: var(--accent); }
.card p { color: var(--muted); font-size: 0.95rem; }
.price { font-size: 2rem; font-weight: 700; color: #fff !important; }
.price span { font-size: 0.9rem; font-weight: 400; color: var(--muted); }

.faq-wrap { max-width: 720px; }
.faq-item {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-top: 10px;
  color: var(--text);
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  text-align: left;
}

.faq-answer {
  padding: 14px 16px;
  color: var(--muted);
  font-size: 0.92rem;
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.site-footer {
  padding: 32px 0;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
}`,
    js: `// Interactive FAQ accordion
document.querySelectorAll('.faq-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    const answer = btn.nextElementSibling;
    if (answer) answer.hidden = expanded;
    const icon = btn.querySelector('.faq-icon');
    if (icon) icon.textContent = expanded ? '+' : '-';
  });
});

// Plan selection logger
document.querySelectorAll('.select-plan').forEach((btn) => {
  btn.addEventListener('click', () => {
    const plan = btn.getAttribute('data-plan');
    console.log('Selected plan:', plan);
    btn.textContent = 'Selected ' + plan;
  });
});`,
  },
  {
    id: 'portfolio',
    name: 'Developer Portfolio',
    description: 'Clean bio, filterable project gallery, and interactive contact form.',
    html: `<main class="wrap">
  <header class="intro">
    <h1>Alex Rivera</h1>
    <p class="role">Full-Stack &amp; Mobile Engineer</p>
    <p class="bio">Building fast web apps, REST APIs, and cross-platform Android utilities.</p>
  </header>

  <section class="projects">
    <div class="section-head">
      <h2>Selected Work</h2>
      <div class="filters">
        <button class="filter-btn active" data-cat="all">All</button>
        <button class="filter-btn" data-cat="web">Web</button>
        <button class="filter-btn" data-cat="mobile">Mobile</button>
      </div>
    </div>

    <div class="project-grid">
      <article class="project-card" data-cat="web">
        <h3>InvoiceFlow API</h3>
        <p>TypeScript + PostgreSQL billing engine with webhook signing.</p>
      </article>
      <article class="project-card" data-cat="mobile">
        <h3>FieldScan Android</h3>
        <p>Capacitor offline inventory scanner with local SQLite sync.</p>
      </article>
      <article class="project-card" data-cat="web">
        <h3>MetricGrid UI</h3>
        <p>Accessible data-table component library in React &amp; CSS.</p>
      </article>
    </div>
  </section>

  <section class="contact">
    <h2>Get in Touch</h2>
    <form id="contactForm" class="contact-form">
      <input type="text" id="senderName" placeholder="Your name" required />
      <input type="email" id="senderEmail" placeholder="you@example.com" required />
      <textarea id="senderMsg" rows="3" placeholder="Tell me about your project..." required></textarea>
      <button type="submit">Send Message</button>
      <p id="formStatus" class="status"></p>
    </form>
  </section>
</main>`,
    css: `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #fafafa;
  color: #111827;
  line-height: 1.6;
}
.wrap { max-width: 860px; margin: 0 auto; padding: 48px 20px; display: grid; gap: 48px; }
.intro h1 { font-size: 2.4rem; letter-spacing: -0.02em; }
.role { color: #4f46e5; font-weight: 600; margin-top: 4px; }
.bio { color: #4b5563; margin-top: 12px; max-width: 560px; }

.section-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
.filters { display: flex; gap: 6px; }
.filter-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
}
.filter-btn.active { background: #111827; color: #fff; border-color: #111827; }

.project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.project-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 20px;
}
.project-card h3 { font-size: 1.05rem; margin-bottom: 6px; }
.project-card p { font-size: 0.9rem; color: #4b5563; }

.contact-form { display: grid; gap: 12px; max-width: 480px; margin-top: 14px; }
.contact-form input, .contact-form textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font: inherit;
}
.contact-form button {
  padding: 10px 16px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.status { font-size: 0.88rem; color: #059669; min-height: 20px; }`,
    js: `// Category filtering
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.getAttribute('data-cat');
    document.querySelectorAll('.project-card').forEach((card) => {
      const match = cat === 'all' || card.getAttribute('data-cat') === cat;
      card.style.display = match ? 'block' : 'none';
    });
  });
});

// Contact form handler
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('senderName').value.trim();
  const email = document.getElementById('senderEmail').value.trim();
  console.log('Form submitted:', { name, email });
  document.getElementById('formStatus').textContent = 'Thanks ' + name + ', message validated locally.';
  e.target.reset();
});`,
  },
  {
    id: 'interactive-app',
    name: 'Task & Notes Web App',
    description: 'Interactive client-side CRUD task manager with filtering and live counts.',
    html: `<main class="app">
  <header class="app-header">
    <h1>Sprint Tasks</h1>
    <span id="counter" class="counter">0 remaining</span>
  </header>

  <form id="taskForm" class="add-row">
    <input id="taskInput" type="text" placeholder="Add a coding task..." required />
    <button type="submit">Add</button>
  </form>

  <ul id="taskList" class="task-list"></ul>
</main>`,
    css: `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  padding: 36px 16px;
}
.app {
  max-width: 540px;
  margin: 0 auto;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
}
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.app-header h1 { font-size: 1.35rem; }
.counter { font-size: 0.85rem; color: #94a3b8; font-variant-numeric: tabular-nums; }
.add-row { display: flex; gap: 8px; margin-bottom: 16px; }
.add-row input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #0f172a;
  color: #fff;
}
.add-row button {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: #6366f1;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.task-list { list-style: none; display: grid; gap: 8px; }
.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: #0f172a;
  border: 1px solid #334155;
}
.task-item label { display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; }
.task-item.done span { text-decoration: line-through; color: #64748b; }
.del-btn {
  background: transparent;
  border: none;
  color: #f87171;
  cursor: pointer;
  font-size: 0.85rem;
}`,
    js: `const tasks = [
  { id: 1, text: 'Configure Android keystore permissions', done: true },
  { id: 2, text: 'Audit package-lock.json integrity', done: false },
  { id: 3, text: 'Export production index.html', done: false }
];

const list = document.getElementById('taskList');
const counter = document.getElementById('counter');

function render() {
  list.innerHTML = '';
  const remaining = tasks.filter((t) => !t.done).length;
  counter.textContent = remaining + ' remaining';

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');

    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = task.done;
    cb.addEventListener('change', () => {
      task.done = cb.checked;
      render();
    });

    const span = document.createElement('span');
    span.textContent = task.text;
    label.append(cb, span);

    const del = document.createElement('button');
    del.className = 'del-btn';
    del.textContent = 'Remove';
    del.addEventListener('click', () => {
      const idx = tasks.findIndex((t) => t.id === task.id);
      if (idx !== -1) tasks.splice(idx, 1);
      render();
    });

    li.append(label, del);
    list.append(li);
  });
}

document.getElementById('taskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, done: false });
  console.log('Added task:', text);
  input.value = '';
  render();
});

render();`,
  },
];

const CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'snip-contact-section',
    title: 'Responsive Contact Form Section',
    language: 'HTML/CSS',
    description: 'Drop-in contact form section you can insert directly into the current HTML/CSS workspace.',
    htmlAppend: `\n<section class="section">\n  <div class="container" style="max-width:560px;">\n    <h2>Contact Us</h2>\n    <form style="display:grid;gap:12px;margin-top:16px;">\n      <input type="text" placeholder="Full Name" required style="padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;" />\n      <input type="email" placeholder="Email Address" required style="padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;" />\n      <textarea rows="4" placeholder="Message" required style="padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;"></textarea>\n      <button type="submit" class="btn btn-primary">Submit</button>\n    </form>\n  </div>\n</section>`,
    code: `<section class="section">
  <div class="container" style="max-width:560px;">
    <h2>Contact Us</h2>
    <form style="display:grid;gap:12px;margin-top:16px;">
      <input type="text" placeholder="Full Name" required />
      <input type="email" placeholder="Email Address" required />
      <textarea rows="4" placeholder="Message" required></textarea>
      <button type="submit">Submit</button>
    </form>
  </div>
</section>`,
  },
  {
    id: 'snip-feature-cards',
    title: '3-Column Responsive Grid',
    language: 'HTML/CSS',
    description: 'Fluid 3-column card layout using CSS Grid auto-fit.',
    htmlAppend: `\n<section class="section">\n  <div class="container grid-3">\n    <article class="card"><h3>Fast</h3><p>Optimized static assets.</p></article>\n    <article class="card"><h3>Accessible</h3><p>Semantic landmarks and contrast.</p></article>\n    <article class="card"><h3>Portable</h3><p>Exports to clean HTML.</p></article>\n  </div>\n</section>`,
    code: `.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}`,
  },
  {
    id: 'snip-react-fetch',
    title: 'React Type-Safe Data Fetch Hook',
    language: 'React TS',
    description: 'Reusable React hook with AbortController cleanup and loading/error states.',
    code: `import { useState, useEffect } from 'react';

export function useFetchJson<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}`,
  },
  {
    id: 'snip-express-api',
    title: 'Express REST API Starter',
    language: 'Express TS',
    description: 'Type-safe Express server with JSON validation, CORS headers, and error handler.',
    code: `import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/items', (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  return res.status(201).json({ id: crypto.randomUUID(), name: name.trim() });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message });
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
  },
  {
    id: 'snip-python-fastapi',
    title: 'Python FastAPI Endpoint',
    language: 'Python',
    description: 'Clean FastAPI route with Pydantic input validation.',
    code: `from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

class ItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    published: bool = False

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/items")
def create_item(payload: ItemCreate):
    return {"created": True, "item": payload.model_dump()}`,
  },
];

const STORAGE_KEY = 'devforge_site_builder_v1';

export const SiteBuilderStudio: React.FC<SiteBuilderStudioProps> = ({ onNotify }) => {
  const [workspaceMode, setWorkspaceMode] = useState<'studio' | 'snippets'>('studio');
  const [codeTab, setCodeTab] = useState<'html' | 'css' | 'js'>('html');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [snippetLang, setSnippetLang] = useState<'All' | CodeSnippet['language']>('All');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [html, setHtml] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).html ?? WEBSITE_TEMPLATES[0].html;
    } catch { /* ignore */ }
    return WEBSITE_TEMPLATES[0].html;
  });
  const [css, setCss] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).css ?? WEBSITE_TEMPLATES[0].css;
    } catch { /* ignore */ }
    return WEBSITE_TEMPLATES[0].css;
  });
  const [js, setJs] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).js ?? WEBSITE_TEMPLATES[0].js;
    } catch { /* ignore */ }
    return WEBSITE_TEMPLATES[0].js;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ html, css, js }));
    } catch { /* ignore */ }
  }, [html, css, js]);

  // Listen for sandboxed console logs from the preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || event.data.source !== 'devforge-preview') return;
      const entry: ConsoleEntry = {
        id: Math.random().toString(36).slice(2, 9),
        level: event.data.level || 'log',
        message: String(event.data.message || ''),
        time: new Date().toLocaleTimeString(),
      };
      setConsoleLogs((prev) => [...prev.slice(-24), entry]);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const srcDoc = useMemo(() => {
    const safeJs = js.replace(/<\/script>/gi, '<\\/script>');
    const safeCss = css.replace(/<\/style>/gi, '<\\/style>');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <style>${safeCss}</style>
</head>
<body>
  ${html}
  <script>
    (function() {
      const send = (level, args) => {
        try {
          const text = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          parent.postMessage({ source: 'devforge-preview', level, message: text }, '*');
        } catch (_) {}
      };
      const origLog = console.log;
      const origWarn = console.warn;
      const origErr = console.error;
      console.log = (...args) => { send('log', args); origLog.apply(console, args); };
      console.warn = (...args) => { send('warn', args); origWarn.apply(console, args); };
      console.error = (...args) => { send('error', args); origErr.apply(console, args); };
      window.addEventListener('error', (e) => send('error', [e.message]));
    })();
  </script>
  <script>
    try {
      ${safeJs}
    } catch (err) {
      console.error(err && err.message ? err.message : String(err));
    }
  </script>
</body>
</html>`;
  }, [html, css, js]);

  const exportDocument = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Website</title>
  <style>
${css}
  </style>
</head>
<body>
${html}
  <script>
${js}
  </script>
</body>
</html>`;
  }, [html, css, js]);

  const loadTemplate = (tpl: WebsiteTemplate) => {
    setHtml(tpl.html);
    setCss(tpl.css);
    setJs(tpl.js);
    setConsoleLogs([]);
    onNotify(`Loaded template: ${tpl.name}`);
  };

  const handleDownloadSite = () => {
    const blob = new Blob([exportDocument], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Downloaded standalone index.html');
  };

  const handleCopy = (text: string, id: string, label: string) => {
    void copyToClipboard(text);
    setCopiedId(id);
    onNotify(`Copied ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertSection = (snip: CodeSnippet) => {
    if (snip.htmlAppend) {
      setHtml((prev) => `${prev}${snip.htmlAppend}`);
    }
    if (snip.cssAppend) {
      setCss((prev) => `${prev}\n${snip.cssAppend}`);
    }
    setWorkspaceMode('studio');
    setCodeTab('html');
    onNotify(`Inserted "${snip.title}" into HTML editor`);
  };

  const activeCodeValue = codeTab === 'html' ? html : codeTab === 'css' ? css : js;
  const setActiveCodeValue = (val: string) => {
    if (codeTab === 'html') setHtml(val);
    else if (codeTab === 'css') setCss(val);
    else setJs(val);
  };

  const filteredSnippets = CODE_SNIPPETS.filter(
    (s) => snippetLang === 'All' || s.language === snippetLang
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Website &amp; Code Studio
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Build complete responsive websites in HTML, CSS, and JavaScript with live viewport preview, sandboxed console output, starter templates, and multi-language code boilerplates.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setWorkspaceMode('studio')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              workspaceMode === 'studio' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Website Builder
          </button>
          <button
            onClick={() => setWorkspaceMode('snippets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              workspaceMode === 'snippets' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sections &amp; Code Starters
          </button>
        </div>
      </div>

      {workspaceMode === 'studio' && (
        <div className="space-y-5">
          {/* Template & Export Toolbar */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">Starter Templates:</span>
              {WEBSITE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => loadTemplate(tpl)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  {tpl.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCopy(exportDocument, 'export-html', 'complete index.html')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                {copiedId === 'export-html' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Full HTML</span>
              </button>
              <button
                onClick={handleDownloadSite}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download index.html</span>
              </button>
            </div>
          </div>

          {/* Split Workspace: Editor Left + Live Preview Right */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Code Editor Pane */}
            <div className="xl:col-span-6 rounded-xl bg-neutral-900 border border-stone-800 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-neutral-950/60">
                <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800">
                  {(['html', 'css', 'js'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCodeTab(tab)}
                      className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors uppercase ${
                        codeTab === tab
                          ? 'bg-amber-500 text-neutral-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                  <span>{activeCodeValue.split('\n').length} lines</span>
                  <button
                    onClick={() => handleCopy(activeCodeValue, `copy-${codeTab}`, `${codeTab.toUpperCase()} code`)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy current file"
                  >
                    {copiedId === `copy-${codeTab}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      loadTemplate(WEBSITE_TEMPLATES[0]);
                    }}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Reset to default template"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                value={activeCodeValue}
                onChange={(e) => setActiveCodeValue(e.target.value)}
                spellCheck={false}
                className="w-full flex-1 min-h-[460px] p-4 bg-neutral-950 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none resize-none"
                placeholder={`Write ${codeTab.toUpperCase()} code here...`}
              />
            </div>

            {/* Live Preview + Console Pane */}
            <div className="xl:col-span-6 flex flex-col gap-4">
              <div className="rounded-xl bg-neutral-900 border border-stone-800 flex flex-col overflow-hidden flex-1">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-neutral-950/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Preview</span>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800">
                    <button
                      onClick={() => setViewport('desktop')}
                      className={`p-1.5 rounded ${viewport === 'desktop' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'}`}
                      title="Desktop width"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewport('tablet')}
                      className={`p-1.5 rounded ${viewport === 'tablet' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'}`}
                      title="Tablet width (768px)"
                    >
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewport('mobile')}
                      className={`p-1.5 rounded ${viewport === 'mobile' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'}`}
                      title="Mobile width (375px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-neutral-950 p-3 flex justify-center overflow-auto min-h-[360px]">
                  <iframe
                    ref={iframeRef}
                    title="Website Live Preview"
                    srcDoc={srcDoc}
                    sandbox="allow-scripts"
                    className="bg-white rounded-lg border border-stone-800 h-[420px] transition-all duration-200"
                    style={{
                      width:
                        viewport === 'mobile'
                          ? '375px'
                          : viewport === 'tablet'
                          ? '768px'
                          : '100%',
                    }}
                  />
                </div>
              </div>

              {/* Console Output */}
              <div className="rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800 bg-neutral-950/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sandbox Console ({consoleLogs.length})</span>
                  </div>
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto p-3 bg-neutral-950 font-mono text-xs space-y-1">
                  {consoleLogs.length === 0 ? (
                    <div className="text-slate-500">Console output from console.log() or script errors appears here.</div>
                  ) : (
                    consoleLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-2 ${
                          entry.level === 'error'
                            ? 'text-rose-400'
                            : entry.level === 'warn'
                            ? 'text-amber-400'
                            : 'text-emerald-300'
                        }`}
                      >
                        <span className="text-slate-500 tabular-nums shrink-0">{entry.time}</span>
                        <span className="break-all">{entry.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {workspaceMode === 'snippets' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 w-fit">
            {(['All', 'HTML/CSS', 'React TS', 'Express TS', 'Python'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSnippetLang(lang)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  snippetLang === lang ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredSnippets.map((snip) => (
              <div
                key={snip.id}
                className="rounded-xl bg-neutral-900 border border-stone-800 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-slate-100">{snip.title}</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{snip.language}</span>
                  </div>
                  <p className="text-xs text-slate-400">{snip.description}</p>
                  <pre className="p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-200 overflow-x-auto max-h-56 leading-relaxed">
                    <code>{snip.code}</code>
                  </pre>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-800">
                  {snip.htmlAppend && (
                    <button
                      onClick={() => handleInsertSection(snip)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insert into Website</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(snip.code, snip.id, snip.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    {copiedId === snip.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Code</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
