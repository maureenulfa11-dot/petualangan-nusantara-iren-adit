import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1550,
  },
  plugins: [{
    name: 'offline-shell',
    async closeBundle() {
      const paths = ['/', '/manifest.webmanifest'];
      for (const directory of ['assets', 'art']) {
        for (const name of (await readdir('dist/' + directory)).sort()) paths.push('/' + directory + '/' + name);
      }
      const fingerprint = createHash('sha256');
      for (const path of paths) fingerprint.update(await readFile(path === '/' ? 'dist/index.html' : 'dist' + path));
      const shell = 'nusantara-' + fingerprint.digest('hex').slice(0, 14);
      await writeFile('dist/sw.js', [
        'const KEY = ' + JSON.stringify(shell) + ';',
        'const FILES = ' + JSON.stringify(paths) + ';',
        "self.addEventListener('install', event => event.waitUntil(caches.open(KEY).then(cache => cache.addAll(FILES))));",
        "self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nusantara-') && key !== KEY).map(key => caches.delete(key)))).then(() => self.clients.claim())));",
        "self.addEventListener('fetch', event => {",
        "  const url = new URL(event.request.url);",
        "  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;",
        "  if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request).catch(() => caches.match('/'))); return; }",
        "  if (FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));",
        "});",
      ].join('\n'));
    },
  }],
});
