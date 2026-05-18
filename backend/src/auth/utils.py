import hashlib

def hash_password(password: str):
    coder = hashlib.new("sha256")
    coder.update(password.encode(encoding="utf-8"))
    return coder.hexdigest()