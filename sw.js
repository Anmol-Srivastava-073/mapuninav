const CACHE_NAME = 'manipal-uninav-cache-v4';
const TILES_CACHE_NAME = 'manipal-uninav-tiles-v4';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/image/weblogo.png',
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME, TILES_CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => {
                if (!cacheWhitelist.includes(cacheName)) return caches.delete(cacheName);
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Never intercept API calls — pass straight to network
    if (requestUrl.pathname.startsWith('/api/')) {
        return;
    }

    if (event.request.url.startsWith('http')) {
        if (requestUrl.hostname.includes('tile.openstreetmap.org') || requestUrl.hostname.includes('basemaps.cartocdn.com')) {
            event.respondWith(
                caches.open(TILES_CACHE_NAME).then(cache => {
                    return cache.match(event.request).then(response => {
                        if (response) return response;
                        return fetch(event.request).then(networkResponse => {
                            if (networkResponse.status === 200) {
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        }).catch(() => new Response("Tile unavailable offline", { status: 503 }));
                    });
                })
            );
        } else {
            event.respondWith(
                caches.match(event.request).then((response) => {
                    return response || fetch(event.request).catch(() => {
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html') || caches.match('/');
                        }
                    });
                })
            );
        }
    }
});

self.addEventListener('message', (event) => {
    if (event.data.type === 'PREFETCH_TILES') {
        const { bbox, zooms, tileUrlTemplate } = event.data;
        const tileUrls = buildTileURLList(bbox, zooms, tileUrlTemplate);
        const total = tileUrls.length;
        let done = 0;

        event.source.postMessage({ type: 'PREFETCH_PROGRESS', done, total });

        Promise.all(
            tileUrls.map(url => {
                return caches.open(TILES_CACHE_NAME).then(cache => {
                    return fetch(url).then(response => {
                        if (response.status === 200) cache.put(url, response.clone());
                        done++;
                        event.source.postMessage({ type: 'PREFETCH_PROGRESS', done, total });
                    }).catch(e => {
                        console.warn(`Failed to prefetch tile: ${url}`, e);
                        done++;
                        event.source.postMessage({ type: 'PREFETCH_PROGRESS', done, total });
                    });
                });
            })
        ).then(() => event.source.postMessage({ type: 'PREFETCH_DONE' }))
         .catch(err => console.error('Prefetching failed:', err));
    }
});

function lon2tile(lon, zoom) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function lat2tile(lat, zoom) {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    return Math.floor(n * (1 - (Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI)) / 2);
}

function buildTileURLList(bbox, zooms, template) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const SUBDOMAINS = ['a', 'b', 'c'];
    const urls = [];

    for (const z of zooms) {
        const xMin = lon2tile(minLon, z);
        const xMax = lon2tile(maxLon, z);
        const yMin = lat2tile(maxLat, z);
        const yMax = lat2tile(minLat, z);

        for (let x = xMin; x <= xMax; x++) {
            for (let y = yMin; y <= yMax; y++) {
                const s = SUBDOMAINS[(x + y) % SUBDOMAINS.length];
                const url = template.replace('{s}', s).replace('{z}', z).replace('{x}', x).replace('{y}', y);
                urls.push(url);
            }
        }
    }
    return urls;
}
