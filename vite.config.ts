import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function projectBundleExportPlugin(): Plugin {
  const attachRoute = (middlewares: {
    use: (path: string, handler: (req: any, res: any, next: () => void) => void) => void;
  }) => {
    middlewares.use('/download-project-bundle.zip', (req, res, next) => {
      const gitDir = path.resolve(import.meta.dirname, '.git');
      if (!fs.existsSync(gitDir)) {
        res.statusCode = 404;
        res.end('Git archive unavailable');
        return;
      }

      if (req.method === 'HEAD') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'attachment; filename="devforge-studio-git-apk.zip"');
        res.setHeader('Cache-Control', 'no-store');
        res.end();
        return;
      }

      if (req.method !== 'GET') {
        next();
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'attachment; filename="devforge-studio-git-apk.zip"');
      res.setHeader('Cache-Control', 'no-store');

      const proc = spawn('git', [
        '-c',
        'safe.directory=*',
        '--git-dir=' + gitDir,
        'archive',
        '--format=zip',
        '--prefix=devforge-studio/',
        'HEAD',
      ]);
      proc.stdout.pipe(res);
      proc.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Failed to build ZIP bundle');
        }
      });
    });
  };

  return {
    name: 'devforge-project-bundle-export',
    configureServer(server) {
      attachRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      attachRoute(server.middlewares);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      projectBundleExportPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'assets/aistudio/icon_68d78a75.png',
          'assets/aistudio/____________Canva___________a658a214.png',
        ],
        manifest: {
          id: '/',
          name: 'DevForge Studio',
          short_name: 'DevForge',
          description: 'Offline-capable developer workbench by Dev.Aistudio x MW Next for Web, Android APK, Security Audit, and Testing.',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/download-project-bundle\.zip$/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
