(function() {
    // 1. Check if config was statically inlined into the HTML
    const configElement = document.getElementById('chat-config');
    if (configElement && configElement.textContent.trim()) {
        try {
            window.CHAT_CONFIG = JSON.parse(configElement.textContent);
            window.CHAT_F_CONFIG = window.CHAT_CONFIG;
            return;
        } catch (e) {
            console.warn('Could not parse inline chat config, falling back to /api/chat/config:', e);
        }
    }

    // 2. Otherwise, dynamically fetch /api/chat/config from Host Backend (same procedure as React)
    fetch('/api/chat/config', { credentials: 'same-origin' })
        .then(res => {
            if (!res.ok) throw new Error('Failed to retrieve chat configuration');
            return res.json();
        })
        .then(config => {
            window.CHAT_CONFIG = config;
            window.CHAT_F_CONFIG = config;

            // Dynamically mount Chat Widget script if not already present
            const scriptId = 'chat-widget-loader';
            if (!document.getElementById(scriptId)) {
                const script = document.createElement('script');
                script.id = scriptId;
                script.src = '/static/chat/ChatWithUsWid.js?v=' + Date.now();
                script.type = 'module';
                script.async = true;
                document.body.appendChild(script);
            }
        })
        .catch(err => {
            console.error('[ChatWidget] Initialization failed:', err);
        });
})();
