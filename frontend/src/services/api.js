const config = () => window.CHAT_CONFIG || {};

function getHeaders(method) {
    const headers = { 'Content-Type': 'application/json' };
    if (method === 'POST') {
        headers['X-CSRFToken'] = config().CSRF_TOKEN || '';
    }
    return headers;
}

export async function fetchBookmarks() {
    const res = await fetch(config().API_BOOKMARKS_URL || '/chat/api/bookmarks/', { credentials: 'same-origin' });
    return res.json();
}

export async function addBookmark(username) {
    const res = await fetch(config().API_BOOKMARK_ADD_URL || '/chat/api/bookmarks/add/', {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function removeBookmark(username) {
    const res = await fetch(config().API_BOOKMARK_REMOVE_URL || '/chat/api/bookmarks/remove/', {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function verifyBookmark(username) {
    const res = await fetch('/chat/api/bookmarks/verify/', {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function fetchAllUsers() {
    const res = await fetch(config().API_USERS_URL || '/chat/api/users/', { credentials: 'same-origin' });
    const data = await res.json();
    return data.users || [];
}

export async function fetchGroups() {
    const res = await fetch(config().API_GROUPS_URL || '/chat/api/groups/', { credentials: 'same-origin' });
    const data = await res.json();
    return data.groups || [];
}

export async function createGroup(name, members) {
    const res = await fetch(config().API_GROUP_CREATE_URL || '/chat/api/groups/create/', {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ name, members }),
    });
    return res.json();
}

export async function fetchGroupMembers(groupId) {
    const res = await fetch(`/chat/api/groups/${groupId}/members/`, { credentials: 'same-origin' });
    return res.json();
}

export async function removeGroupMember(groupId, username) {
    const res = await fetch(`/chat/api/groups/${groupId}/remove_member/`, {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function addGroupMember(groupId, username) {
    const res = await fetch(`/chat/api/groups/${groupId}/add_member/`, {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function leaveGroup(groupId) {
    const res = await fetch(`/chat/api/groups/${groupId}/leave/`, {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({}),
    });
    return res.json();
}

export async function makeGroupAdmin(groupId, username) {
    const res = await fetch(`/chat/api/groups/${groupId}/make_admin/`, {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ username }),
    });
    return res.json();
}

export async function fetchStatuses() {
    const res = await fetch('/chat/api/status/', { credentials: 'same-origin' });
    return res.json();
}

export async function setUserStatus(status) {
    const res = await fetch('/chat/api/status/set/', {
        method: 'POST', credentials: 'same-origin',
        headers: getHeaders('POST'),
        body: JSON.stringify({ status }),
    });
    return res.json();
}
