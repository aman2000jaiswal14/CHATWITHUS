(function() {
    const configElement = document.getElementById('chat-config');
    if (configElement) {
        try {
            window.CHAT_CONFIG = JSON.parse(configElement.textContent);
        } catch (e) {
            console.error('Failed to parse chat config:', e);
        }
    }
})();
