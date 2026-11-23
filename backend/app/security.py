import os
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

password_hash = PasswordHasher()

def verify_password(password: str, digest: str) -> bool:
    try:
        return password_hash.verify(digest, password)
    except (VerifyMismatchError, VerificationError):
        return False
bearer = HTTPBearer(auto_error=False)

def jwt_secret() -> str:
    secret = os.getenv('JWT_SECRET', '')
    if len(secret.strip().encode('utf-8')) < 32 or secret in {
        'replace-with-a-long-random-secret', 'replace-with-a-long-random-secret-at-least-32-characters',
    }:
        raise RuntimeError('Configure a random JWT_SECRET of at least 32 bytes in backend/.env.')
    return secret

def make_token(user_id: int) -> str:
    duration = int(os.getenv('ACCESS_TOKEN_MINUTES', '120'))
    return jwt.encode({'sub': str(user_id), 'exp': datetime.now(timezone.utc) + timedelta(minutes=duration)}, jwt_secret(), algorithm='HS256')

def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired session', headers={'WWW-Authenticate': 'Bearer'})
    if creds is None:
        raise unauthorized
    try:
        data = jwt.decode(creds.credentials, jwt_secret(), algorithms=['HS256'], options={'require': ['sub', 'exp']})
        uid = int(data['sub'])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise unauthorized
    user = db.get(User, uid)
    if not user:
        raise unauthorized
    return user
