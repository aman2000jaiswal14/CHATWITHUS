// Private in-memory module closure for token storage (isolated from window & XSS)
let inMemoryToken = null;

export function getAuthToken() {
    return inMemoryToken || window.CHAT_F_CONFIG?.TOKEN || null;
}

export function setAuthToken(token) {
    inMemoryToken = token;
    // Wipe from global window so external scripts cannot inspect it
    if (window.CHAT_F_CONFIG && window.CHAT_F_CONFIG.TOKEN) {
        delete window.CHAT_F_CONFIG.TOKEN;
    }
}

export function clearAuthTokens() {
    inMemoryToken = null;
    if (window.CHAT_F_CONFIG) {
        delete window.CHAT_F_CONFIG.TOKEN;
        delete window.CHAT_F_CONFIG.IDENTITY_TOKEN;
    }
    if (window.CHAT_CONFIG) {
        delete window.CHAT_CONFIG.IDENTITY_TOKEN;
    }
}

const config = () => window.CHAT_F_CONFIG || {};

function getUrl(path) {
    const base = config().API_BASE_URL || '';
    // If base is provided, ensure it doesn't end with slash if path starts with one
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
}

function getHeaders(method, isMultipart = false) {
    const headers = {
        'Authorization': `Bearer ${getAuthToken() || ''}`
    };
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }
    if (method === 'POST') {
        headers['X-CSRFToken'] = config().CSRF_TOKEN || '';
    }
    return headers;
}

export async function refreshToken() {
    const cfg = window.CHAT_F_CONFIG || {};
    const baseUrl = (cfg.API_BASE_URL || '').replace(/\/$/, '');

    let freshIdentityToken = null;

    // Method 1: Host Callback Function (for React / Angular / Vue SPAs)
    const hostCallback = window.CHAT_CONFIG?.getFreshIdentityToken || cfg.getFreshIdentityToken;
    if (typeof hostCallback === 'function') {
        try {
            freshIdentityToken = await hostCallback();
        } catch (err) {
            console.warn("[Auth] Host getFreshIdentityToken callback failed:", err);
        }
    }

    // Method 2: CustomEvent Bridge (cwu:token-expired -> cwu:token-renewed)
    if (!freshIdentityToken && typeof window !== 'undefined' && window.dispatchEvent) {
        try {
            freshIdentityToken = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    window.removeEventListener('cwu:token-renewed', onRenewed);
                    resolve(null);
                }, 3000); // 3s timeout

                const onRenewed = (event) => {
                    clearTimeout(timeout);
                    window.removeEventListener('cwu:token-renewed', onRenewed);
                    resolve(event.detail?.identityToken || null);
                };

                window.addEventListener('cwu:token-renewed', onRenewed);
                window.dispatchEvent(new CustomEvent('cwu:token-expired'));
            });
        } catch (err) {
            console.warn("[Auth] CustomEvent bridge renewal failed:", err);
        }
    }

    // Method 3: Direct Host CONFIG_URL fetch (cookie-based apps like Flask / Spring MVC)
    if (!freshIdentityToken && cfg.CONFIG_URL) {
        try {
            const configRes = await fetch(cfg.CONFIG_URL, { credentials: 'same-origin' });
            if (configRes.ok) {
                const freshConfig = await configRes.json();
                freshIdentityToken = freshConfig.IDENTITY_TOKEN || freshConfig.identityToken;
            }
        } catch (err) {
            console.warn("[Auth] Failed to fetch fresh config from CONFIG_URL:", err);
        }
    }

    // Fallback: Check if an identity token is already queued in config (initial boot)
    if (!freshIdentityToken) {
        freshIdentityToken = cfg.IDENTITY_TOKEN || window.CHAT_CONFIG?.IDENTITY_TOKEN;
    }

    if (!freshIdentityToken) {
        clearAuthTokens();
        throw new Error("No identity assertion available for token renewal");
    }

    // Scrub token from window object after reading
    if (cfg.IDENTITY_TOKEN) delete cfg.IDENTITY_TOKEN;
    if (window.CHAT_CONFIG && window.CHAT_CONFIG.IDENTITY_TOKEN) {
        delete window.CHAT_CONFIG.IDENTITY_TOKEN;
    }

    const res = await fetch(`${baseUrl}/chat/api/acall/bas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            identity_token: freshIdentityToken
        })
    });

    if (!res.ok) {
        clearAuthTokens();
        throw new Error("Failed to authenticate token with Chat Server");
    }

    const data = await res.json();
    if (data.token) {
        setAuthToken(data.token);
        return data.token;
    }
    throw new Error("No token returned by Chat Server");
}

let isRefreshing = false;
let refreshQueue = [];

async function authorizedFetch(path, options = {}) {
    const method = options.method || 'GET';
    const isMultipart = options.isMultipart || false;

    // Check if token exists, if not, fetch it first
    if (!getAuthToken()) {
        try {
            await refreshToken();
        } catch (err) {
            console.error("Token initialization failed:", err);
        }
    }

    const headers = getHeaders(method, isMultipart);
    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    const fetchOptions = {
        ...options,
        headers,
        credentials: 'same-origin'
    };

    let res = await fetch(getUrl(path), fetchOptions);

    if (res.status === 401) {
        // Token might have expired. Try to refresh.
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                const newToken = await refreshToken();
                // Process queue
                refreshQueue.forEach(cb => cb(newToken));
                refreshQueue = [];
            } catch (err) {
                console.error("Token refresh failed:", err);
                refreshQueue = [];
                clearAuthTokens();
                throw err;
            } finally {
                isRefreshing = false;
            }
        } else {
            // Wait for refresh to complete
            return new Promise((resolve, reject) => {
                refreshQueue.push((newToken) => {
                    fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
                    fetch(getUrl(path), fetchOptions).then(resolve).catch(reject);
                });
            });
        }

        // Retry original request with the new token
        fetchOptions.headers['Authorization'] = `Bearer ${getAuthToken() || ''}`;
        res = await fetch(getUrl(path), fetchOptions);
    }

    return res;
}

export async function fetchBookmarks() {
    const res = await authorizedFetch('/chat/api/bookmarks/', { method: 'GET' });
    if (!res.ok) throw res;
    return res.json();
}

export async function addBookmark(username) {
    const res = await authorizedFetch('/chat/api/bookmarks/add/', {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function removeBookmark(username) {
    const res = await authorizedFetch('/chat/api/bookmarks/remove/', {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function verifyBookmark(username) {
    const res = await authorizedFetch('/chat/api/bookmarks/verify/', {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function searchUsers(query = '', page = 1) {
    const res = await authorizedFetch(`/chat/api/users/?q=${encodeURIComponent(query)}&page=${page}`, { method: 'GET' });
    if (!res.ok) throw res;
    return res.json(); // Returns { users, total_count, has_more, page }
}

export async function fetchGroups() {
    const res = await authorizedFetch('/chat/api/groups/', { method: 'GET' });
    if (!res.ok) throw res;
    const data = await res.json();
    return data.groups || [];
}

export async function createGroup(name, members) {
    const res = await authorizedFetch('/chat/api/groups/create/', {
        method: 'POST',
        body: JSON.stringify({ name, members }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function fetchGroupMembers(groupId) {
    const res = await authorizedFetch(`/chat/api/groups/${groupId}/members/`, { method: 'GET' });
    return res.json();
}

export async function removeGroupMember(groupId, username) {
    const res = await authorizedFetch(`/chat/api/groups/${groupId}/remove_member/`, {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function addGroupMember(groupId, username) {
    const res = await authorizedFetch(`/chat/api/groups/${groupId}/add_member/`, {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function leaveGroup(groupId) {
    const res = await authorizedFetch(`/chat/api/groups/${groupId}/leave/`, {
        method: 'POST',
        body: JSON.stringify({}),
    });
    return res.json();
}

export async function renameGroup(groupId, name) {
    const res = await authorizedFetch(`/chat/api/groups/${groupId}/rename/`, {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function makeGroupAdmin(groupId, username) {
    const res = await authorizedFetch(`/chat/api/groups/${groupId}/make_admin/`, {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function fetchStatuses() {
    const res = await authorizedFetch('/chat/api/status/', { method: 'GET' });
    if (!res.ok) throw res;
    return res.json();
}

export async function fetchAiStatus() {
    const res = await authorizedFetch('/chat/api/status/ai/', { method: 'GET' });
    if (!res.ok) throw res;
    return res.json();
}

export async function setUserStatus(status) {
    const res = await authorizedFetch('/chat/api/status/set/', {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
    return res.json();
}

export async function markRead(chatId, isGroup) {
    const res = await authorizedFetch('/chat/api/mark_read/', {
        method: 'POST',
        body: JSON.stringify({ chat_id: chatId, is_group: isGroup }),
    });
    return res.json();
}

export async function trackReceipt(messageId, status) {
    const res = await authorizedFetch('/chat/api/track_receipt/', {
        method: 'POST',
        body: JSON.stringify({ message_id: messageId, status: status }),
    });
    return res.json();
}

export async function uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authorizedFetch('/chat/api/upload/', {
        method: 'POST',
        isMultipart: true,
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
}

export async function fetchMuteSettings() {
    const res = await authorizedFetch('/chat/api/settings/mute/', { method: 'GET' });
    if (!res.ok) throw res;
    return res.json();
}

export async function updateMuteSettings(isMuted) {
    const res = await authorizedFetch('/chat/api/settings/mute/', {
        method: 'POST',
        body: JSON.stringify({ is_muted: isMuted }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function uploadPublicKey(publicKeyJson) {
    const res = await authorizedFetch('/chat/api/keys/upload/', {
        method: 'POST',
        body: JSON.stringify({ public_key_json: publicKeyJson })
    });
    if (!res.ok) throw new Error("Failed to upload public key");
    return res.json();
}

export async function fetchPublicKey(username) {
    const res = await authorizedFetch(`/chat/api/keys/${username}/`, {
        method: 'GET'
    });
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to fetch public key for ${username}`);
    }
    return res.json();
}

