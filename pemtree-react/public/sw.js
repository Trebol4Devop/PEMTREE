self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let data = { title: 'PEMTREE', body: '', url: '/foro' };
    try {
        if (event.data) {
            const parsed = event.data.json();
            data = {
                title: parsed.title || 'PEMTREE',
                body: parsed.body || '',
                url: parsed.url || '/foro'
            };
        }
    } catch {
        if (event.data) {
            data.body = event.data.text() || '';
        }
    }

    const options = {
        body: data.body,
        icon: '/images/logo_trebol.png',
        badge: '/images/logo_trebol.png',
        data: { url: data.url },
        tag: 'pemtree-forum'
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = event.notification.data?.url || '/foro';
    const url = new URL(target, self.location.origin).toString();

    event.waitUntil((async () => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
            if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
                client.focus();
                if ('navigate' in client) {
                    await client.navigate(url);
                }
                return;
            }
        }
        await self.clients.openWindow(url);
    })());
});
