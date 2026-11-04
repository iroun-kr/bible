const SHELL = "krv-shell-v1";
const DATA = "krv-data";
const FONTS = "krv-fonts";
const SHELL_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith("krv-shell-") && k !== SHELL).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 성경 본문: 저장된 것이 있으면 바로 사용
  if (url.origin === location.origin && /\/data\/\d\d\.json$/.test(url.pathname)) {
    e.respondWith(caches.open(DATA).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // 글꼴: 저장본을 먼저 쓰고 뒤에서 새로 받기
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // 앱 화면: 인터넷이 되면 새 버전, 안 되면 저장본
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) caches.open(SHELL).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
  }
});
