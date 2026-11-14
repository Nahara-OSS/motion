# Service worker

Service worker acts like a proxy between client and server.

On desktop target, there is no need for service worker, because the server is always available. On browser target,
however, the service worker may be used to emulate the server, especially when offline (with the exception of WebSocket,
which to this day can't be proxied by service worker).
