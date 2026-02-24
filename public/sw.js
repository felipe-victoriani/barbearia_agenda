// Service Worker para PWA - Cache Offline
const CACHE_NAME = "barbearia-v1.0.0";
const STATIC_CACHE = "barbearia-static-v1.0.0";
const DYNAMIC_CACHE = "barbearia-dynamic-v1.0.0";

// Arquivos essenciais para cache offline
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/shop.html",
  "/admin.html",
  "/confirmacao.html",
  "/initialize.html",
  "/css/style.css",
  "/js/firebase.js",
  "/js/auth.js",
  "/js/barbershops.js",
  "/js/appointments.js",
  "/js/admin.js",
  "/js/initialize.js",
  "/images/logo.png",
  "/manifest.json",
];

// Instala o Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalando...");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Service Worker: Cacheando arquivos estáticos");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Ativa o Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Ativando...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("Service Worker: Removendo cache antigo:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Intercepta requisições
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estratégia Cache First para arquivos estáticos
  if (
    STATIC_ASSETS.includes(url.pathname) ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
        .catch(() => {
          // Fallback para página offline se disponível
          if (request.destination === "document") {
            return caches.match("/index.html");
          }
        }),
    );
  }
  // Estratégia Network First para dados dinâmicos (Firebase)
  else if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache apenas respostas bem-sucedidas
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Tenta cache se offline
          return caches.match(request);
        }),
    );
  }
  // Estratégia Stale While Revalidate para outros recursos
  else {
    event.respondWith(
      caches.match(request).then((response) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });

        return response || fetchPromise;
      }),
    );
  }
});

// Notificações push (futuro)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/images/icon-192.png",
      badge: "/images/icon-192.png",
      vibrate: [100, 50, 100],
      data: data.data,
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Clique na notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
