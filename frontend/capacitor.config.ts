import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.m63.app',
  appName: 'M63',
  webDir: 'dist',
  server: {
    // The app talks to the M63 backend over the local network during development (plain HTTP).
    // For a production build point VITE_API_URL at an HTTPS backend and remove `cleartext`.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
