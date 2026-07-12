from django.apps import AppConfig
from django.db.models.signals import post_migrate

class AichatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'aichat'

    def ready(self):
        # Setup post_migrate signal to initialize AI Assistant user and keypair
        from .services import init_ai_assistant
        
        def scaffold_ai_assistant(sender, **kwargs):
            try:
                init_ai_assistant()
            except Exception:
                # Silently catch exceptions during testing/db-creation
                pass
                
        post_migrate.connect(scaffold_ai_assistant, sender=self)
