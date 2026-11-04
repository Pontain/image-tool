# Atlas & Dodo Image Tool

An authenticated image-processing utility originally built to prepare artwork and game assets for the Atlas & Dodo project. It supports image analysis, WebP and ICO conversion, transparency handling, and cropping. The service is configured for Railway and the `image-tool.atlasdodo.com` subdomain.

## Features and security

- Image analysis, WebP and ICO conversion, transparency handling, and cropping.
- Login and logout. All image-processing APIs require authentication.
- Single account with no self-service registration. Server-side sessions expire after 12 hours.
- HttpOnly, Secure, and SameSite cookies; origin checks on POST requests; passwords hashed with scrypt.
- A limit of 30 login attempts across all users in each 15-minute period.
- Supports PNG, JPEG, and WebP files up to 20 MiB and 16 megapixels. Resizing only reduces image dimensions, and cropping is limited to the image boundaries.
- Images are processed temporarily in memory or in multipart parser temporary files. No image archive is stored.

## 1. Repository and service

The source code is in the `Pontain/image-tool` repository. Deploy it as a dedicated Railway service from this repository. The Dockerfile, `requirements.txt`, `railway.json`, and `app/` directory are at the repository root.

## 2. Set up login locally

Run these commands in PowerShell from the project directory:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe make_password.py
```

Enter your chosen password twice when prompted. The password will not be shown in the terminal.

Save the password in your password manager. Copy the generated hash to Railway. Do not commit the password or hash to GitHub or share them in chat.

Python 3.12 is the version used by the Docker image and for local testing.

## 3. Configure Railway

The dedicated Railway service builds the app from the repository's Dockerfile. Add the following variables under the service's **Variables**:

| Variable | Value |
| --- | --- |
| `APP_USERNAME` | Your chosen username, for example `pontus` |
| `APP_PASSWORD_HASH` | The complete value beginning with `scrypt:` generated in step 2 |
| `PUBLIC_URL` | `https://image-tool.atlasdodo.com` |

Let the Dockerfile provide the startup command. It uses Railway's `PORT` variable.

The health check endpoint is `/healthz`. Keep **one replica and one worker** because sessions and login rate limiting are stored in process memory. A restart or deployment signs out all users.

This version does not need a database or persistent volume.

The app will not start if the required settings are missing or the password hash is invalid. To change the password, generate a new hash, update the variable, and redeploy.

If you need multiple user accounts or replicas, move session storage and login rate limiting to shared storage first.

## 4. Configure the Cloudflare subdomain

1. Add `image-tool.atlasdodo.com` as a custom domain on the new Railway service.
2. Railway will show the required DNS records. Copy its exact CNAME target and any TXT verification record to the Cloudflare DNS settings for `atlasdodo.com`.
3. Use **DNS only** for the new CNAME record during initial setup. Do not change the DNS records for the root domain, `www`, or `studio`.
4. Wait for Railway to verify the domain and issue the HTTPS certificate.
5. Open `https://image-tool.atlasdodo.com`, sign in, and test image upload and download, then sign out.

To test with Railway's generated domain, temporarily set `PUBLIC_URL` to the exact HTTPS address you open. Change it back to the subdomain afterward. The app accepts POST requests only from the configured address, so signing in through another domain will be rejected.

## Run locally

Set the three environment variables in the same PowerShell window:

```powershell
$env:APP_USERNAME = "pontus"
$env:APP_PASSWORD_HASH = Read-Host "Paste your scrypt hash"
$env:PUBLIC_URL = "http://127.0.0.1:8000"
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

Open exactly `http://127.0.0.1:8000`. The `.env.example` file is a template; the app reads environment variables and does not load a `.env` file automatically.

HTTPS is required for addresses other than `localhost` and `127.0.0.1`.

## Tests and limitations

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests -q
```

The tests cover login, logout and replay of a logged-out cookie, forged or expired sessions, unauthorized API requests, origin protection, login rate limiting, image operations, invalid input, and file size limits.

The Docker build, Railway deployment, live DNS and HTTPS, and visual browser testing must be verified during deployment. CropperJS assets are loaded from jsDelivr, so the cropping interface requires access to that CDN.

## Official documentation

- https://docs.railway.com/builds/dockerfiles
- https://docs.railway.com/networking/domains/working-with-domains
