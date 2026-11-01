import os
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.auth import Auth, SecurityMiddleware
from app.routes.images import router as images_router

BASE = Path(__file__).resolve().parent


def create_app():
    auth = Auth(os.environ.get("APP_USERNAME", ""), os.environ.get("APP_PASSWORD_HASH", ""), os.environ.get("PUBLIC_URL", ""))
    app = FastAPI(title="Atlas & Dodo – Bildverktyg", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.auth = auth
    app.add_middleware(SecurityMiddleware, auth=auth)
    app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
    templates = Jinja2Templates(directory=BASE / "templates")
    app.include_router(images_router)

    @app.get("/healthz")
    async def health():
        return {"status": "ok"}

    @app.get("/login")
    async def login_page(request: Request):
        return templates.TemplateResponse(request=request, name="login.html", context={"error": None})

    @app.post("/login")
    async def login(request: Request, username: str = Form(..., max_length=128), password: str = Form(..., max_length=1024)):
        if not auth.allow_attempt():
            return templates.TemplateResponse(request=request, name="login.html", context={"error": "För många inloggningsförsök. Försök igen om 15 minuter."}, status_code=429)
        if not auth.verify(username, password):
            return templates.TemplateResponse(request=request, name="login.html", context={"error": "Fel användarnamn eller lösenord."}, status_code=401)
        return auth.login()

    @app.post("/logout")
    async def logout(request: Request):
        return auth.logout(request)

    @app.get("/")
    async def home(request: Request):
        return templates.TemplateResponse(request=request, name="index.html")

    return app
