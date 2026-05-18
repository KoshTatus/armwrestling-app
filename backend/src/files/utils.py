import datetime
import os
import pathlib
from fastapi import UploadFile
import hashlib

PATH = f"{pathlib.Path(__file__).parent}/uploads"

def generate_random_value(filename: str) -> str:
    coder = hashlib.new("sha256")
    time = datetime.datetime.now(datetime.UTC)
    coder.update((str(time) + filename).encode(encoding="utf-8"))
    return coder.hexdigest()

def save_upload_file(file: UploadFile) -> str:
    filename = file.filename
    filename_hash = generate_random_value(file.filename)
    path = f"{PATH}/{filename_hash}{filename[filename.rfind('.'):]}"

    try:
        with open(path, "wb+") as destination:
            destination.write(file.file.read())
    finally:
        file.file.close()

    return path

def delete_file(
        filepath: str
):
    try:
        os.remove(filepath)
    except FileNotFoundError:
        raise FileNotFoundError("File is missing!")