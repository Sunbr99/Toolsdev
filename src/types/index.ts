export type ToolTab =
  | 'mobile-capacitor'
  | 'build-hardener'
  | 'build-perf'
  | 'apk-inspector'
  | 'dependency-integrity'
  | 'site-builder'
  | 'test-suite'
  | 'mock-api'
  | 'security-network'
  | 'git-hub'
  | 'code-diff'
  | 'svg-assets'
  | 'env-config'
  | 'http-status'
  | 'api-curl'
  | 'json-architect'
  | 'jwt-crypto'
  | 'regex-lab'
  | 'sql-studio'
  | 'cron-time'
  | 'css-web'
  | 'wcag-contrast';

export type ToolCategory = 'all' | 'android' | 'security' | 'web' | 'api-data';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  description: string;
  tab: ToolTab;
  subAction?: string;
  keywords: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
}
