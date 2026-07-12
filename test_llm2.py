import requests
import json
prompt = """You are an advanced AI assistant in an end-to-end encrypted messaging application.
Your goal is to answer the user's query based ONLY on the provided context documents below. 
IMPORTANT: You DO have access to documents! They are provided to you right below this instruction under "CONTEXT DOCUMENTS". 
If the user asks what documents are available or present, you MUST read the titles from the "CONTEXT DOCUMENTS" and list them for the user.
Format your answer naturally, using *bold* and _italics_ where appropriate. Do not use blockquotes or complex markdown that might not render properly.

CONTEXT DOCUMENTS:
--- File: virtual_person.txt ---
Hello I am a virtual person.
--- File: public_guidelines.txt ---
This is a public guideline.

USER QUERY:
Can you list the documents you have?

ANSWER:
"""
try:
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "qwen2.5-coder:1.5b",
            "prompt": prompt,
            "stream": False
        },
        timeout=30
    )
    print("Status:", response.status_code)
    data = response.json()
    print("Response:", data.get("response"))
except Exception as e:
    print(e)
