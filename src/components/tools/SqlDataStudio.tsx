import React, { useState } from 'react';
import { Database, Copy, Check, Wand2, FileCode, Sparkles, Download } from 'lucide-react';
import { formatSql, ddlToTypeScript, generateMockSqlInserts } from '../../utils/sqlUtils';
import { copyToClipboard } from '../../utils/clipboard';

interface SqlDataStudioProps {
  onNotify: (msg: string) => void;
}

type SqlTab = 'format' | 'ddl' | 'seed';

const SAMPLE_SQL = `select u.id, u.email, u.full_name, count(o.id) as total_orders, sum(o.total_amount) as total_revenue from users u left join orders o on u.id = o.user_id where u.is_active = true and u.created_at >= '2026-01-01' group by u.id, u.email, u.full_name having count(o.id) > 5 order by total_revenue desc limit 50;`;

const SAMPLE_DDL = `CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  loyalty_score INT DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);`;

export const SqlDataStudio: React.FC<SqlDataStudioProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<SqlTab>('format');
  const [sqlQuery, setSqlQuery] = useState<string>(SAMPLE_SQL);
  const [ddlInput, setDdlInput] = useState<string>(SAMPLE_DDL);
  const [seedTable, setSeedTable] = useState<string>('users');
  const [seedRows, setSeedRows] = useState<number>(20);
  const [copied, setCopied] = useState(false);

  const formattedSql = formatSql(sqlQuery);
  const generatedTs = ddlToTypeScript(ddlInput);
  const generatedSeed = generateMockSqlInserts(seedTable, seedRows);

  const handleCopy = (text: string, label: string = 'Copied') => {
    void copyToClipboard(text);
    setCopied(true);
    onNotify(label);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(`Downloaded ${filename}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">SQL & Database Lab</h2>
          <p className="text-sm text-slate-400 mt-1">
            Format complex SQL queries, generate TypeScript models from DDL, and synthesize mock database seeders.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setActiveTab('format')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'format' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Query Formatter
          </button>
          <button
            onClick={() => setActiveTab('ddl')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'ddl' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DDL to TypeScript
          </button>
          <button
            onClick={() => setActiveTab('seed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'seed' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mock Data Seeder
          </button>
        </div>
      </div>

      {/* Tab 1: SQL Query Formatter */}
      {activeTab === 'format' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Input SQL */}
          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Raw SQL Query</span>
              </div>
              <button
                onClick={() => setSqlQuery(SAMPLE_SQL)}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Reset Example
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col bg-neutral-950">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Paste unformatted SQL query here..."
                rows={12}
                className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-slate-200 leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Formatted Output */}
          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40">
              <span className="text-xs font-bold text-slate-300">Beautified Standard SQL</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(formattedSql, 'Copied beautified SQL query')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col bg-neutral-950 overflow-auto">
              <pre className="text-xs font-mono text-amber-200 leading-relaxed">
                <code>{formattedSql}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DDL to TypeScript */}
      {activeTab === 'ddl' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">SQL CREATE TABLE (PostgreSQL / MySQL)</span>
              <button
                onClick={() => setDdlInput(SAMPLE_DDL)}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Reset Example
              </button>
            </div>
            <div className="p-4 flex-1 flex flex-col bg-neutral-950">
              <textarea
                value={ddlInput}
                onChange={(e) => setDdlInput(e.target.value)}
                rows={12}
                className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-slate-200 leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Generated TypeScript Interface</span>
              <button
                onClick={() => handleCopy(generatedTs, 'Copied TypeScript model')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy TS'}</span>
              </button>
            </div>
            <div className="p-4 flex-1 flex flex-col bg-neutral-950 overflow-auto">
              <pre className="text-xs font-mono text-amber-200 leading-relaxed">
                <code>{generatedTs}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Mock Data Seeder */}
      {activeTab === 'seed' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-stone-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Table Name:</span>
              <input
                type="text"
                value={seedTable}
                onChange={(e) => setSeedTable(e.target.value)}
                className="px-3 py-1.5 bg-neutral-950 border border-stone-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Rows:</span>
              {[10, 20, 50, 100].map((num) => (
                <button
                  key={num}
                  onClick={() => setSeedRows(num)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                    seedRows === num ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(generatedSeed, `Copied ${seedRows} SQL seed rows`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL</span>
              </button>
              <button
                onClick={() => handleDownload(generatedSeed, `${seedTable}-seed.sql`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4">
            <pre className="max-h-96 overflow-y-auto p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-emerald-300 leading-relaxed">
              <code>{generatedSeed}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
