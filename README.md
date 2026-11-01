# Atlas & Dodo – Bildverktyg på Railway

Förberedd för `https://image-tool.atlasdodo.com`. Domänen är ett förslag och kan ändras.
Paketet är lokalt testat men inte publicerat. Railway-anslutning och DNS återstår.

## Vad som ingår

- Befintliga funktioner: analys, WebP, ICO, transparens och beskärning.
- Privat inloggningssida och Logga ut. Alla bild-API:er kräver inloggning.
- Ett konto, utan registrering. Slumpmässiga sessioner på servern, max 12 timmar.
- HttpOnly/Secure/SameSite-cookie, ursprungskontroll på POST och lösenordshash med scrypt.
- Max 30 inloggningsförsök totalt per 15 minuter. Begränsningen gäller alla användare tillsammans.
- PNG, JPEG och WebP; max 20 MiB och 16 miljoner pixlar. Endast förminskning, beskärning inom bilden.
- Bilder bearbetas tillfälligt i minnet eller multipart-parserns temporära filer. Inget bildarkiv sparas.

## 1. Lägg upp projektet

Packa upp zipfilen till en egen projektmapp och öppna den i VS Code.
`Dockerfile`, `requirements.txt`, `railway.json` och mappen `app/` ska ligga i repots rot.
Lägg projektet i ett separat privat GitHub-repo. Lägg inte in det som ersättning för huvudwebbplatsen.

## 2. Välj inloggning lokalt

Kör i PowerShell i projektmappen:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe make_password.py
```

Du får skriva ett eget lösenord två gånger. Inmatningen syns inte i terminalen.
Spara lösenordet i din lösenordshanterare. Kopiera den genererade hashen till Railway;
lägg inte lösenord eller hash i GitHub eller i chatten.
Python 3.12 är versionen som används i Docker och lokal testning.

## 3. Railway

Skapa en separat tjänst från repot. Dockerfile bygger appen automatiskt.
Lägg till följande under tjänstens Variables:

| Variabel | Värde |
| --- | --- |
| `APP_USERNAME` | Ditt valda användarnamn, exempelvis `pontus` |
| `APP_PASSWORD_HASH` | Hela värdet som börjar med `scrypt:` från steg 2 |
| `PUBLIC_URL` | `https://image-tool.atlasdodo.com` |

Låt Dockerfile sköta startkommandot. Den använder Railways `PORT`.
Healthcheck är `/healthz`. Behåll **en replica och en worker**: sessioner och
inloggningsbegränsning finns i processminnet. Omstart/deploy loggar ut alla.
Ingen databas eller persistent volume behövs för denna version.

Appen vägrar starta om inställningarna saknas eller lösenordshashen är felaktig.
Vid byte av lösenord: generera ny hash, ändra variabeln och deploya om.
Om fler separata användarkonton eller flera repliker behövs ska sessioner och
inloggningsbegränsning först flyttas till gemensam lagring.

## 4. Subdomän i Cloudflare

1. Lägg till `image-tool.atlasdodo.com` som Custom Domain på den nya Railway-tjänsten.
2. Railway visar DNS-posterna som krävs. Kopiera exakt dess CNAME-mål och eventuell TXT-verifiering till Cloudflares DNS för atlasdodo.com.
3. Använd DNS only för den nya CNAME-posten under första installationen. Ändra inte rotens, www:s eller studio:s DNS-poster.
4. Vänta tills Railway har verifierat domänen och HTTPS-certifikatet är klart.
5. Öppna `https://image-tool.atlasdodo.com`, logga in och prova uppladdning/nedladdning samt Logga ut.

För test på Railways genererade domän: sätt tillfälligt `PUBLIC_URL` till exakt
HTTPS-adressen du öppnar. Byt sedan tillbaka till subdomänen. Appen godtar POST
endast från den konfigurerade adressen, så inloggning via en alternativ domän avvisas.

## Lokal körning

Sätt de tre miljövariablerna i samma PowerShell-fönster:

```powershell
$env:APP_USERNAME = "pontus"
$env:APP_PASSWORD_HASH = Read-Host "Klistra in din scrypt-hash"
$env:PUBLIC_URL = "http://127.0.0.1:8000"
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

Öppna exakt `http://127.0.0.1:8000`. `.env.example` är en mall;
appen läser miljövariabler, den laddar inte en `.env`-fil automatiskt.
HTTPS krävs för andra adresser än localhost/127.0.0.1.

## Tester och begränsningar

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests -q
```

Tester täcker inloggning, utloggning och återspelning av utloggad cookie,
förfalskad/utgången session, obehöriga API-anrop, origin-skydd,
inloggningsbegränsning, bildoperationer och felaktiga indata/storleksgränser.
Dockerbygge, Railway-deploy, riktig DNS/HTTPS och visuell webbläsartestning
måste verifieras vid driftsättningen. Befintliga CropperJS-resurser laddas från
jsDelivr; beskärningens gränssnitt behöver tillgång till denna CDN.

## Officiell dokumentation

- https://docs.railway.com/builds/dockerfiles
- https://docs.railway.com/networking/domains/working-with-domains
