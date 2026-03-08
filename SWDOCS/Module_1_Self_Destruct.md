# Module 1: Self-Destructing Messages

## Overview
This module enables self-destructing messages in the ChatWithUs system. Messages can have an expiration timer, after which they are permanently scrubbed from the database and replaced with a placeholder text: "Msg time expires".

### Key Features:
- **Timer Start**: The countdown begins as soon as the message is sent.
- **Global Policy**: A default expiration time can be set by administrators in the backend `settings.py`.
- **Custom Overrides**: Senders can select a specific timer for individual messages (e.g., 10 seconds, 1 minute, 1 hour).
- **Physical Clean-up**: A background task periodically scrubs content and deletes physical attachments.
- **Frontend Masking**: The UI instantly hides expired content based on client-side timestamps, providing a zero-delay experience.

## Configuration
The global default for message expiration is defined in:
`Main Application/core/settings.py`

```python
GLOBAL_MESSAGE_EXPIRATION_SECONDS = 86400  # Default: 24 hours
```

## Maintenance
To perform the actual scrubbing of expired messages, run the management command:
```bash
python manage.py cleanup_expired_messages
```
> [!TIP]
> It is recommended to run this command periodically via a cron job (e.g., every 5-10 minutes) for production environments.

## Licensing
This module is controlled by a specific license key.

- **License Flag**: `MODULE_SELF_DESTRUCT: ENABLED`
- **Enforcement**: 
    - **Backend**: License verification happens during WebSocket connection and message ingestion.
    - **Frontend**: The Timer dropdown and expiration logic are disabled/hidden if the module is not licensed.

### How to add to License file
When generating a license using the `CWU/generate_license_by_date.py` or `CWU/license_generator.py` scripts, ensure the `MODULE_SELF_DESTRUCT` field is set to `ENABLED`.

Example raw license block:
```txt
MODULE_SELF_DESTRUCT: ENABLED
MODULE_PTT: ENABLED
MODULE_MARKDOWN: ENABLED
```
