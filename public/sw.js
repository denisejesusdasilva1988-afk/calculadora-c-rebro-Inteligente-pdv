// Service Worker para a Calculadora Cérebro Inteligente (PWA)
// Incrementado para cerebro-pdv-v20: sincronização global de pátios, contagem exata de garrafas/kg e atalhos PWA
const CACHE_NAME = 'cerebro-pdv-v20';
const ASSETS_TO_CACHE = [
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png',
  './splash-screen.png'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Falha ao pré-cachear alguns itens, prosseguindo:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;
  const parsedUrl = new URL(url);
  const scopePathname = new URL(self.registration.scope).pathname;
  const normalizedPath = parsedUrl.pathname;

  if (
    normalizedPath.startsWith('/.well-known/') ||
    url.includes('/api/') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('chrome-extension:')
  ) {
    return;
  }
  const isNavigationOrShell =
    event.request.mode === 'navigate' ||
    normalizedPath === scopePathname ||
    normalizedPath === '/' ||
    normalizedPath.endsWith('/index.html') ||
    normalizedPath.endsWith('/version.json') ||
    normalizedPath.endsWith('/manifest.json');

  // Navegação, index.html e version.json SEMPRE usam Network-First para atualizar o atalho instalado na hora!
  if (isNavigationOrShell) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html') || caches.match(scopePathname) || caches.match('/');
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Bundles com hash (.js, .css, imagens): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Offline: Recurso indisponível sem conexão.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// --- WEB PUSH NOTIFICATION HANDLERS (WINDOWS / PC / CELULAR) ---

// Escuta o disparo do seu servidor com o texto do anúncio patrocinado
self.addEventListener('push', (event) => {
  let notificationData = {
    title: "Ofertas de Supermercados & Mercadinhos 🛒",
    message: "Confira os novos encartes e promoções do bairro!",
    icon: "/icon-192.png",
    url: "/?shortcut=encartes"
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      notificationData = {
        ...notificationData,
        ...parsed
      };
    } catch (e) {
      notificationData.message = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.message,
      icon: notificationData.icon || "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: {
        url: notificationData.url || '/?shortcut=encartes'
      },
      actions: [
        {
          action: "view-content",
          title: "Ver Ofertas 🛍️"
        },
        {
          action: "go-home",
          title: "Fechar ❌"
        }
      ]
    })
  );
});

// Controla o clique nos botões "Ver Ofertas" ou no balão da notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'go-home') return;

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/?shortcut=encartes';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
}, false);

// 3. Sincronização em Segundo Plano (Background Sync - Envio de dados pendentes)
self.addEventListener('sync', (event) => {
  if (event.tag === 'database-sync') {
    event.waitUntil(
      // Função responsável por sincronizar vendas/estoque offline
      pushLocalDataToDatabase()
    );
  }
});

// 4. Sincronização Periódica em Segundo Plano (Atualização diária do app)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'fetch-new-content') {
    event.waitUntil(
      fetchNewContent()
    );
  }
});

// Funções utilitárias auxiliares
async function pushLocalDataToDatabase() {
  console.log("Enviando dados gravados offline para o servidor...");
}

async function fetchNewContent() {
  console.log("Buscando novos encartes e ofertas atualizadas...");
}
