from django.core.management.base import BaseCommand
from django.utils import timezone
from chat.models import Message, MessageAttachment
from chat.services.encryption import encryption_service

class Command(BaseCommand):
    help = 'Self-Destructs expired messages by scrubbing their content from the DB.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        
        # Scrub expiring messages
        expired_msgs = Message.objects.filter(is_expired=False, expires_at__lte=now)
        msg_count = expired_msgs.count()
        
        for msg in expired_msgs:
            # We assign the plaintext, the model's `save()` method will encrypt it
            msg.content = "Msg time expires"
            msg.is_expired = True
            msg.save()
            
        # Scrub expiring attachments
        expired_atts = MessageAttachment.objects.filter(is_expired=False, expires_at__lte=now)
        att_count = expired_atts.count()
        
        for att in expired_atts:
            # Delete physical file
            if att.file:
                att.file.delete(save=False)
            
            # Scrub metadata (the model save() encrypts this)
            att.file_name = "Msg time expires"
            att.file_type = "Msg time expires"
            att.is_expired = True
            att.save()
            
        self.stdout.write(self.style.SUCCESS(f'Successfully scrubbed {msg_count} messages and {att_count} attachments.'))
