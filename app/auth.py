"""Single-instance private login: server-side sessions and bounded requests."""
import hashlib
import hmac
import secrets
import time
from collections import deque
from urllib.parse import urlsplit

from starlette.requests import Request
from starlette.responses import JSONResponse, RedirectResponse

COOKIE = "image_tool_session"
SESSION_SECONDS = 12 * 60 * 60
MAX_BODY = 21 * 1024 * 1024


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return f"scrypt:{salt}:{digest}"


class Auth:
    def __init__(self, username, password_hash, public_url):
        parts = urlsplit(public_url)
        if parts.scheme not in ("https", "http") or not parts.netloc or parts.path not in ("", "/"):
            raise ValueError("PUBLIC_URL måste vara en fullständig adress utan sökväg.")
        if parts.scheme != "https" and parts.hostname not in ("127.0.0.1", "localhost"):
            raise ValueError("PUBLIC_URL måste använda HTTPS utom vid lokal testning.")
        try:
            algorithm, salt, digest = password_hash.split(":")
            assert algorithm == "scrypt" and len(bytes.fromhex(salt)) == 16 and len(bytes.fromhex(digest)) == 64
        except (ValueError, AssertionError):
            raise ValueError("Ogiltig APP_PASSWORD_HASH. Kör python make_password.py.") from None
        if not username:
            raise ValueError("APP_USERNAME saknas.")
        self.username, self.password_hash = username, password_hash
        self.origin = f"{parts.scheme}://{parts.netloc}"
        self.secure = parts.scheme == "https"
        self.sessions = {}
        self.attempts = deque()

    def authenticated(self, request):
        now = time.monotonic()
        self.sessions = {key: expiry for key, expiry in self.sessions.items() if expiry > now}
        return request.cookies.get(COOKIE) in self.sessions

    def allow_attempt(self):
        now = time.monotonic()
        while self.attempts and self.attempts[0] < now - 900:
            self.attempts.popleft()
        if len(self.attempts) >= 30:
            return False
        self.attempts.append(now)
        return True

    def verify(self, username, password):
        # Perform the expensive check even for incorrect usernames.
        valid_password = hmac.compare_digest(hash_password(password, self.password_hash.split(":")[1]), self.password_hash)
        return hmac.compare_digest(username.encode(), self.username.encode()) and valid_password

    def login(self):
        if len(self.sessions) >= 100:
            self.sessions.pop(next(iter(self.sessions)))
        token = secrets.token_urlsafe(32)
        self.sessions[token] = time.monotonic() + SESSION_SECONDS
        response = RedirectResponse("/", status_code=303)
        response.set_cookie(COOKIE, token, max_age=SESSION_SECONDS, secure=self.secure, httponly=True, samesite="strict")
        return response

    def logout(self, request):
        self.sessions.pop(request.cookies.get(COOKIE), None)
        response = RedirectResponse("/login", status_code=303)
        response.delete_cookie(COOKIE, secure=self.secure, httponly=True, samesite="strict")
        return response


class SecurityMiddleware:
    def __init__(self, app, auth):
        self.app, self.auth = app, auth

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        request = Request(scope)
        path = scope["path"]

        async def secured_send(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message["headers"]) + [
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"same-origin"),
                ]
            await send(message)

        public = path in ("/login", "/healthz") or path.startswith("/static/")
        if not public and not self.auth.authenticated(request):
            response = JSONResponse({"detail": "Logga in för att fortsätta."}, status_code=401) if path.startswith("/api/") else RedirectResponse("/login", status_code=303)
            return await response(scope, receive, secured_send)
        if scope["method"] not in ("GET", "HEAD", "OPTIONS"):
            # Exact-origin protection also blocks other atlasdodo.com subdomains.
            if request.headers.get("origin") != self.auth.origin:
                return await JSONResponse({"detail": "Ogiltigt ursprung."}, status_code=403)(scope, receive, secured_send)
            limit = 8192 if path in ("/login", "/logout") else MAX_BODY
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > limit:
                    return await JSONResponse({"detail": "Filen är för stor. Max 20 MB."}, status_code=413)(scope, receive, secured_send)
                if not message.get("more_body", False):
                    break
            delivered = False

            async def replay():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            return await self.app(scope, replay, secured_send)
        await self.app(scope, receive, secured_send)
