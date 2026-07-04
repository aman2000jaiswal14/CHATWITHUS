const config = () => window.CHAT_CONFIG || {};

function getUrl(path) {
    const base = config().API_BASE_URL || '';
    // If base is provided, ensure it doesn't end with slash if path starts with one
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
}

function getHeaders(method, isMultipart = false) {
    const headers = {
        'Authorization': `Bearer ${config().TOKEN || ''}`
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
    const cfg = window.CHAT_CONFIG || {};
    const baseUrl = (cfg.API_BASE_URL || '').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/chat/api/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: cfg.USER_ID,
            signature: cfg.IDENTITY_SIGNATURE 
        })
    });
    if (!res.ok) throw new Error("Failed to refresh token");
    const data = await res.json();
    if (data.token) {
        window.CHAT_CONFIG.TOKEN = data.token;
        return data.token;
    }
    throw new Error("No token returned");
}

let isRefreshing = false;
let refreshQueue = [];

async function authorizedFetch(path, options = {}) {
    const method = options.method || 'GET';
    const isMultipart = options.isMultipart || false;

    // Check if token exists, if not, fetch it first
    if (!window.CHAT_CONFIG.TOKEN) {
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
                window.CHAT_CONFIG.TOKEN = null;
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
        fetchOptions.headers['Authorization'] = `Bearer ${window.CHAT_CONFIG.TOKEN}`;
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

