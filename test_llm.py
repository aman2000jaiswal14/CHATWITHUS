import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'Main Application'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'WCA.settings')
import django
django.setup()

from aichat.llm import OllamaLLMEngine
from aichat.security import DocumentSecurityManager
from django.contrib.auth import get_user_model

User = get_user_model()
try:
    user = User.objects.get(username='user1')
except User.DoesNotExist:
    user = User.objects.first()

permitted_files = DocumentSecurityManager.get_permitted_files(user)
print("Permitted files:", permitted_files)

response = OllamaLLMEngine.answer_query("Can you list the documents you have?", permitted_files)
print("Response:", response)

