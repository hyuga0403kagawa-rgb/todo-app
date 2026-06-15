const CACHE = 'todo-app-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// スケジュール済みタイマーを保持
const timers = new Map();

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    // 既存タイマーをすべてクリア
    timers.forEach(id => clearTimeout(id));
    timers.clear();

    const now = Date.now();
    e.data.items.forEach(item => {
      const delay = item.fireAt - now;
      if (delay <= 0 || delay > 8 * 24 * 60 * 60 * 1000) return; // 過去 or 8日超はスキップ

      const tid = setTimeout(() => {
        self.registration.showNotification(item.title, {
          body: item.body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: item.tag,
          requireInteraction: true,
        });
        timers.delete(item.tag);
      }, delay);

      timers.set(item.tag, tid);
    });

    // 登録件数をページに返す
    e.source && e.source.postMessage({ type: 'SCHEDULED', count: timers.size });
  }
});
