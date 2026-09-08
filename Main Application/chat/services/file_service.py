import os
from django.core.exceptions import ValidationError
from django.conf import settings

# Strictly allowed extensions (removed .xml to prevent XXE / XSS)
ALLOWED_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.docx', '.pptx', '.xlsx', 
    '.zip', '.txt', '.csv', '.json', '.ods',
    '.webm', '.mp3', '.mp4', '.ogg', '.wav', '.m4a'
}

# Known executable and malicious file header signatures
DANGEROUS_SIGNATURES = [
    (b'MZ', 'Windows Executable / Binary'),
    (b'\x7fELF', 'Linux Executable / Binary'),
    (b'#!', 'Shell / Interpreter Script'),
    (b'\xca\xfe\xba\xbe', 'Java Bytecode Class'),
]

def validate_attachment(uploaded_file):
    """
    Validates the file size, extension, and content signatures of an uploaded attachment.
    """
    # 1. Size Validation
    max_size = getattr(settings, 'MAX_FILE_UPLOAD_SIZE', 52428800)  # Default 50MB
    if uploaded_file.size > max_size:
        max_mb = max_size // (1024 * 1024)
        raise ValidationError(f"File size exceeds maximum allowed limit of {max_mb}MB.")
    
    if uploaded_file.size <= 0:
        raise ValidationError("Uploaded file cannot be empty.")

    # 2. Extension Validation
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"File extension '{ext}' not allowed.")
    
    # 3. Magic-Byte Inspection (detect executable / script payloads)
    try:
        header = uploaded_file.read(512)
        uploaded_file.seek(0) # Reset stream pointer for subsequent saving!
    except Exception:
        header = b''

    for sig, sig_name in DANGEROUS_SIGNATURES:
        if header.startswith(sig):
            raise ValidationError(f"Disallowed binary / executable payload detected ({sig_name}).")

    # Detect embedded PHP or HTML script tags in disguised files
    header_lower = header.lower()
    if b'<?php' in header_lower or b'<script' in header_lower:
        raise ValidationError("Disallowed executable script content detected in file.")

    return True
