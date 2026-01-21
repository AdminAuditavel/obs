import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'app-logo.png'],
          manifest: {
            name: 'Observer - Relatos Operacionais',
            short_name: 'Observer',
            description: 'Plataforma de relatos e meteorologia aeronáutica',
            theme_color: '#1f71ff',
            background_color: '#0f1623',
            display: 'standalone',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: 'app-logo.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'app-logo.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
