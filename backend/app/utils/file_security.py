import os
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, UploadFile
from app.config import MAX_UPLOAD_SIZE_BYTES

ALLOWED_EXTENSIONS = {".csv"}

def validate_and_save_upload(
    upload_file: UploadFile,
    target_dir: Path
) -> Tuple[Path, int]:
    """
    Validates uploaded file against size limits, file extensions,
    and writes securely to disk.
    """
    filename = upload_file.filename or "uploaded.csv"
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Only CSV (.csv) files are supported."
        )

    # Sanitize filename
    safe_name = "".join(c for c in filename if c.isalnum() or c in ("-", "_", ".")).strip()
    if not safe_name:
        safe_name = "network_data.csv"

    target_dir.mkdir(parents=True, exist_ok=True)
    destination = target_dir / safe_name

    # Handle collision
    counter = 1
    base_stem = destination.stem
    while destination.exists():
        destination = target_dir / f"{base_stem}_{counter}{destination.suffix}"
        counter += 1

    total_bytes = 0
    with open(destination, "wb") as out_file:
        while True:
            chunk = upload_file.file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                out_file.close()
                if destination.exists():
                    os.remove(destination)
                raise HTTPException(
                    status_code=413,
                    detail=f"Uploaded file exceeds maximum allowed size ({MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB)."
                )
            out_file.write(chunk)

    return destination, total_bytes
