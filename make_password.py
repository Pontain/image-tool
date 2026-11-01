"""Run locally; paste only the generated hash into Railway Variables."""
from getpass import getpass
from app.auth import hash_password

if __name__ == "__main__":
    password = getpass("Välj lösenord (minst 14 tecken): ")
    if len(password) < 14:
        raise SystemExit("Använd minst 14 tecken.")
    if password != getpass("Upprepa lösenordet: "):
        raise SystemExit("Lösenorden matchar inte.")
    print("\nAPP_PASSWORD_HASH=" + hash_password(password))
