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

export async function fetchBookmarks() {
    const res = await fetch(getUrl('/chat/api/bookmarks/'), { credentials: 'same-origin', headers: getHeaders('GET') });
    if (!res.ok) throw res;
    return res.json();
}

export async function addBookmark(username) {
    const res = await fetch(getUrl('/chat/api/bookmarks/add/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function removeBookmark(username) {
    const res = await fetch(getUrl('/chat/api/bookmarks/remove/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function verifyBookmark(username) {
    const res = await fetch(getUrl('/chat/api/bookmarks/verify/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function searchUsers(query = '', page = 1) {
    const url = getUrl(`/chat/api/users/?q=${encodeURIComponent(query)}&page=${page}`);
    const res = await fetch(url, { credentials: 'same-origin', headers: getHeaders('GET') });
    if (!res.ok) throw res;
    return res.json(); // Returns { users, total_count, has_more, page }
}

export async function fetchGroups() {
    const res = await fetch(getUrl('/chat/api/groups/'), { credentials: 'same-origin', headers: getHeaders('GET') });
    if (!res.ok) throw res;
    const data = await res.json();
    return data.groups || [];
}

export async function createGroup(name, members) {
    const res = await fetch(getUrl('/chat/api/groups/create/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ name, members }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function fetchGroupMembers(groupId) {
    const res = await fetch(getUrl(`/chat/api/groups/${groupId}/members/`), { credentials: 'same-origin', headers: getHeaders('GET') });
    return res.json();
}

export async function removeGroupMember(groupId, username) {
    const res = await fetch(getUrl(`/chat/api/groups/${groupId}/remove_member/`), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function addGroupMember(groupId, username) {
    const res = await fetch(getUrl(`/chat/api/groups/${groupId}/add_member/`), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function leaveGroup(groupId) {
    const res = await fetch(getUrl(`/chat/api/groups/${groupId}/leave/`), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({}),
    });
    return res.json();
}

export async function renameGroup(groupId, name) {
    const res = await fetch(getUrl(`/chat/api/groups/${groupId}/rename/`), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw res;
    return res.json();
}

export async function makeGroupAdmin(groupId, username) {
    const res = await fetch(getUrl(`/chat/api/groups/${groupId}/make_admin/`), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function fetchStatuses() {
    const res = await fetch(getUrl('/chat/api/status/'), { credentials: 'same-origin', headers: getHeaders('GET') });
    if (!res.ok) throw res;
    return res.json();
}

export async function setUserStatus(status) {
    const res = await fetch(getUrl('/chat/api/status/set/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ status }),
    });
    return res.json();
}

export async function markRead(chatId, isGroup) {
    const res = await fetch(getUrl('/chat/api/mark_read/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ chat_id: chatId, is_group: isGroup }),
    });
    return res.json();
}

export async function trackReceipt(messageId, status) {
    const res = await fetch(getUrl('/chat/api/track_receipt/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ message_id: messageId, status: status }),
    });
    return res.json();
}

export async function uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(getUrl('/chat/api/upload/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST', true), // true flag for multipart
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
}

export async function fetchMuteSettings() {
    const res = await fetch(getUrl('/chat/api/settings/mute/'), { credentials: 'same-origin', headers: getHeaders('GET') });
    if (!res.ok) throw res;
    return res.json();
}

export async function updateMuteSettings(isMuted) {
    const res = await fetch(getUrl('/chat/api/settings/mute/'), {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ is_muted: isMuted }),
    });
    if (!res.ok) throw res;
    return res.json();
}
