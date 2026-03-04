import { wca_chat } from '../protocols/messages';
import { useChatStore } from '../store/useChatStore';
import { fetchBookmarks, fetchGroups } from './api';

const { ProtocolWrapper, Command } = wca_chat;

class WebSocketClient {
    static instance = null;
    socket = null;
    url = '';
    userId = '';

    constructor(url, userId) {
        this.url = url;
        this.userId = userId;
    }

    static getInstance(url, userId) {
        if (!WebSocketClient.instance) {
            WebSocketClient.instance = new WebSocketClient(url, userId);
        }
        return WebSocketClient.instance;
    }

    connect() {
        if (this.socket) return;
        console.log('[WS] Connecting to', this.url);
        this.socket = new WebSocket(this.url);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
            console.log('[WS] Connected as', this.userId);
            const groups = useChatStore.getState().groups;
            groups.forEach(g => this.subscribeGroup(String(g.id)));
        };

        this.socket.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'group_refresh') {
                        console.log('[WS] Group refresh signal received:', data.reason);
                        this._refreshGroups();
                    } else if (data.type === 'presence_update') {
                        console.log('[WS] Presence update:', data.user_id, data.status, data.is_online);
                        // Store the whole object or just status? 
                        // Let's store { status, is_online } for consistency with API
                        useChatStore.getState().updatePresence(data.user_id, {
                            status: data.status,
                            is_online: data.is_online
                        });
                    }
                } catch (err) {
                    console.error('[WS] Failed to parse text message', err);
                }
                return;
            }

            const data = new Uint8Array(event.data);
            try {
                const wrapper = ProtocolWrapper.decode(data);
                if (wrapper.chatMessage) {
                    const msg = wrapper.chatMessage;
                    let chatId;
                    if (msg.isGroupMessage) {
                        chatId = String(msg.targetId).toLowerCase();
                    } else {
                        // Case-insensitive comparison for sender check
                        const isMine = String(msg.senderId).toLowerCase() === String(this.userId).toLowerCase();
                        const rawId = isMine ? msg.targetId : msg.senderId;
                        chatId = String(rawId).toLowerCase();
                    }

                    // Deduplicate
                    const existing = useChatStore.getState().messagesByChat[chatId] || [];
                    const isDuplicate = existing.some(m => m.messageId === msg.messageId);
                    if (!isDuplicate) {
                        useChatStore.getState().addMessage(chatId, msg);
                    }

                    // If this is a DM from someone else, refresh bookmarks to pick up unverified contacts
                    if (!msg.isGroupMessage && msg.senderId !== this.userId) {
                        this._refreshBookmarks();
                    }
                } else if (wrapper.presence) {
                    useChatStore.getState().updatePresence(wrapper.presence.userId, {
                        status: wrapper.presence.status,
                        is_online: true
                    });
                }
            } catch (err) {
                console.error('[WS] Failed to decode message', err);
            }
        };

        this.socket.onerror = (err) => {
            console.error('[WS] Error', err);
        };

        this.socket.onclose = () => {
            console.log('[WS] Disconnected, reconnecting in 3s...');
            this.socket = null;
            setTimeout(() => this.connect(), 3000);
        };
    }

    sendMessage(targetId, isGroup, payload, attachment = null) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const lowerId = String(targetId).toLowerCase();
            const messageObj = { ...payload, targetId, isGroupMessage: isGroup, senderId: this.userId };
            if (attachment) {
                messageObj.attachment = attachment;
            }
            const chatMessage = messageObj;
            const wrapper = ProtocolWrapper.create({ chatMessage });
            const buffer = ProtocolWrapper.encode(wrapper).finish();
            this.socket.send(buffer);
            useChatStore.getState().addMessage(lowerId, wrapper.chatMessage);
        } else {
            console.error('[WS] Cannot send — socket not open');
        }
    }

    subscribeGroup(groupId) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const wrapper = ProtocolWrapper.create({
                command: { type: Command.CommandType.SUBSCRIBE_GROUP, targetId: groupId }
            });
            this.socket.send(ProtocolWrapper.encode(wrapper).finish());
        }
    }

    // Debounced bookmark refresh — called when a DM from a new sender arrives
    _refreshBookmarks() {
        if (this._refreshBookmarksTimer) return;
        this._refreshBookmarksTimer = setTimeout(() => {
            fetchBookmarks().then(data => {
                useChatStore.getState().setBookmarks(data.bookmarks || []);
                useChatStore.getState().setUnverified(data.unverified || []);
            }).catch(console.error);
            this._refreshBookmarksTimer = null;
        }, 500);
    }

    // Debounced group refresh — called when a group refresh signal is received
    _refreshGroups() {
        if (this._refreshGroupsTimer) return;
        this._refreshGroupsTimer = setTimeout(() => {
            fetchGroups().then(groups => {
                useChatStore.getState().setGroups(groups);
                // Ensure we are subscribed to all groups (including new ones)
                groups.forEach(g => this.subscribeGroup(String(g.id)));
            }).catch(console.error);
            this._refreshGroupsTimer = null;
        }, 500);
    }
}

export default WebSocketClient;
