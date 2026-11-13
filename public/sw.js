// Service Worker para a Calculadora Cérebro Inteligente (PWA)
// Incrementado para cerebro-pdv-v7: Network-First para HTML/navegação/versão garantindo atualização imediata no app instalado
const CACHE_NAME = 'cerebro-pdv-v7';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-192-maskable.png',
  '/assets/icons/icon-512-maskable.png',
  '/splash-screen.png'
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
  if (
    url.includes('/api/') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('chrome-extension:')
  ) {
    return;
  }

  const parsedUrl = new URL(url);
  const isNavigationOrShell =
    event.request.mode === 'navigate' ||
    parsedUrl.pathname === '/' ||
    parsedUrl.pathname === '/index.html' ||
    parsedUrl.pathname === '/version.json' ||
    parsedUrl.pathname === '/manifest.json';

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
              return caches.match('/index.html') || caches.match('/');
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
    title: "Anúncio Local",
    message: "Nova promoção no bairro!",
    icon: "/icon-192.png"
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
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
        url: '/'
      },
      actions: [
        {
          action: "view-content",
          title: "Ver Promoção 🛍️"
        },
        {
          action: "go-home",
          title: "Fechar ❌"
        }
      ]
    })
  );
});

// Controla o clique nos botões "Ver Promoção" ou "Fechar" direto pelo balão do Windows/Celular
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Fecha o balão de alerta automaticamente

  if (event.action === 'view-content') {
    // Redireciona o usuário para a página de encartes ou ofertas do comércio
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  } else {
    // Apenas leva para a home do aplicativo
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
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
