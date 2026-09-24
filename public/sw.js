// Service Worker para a Calculadora Cérebro Inteligente (PWA)
// IMPORTANTE: Se você atualizar os ícones (/public/icon-192.png, /public/icon-512.png, etc.), 
// incremente o número da versão abaixo (ex: cerebro-pdv-v3, v4) para forçar o navegador a recarregar as novas imagens!
const CACHE_NAME = 'cerebro-pdv-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
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
  '/screenshot-desktop.png',
  '/screenshot-mobile.png',
  '/screenshot-1.png',
  '/screenshot-2.png',
  '/screenshot-3.png',
  '/screenshot-4.png',
  '/screenshot-5.png',
  '/screenshot-6.png',
  '/screenshot-7.png',
  '/screenshot-8.png',
  '/splash-screen.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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
  // Ignora chamadas de API, Firebase e rotas do servidor Express
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback para quando estiver offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
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
