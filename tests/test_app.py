from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.auth import COOKIE, hash_password
from app.main import create_app

ORIGIN = 'https://bilder.atlasdodo.com'
PASSWORD = 'test-password-long-enough'

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('APP_USERNAME', 'pontus')
    monkeypatch.setenv('APP_PASSWORD_HASH', hash_password(PASSWORD))
    monkeypatch.setenv('PUBLIC_URL', ORIGIN)
    with TestClient(create_app(), base_url=ORIGIN, follow_redirects=False) as client:
        yield client


def login(client):
    return client.post('/login', data={'username': 'pontus', 'password': PASSWORD}, headers={'origin': ORIGIN})


def png():
    buffer = BytesIO()
    Image.new('RGB', (32, 24), 'white').save(buffer, format='PNG')
    return buffer.getvalue()


def test_login_logout_and_replay(client):
    assert client.get('/').status_code == 303
    assert client.post('/api/images/analyze').status_code == 401
    assert client.get('/healthz').json() == {'status': 'ok'}
    assert client.get('/login').status_code == 200
    assert client.post('/login', data={'username': 'pontus', 'password': 'incorrect'}, headers={'origin': ORIGIN}).status_code == 401
    response = login(client)
    assert response.status_code == 303
    assert all(x in response.headers['set-cookie'] for x in ['HttpOnly', 'Secure', 'SameSite=strict'])
    assert client.get('/').status_code == 200
    token = client.cookies.get(COOKIE)
    assert client.post('/logout', headers={'origin': ORIGIN}).status_code == 303
    client.cookies.set(COOKIE, token)
    assert client.get('/').status_code == 303


@pytest.mark.parametrize('endpoint', ['/analyze','/convert/webp','/convert/webp/preview','/convert/ico','/transparent','/transparent/preview','/crop?width=12&height=12'])
def test_image_operations(client, endpoint):
    login(client)
    response = client.post('/api/images'+endpoint, files={'file': ('räv.png', png(), 'image/png')}, headers={'origin': ORIGIN})
    assert response.status_code == 200, response.text
    if response.headers['content-type'].startswith('image/'):
        with Image.open(BytesIO(response.content)) as image:
            image.load()
            assert image.width > 0


def test_origin_and_resource_limits(client):
    assert client.post('/login', data={'username':'pontus','password':PASSWORD}).status_code == 403
    login(client)
    for origin in ['https://evil.example','https://studio.atlasdodo.com']:
        assert client.post('/api/images/analyze', headers={'origin': origin}).status_code == 403
    assert client.post('/api/images/analyze', content=b'x'*(21*1024*1024+1), headers={'origin':ORIGIN}).status_code == 413
    for endpoint in ['/analyze','/crop?width=999999','/convert/webp?resize_percent=999999']:
        data = b'not an image' if endpoint == '/analyze' else png()
        assert client.post('/api/images'+endpoint, files={'file': ('a.png',data,'image/png')}, headers={'origin':ORIGIN}).status_code == 400


def test_rate_limit_and_forged_cookie(client):
    client.cookies.set(COOKIE, 'forged')
    assert client.get('/').status_code == 303
    client.app.state.auth.attempts.extend([__import__('time').monotonic()]*30)
    assert login(client).status_code == 429


def test_expired_session(client):
    login(client)
    client.app.state.auth.sessions[client.cookies.get(COOKIE)] = 0
    assert client.get('/').status_code == 303


def test_missing_configuration(monkeypatch):
    monkeypatch.delenv('PUBLIC_URL', raising=False)
    with pytest.raises(ValueError):
        create_app()


def test_pixel_limit_and_oversize_file(client):
    login(client)
    buffer = BytesIO()
    Image.new('1', (4001, 4000)).save(buffer, format='PNG')
    response = client.post('/api/images/analyze', files={'file': ('large.png', buffer.getvalue(), 'image/png')}, headers={'origin':ORIGIN})
    assert response.status_code == 400
    response = client.post('/api/images/analyze', files={'file': ('large.png', b'x'*(20*1024*1024+1), 'image/png')}, headers={'origin':ORIGIN})
    assert response.status_code == 413


def test_header_encoding():
    from app.image_tools.validation import download_header
    header = download_header('räv"\r\n.png')
    assert '\r' not in header and '\n' not in header
    assert '%C3%A4' in header
