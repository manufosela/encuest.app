// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import dotenv from 'dotenv';

dotenv.config();

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    define: {
      'import.meta.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY),
      'import.meta.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN),
      'import.meta.env.FIREBASE_DATABASE_URL': JSON.stringify(process.env.FIREBASE_DATABASE_URL),
      'import.meta.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID),
      'import.meta.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET),
      'import.meta.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.FIREBASE_APP_ID': JSON.stringify(process.env.FIREBASE_APP_ID),
    },
  },
});
