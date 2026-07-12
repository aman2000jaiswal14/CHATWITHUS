import json

line = r"^[A-Za-z0-9\s.,!?'\"@_\-+*~\\`{}()<>[\]]+$"
parsed_data = {"ALLOWED_CHARS": line}
print("Original:")
print(line)
print("JSON:")
print(json.dumps(parsed_data))
