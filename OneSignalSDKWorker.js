importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Take control immediately on every update, instead of waiting for every open
// tab on this site to be closed first. Without this, a freshly deployed worker
// file can sit "installed but not active" for a while, so the OLD version
// (without the logging below) keeps handling pushes — which is why a push can
// arrive right after a deploy and still not show up in the bell.
self.addEventListener('install', function (event) { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });

// Also record every push into IndexedDB, so AURA's in-app notification bell
// can show a history of announcements received even while the app was fully
// closed. Service workers have no access to localStorage or the app's own
// code, so this is the only place that history can be captured from — the
// main app reads and clears this store the next time it opens.
// OneSignal's own worker code above still handles showing the actual
// notification on the phone; this only additionally logs it for our UI.
self.addEventListener('push', function (event) {
    var title = 'AURA', body = '';
    try {
        var data = event.data ? event.data.json() : {};
        title = data.title || (data.notification && data.notification.title) || title;
        body  = data.alert || data.body || (data.notification && (data.notification.body || data.notification.alert)) || '';
    } catch (e) {}

    event.waitUntil((async function () {
        try {
            var db = await new Promise(function (resolve, reject) {
                var req = indexedDB.open('aura-notif-db', 1);
                req.onupgradeneeded = function () { req.result.createObjectStore('inbox', { keyPath: 'id' }); };
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { reject(req.error); };
            });
            var tx = db.transaction('inbox', 'readwrite');
            tx.objectStore('inbox').put({
                id: Date.now() + '-' + Math.random().toString(36).slice(2),
                title: title, body: body, ts: Date.now()
            });
        } catch (e) { /* best-effort — never block the real notification from showing */ }
    })());
});
