import os
import uuid
from datetime import datetime

import aiofiles
from fastapi import UploadFile


async def save_upload_file(
    upload_file: UploadFile,
    upload_dir: str,
    subdir: str = "",
) -> str:
    """Save an uploaded file to disk.

    Creates a unique filename to avoid collisions. Organizes files
    by date subdirectories.

    Args:
        upload_file: The FastAPI UploadFile object.
        upload_dir: Base upload directory path.
        subdir: Optional subdirectory (e.g. "invoices", "boms").

    Returns:
        The full path to the saved file.
    """
    date_dir = datetime.utcnow().strftime("%Y/%m")
    target_dir = os.path.join(upload_dir, subdir, date_dir)
    os.makedirs(target_dir, exist_ok=True)

    ext = ""
    if upload_file.filename:
        ext = os.path.splitext(upload_file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(target_dir, unique_name)

    async with aiofiles.open(file_path, "wb") as out_file:
        content = await upload_file.read()
        await out_file.write(content)

    return file_path
