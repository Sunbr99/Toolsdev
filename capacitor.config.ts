import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mwnext.devforgestudio',
  appName: 'DevForge Studio',
  webDir: 'dist',
  backgroundColor: '#0a0a0a',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
