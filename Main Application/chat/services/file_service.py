import os
from django.core.exceptions import ValidationError

ALLOWED_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.docx', '.pptx', '.xlsx', 
    '.zip', '.txt', '.csv', '.xml', '.json', '.ods',
    '.webm', '.mp3', '.mp4', '.ogg', '.wav', '.m4a'
}

def validate_attachment(uploaded_file):
    """
    Validates the file extension and type of an uploaded attachment.
    """
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"File extension {ext} not allowed.")
    
    # We could also check MIME type here if python-magic was installed,
    # but extension check is a strong first line of defense.
    return True
