/* eslint-disable no-console */
import { wca_chat } from '../protocols/messages';
import { useChatStore } from '../store/useChatStore';
import { fetchBookmarks, fetchGroups, fetchStatuses } from './api';
import encryptionService from './EncryptionService';

class WebSocketClient {
    static instance = null;
    socket = null;
    url = '';
    userId = '';
    receivedMessages = new Set();
    refreshDebounceTimer = null;

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
            this.refreshData('initial_connect');
        };

        this.socket.onmessage = this.onmessage.bind(this);

        this.socket.onerror = (err) => {
            console.error('[WS] Error', err);
        };

        this.socket.onclose = () => {
            console.log('[WS] Disconnected, reconnecting in 3s...');
            this.socket = null;
            setTimeout(() => this.connect(), 3000);
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.onclose = null; // Prevent auto-reconnect on deliberate disconnect
            this.socket.close();
            this.socket = null;
        }
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
        }
    }

    async onmessage(event) {
        if (typeof event.data === 'string') {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'group_refresh') {
                    this.refreshData(data.reason);
                } else if (data.type === 'presence_update') {
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
            const wrapper = wca_chat.ProtocolWrapper.decode(data);

            // Use the oneof 'content' field to determine message type
            if (wrapper.content === 'chatMessage') {
                const chatMsg = wrapper.chatMessage;
                if (this.receivedMessages.has(chatMsg.messageId)) return;
                this.receivedMessages.add(chatMsg.messageId);

                // E2EE: Decrypt payload
                const encryptedPayload = new TextDecoder().decode(chatMsg.payload);
                const decryptedContent = await encryptionService.decrypt(encryptedPayload);

                const msg = {
                    messageId: chatMsg.messageId,
                    senderId: chatMsg.senderId,
                    targetId: chatMsg.targetId,
                    isGroupMessage: chatMsg.isGroupMessage,
                    type: chatMsg.type,
                    content: decryptedContent,
                    sentAt: Number(chatMsg.sentAt),
                    attachment: chatMsg.attachment ? {
                        id: chatMsg.attachment.id,
                        name: chatMsg.attachment.name,
                        type: chatMsg.attachment.type,
                        url: chatMsg.attachment.url,
                        size: chatMsg.attachment.size
                    } : null
                };

                const chatId = msg.isGroupMessage ? String(msg.targetId).toLowerCase() :
                    (String(msg.senderId).toLowerCase() === String(this.userId).toLowerCase()
                        ? String(msg.targetId).toLowerCase()
                        : String(msg.senderId).toLowerCase());

                useChatStore.getState().addMessage(chatId, msg);

                const isMine = String(msg.senderId).toLowerCase() === String(this.userId).toLowerCase();
                const isMuted = useChatStore.getState().isMuted;
                if (!isMine && !isMuted) {
                    this.playNotificationSound();
                }

                if (this.shouldRefresh(msg)) {
                    this.refreshData('new_chat');
                }
            } else if (wrapper.content === 'presence') {
                const presence = wrapper.presence;
                useChatStore.getState().updatePresence(presence.userId, {
                    status: presence.status,
                    is_online: presence.isOnline
                });
            }
        } catch (err) {
            console.error('[WS] Failed to decode message', err);
        }
    }

    playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Subtle "pop" sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);

            // Clean up context to avoid AudioContext limits across many plays
            setTimeout(() => {
                if (ctx.state !== 'closed') ctx.close();
            }, 500);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    }

    async sendMessage(targetId, content, isGroup, type = 0, attachment = null) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('[WS] Cannot send — socket not open');
            return;
        }

        try {
            // E2EE: Encrypt content before sending
            const encryptedContent = await encryptionService.encrypt(content);
            const msgData = {
                messageId: Math.random().toString(36).substr(2, 9),
                senderId: this.userId,
                targetId: String(targetId),
                isGroupMessage: isGroup,
                type: type,
                payload: new TextEncoder().encode(encryptedContent),
                sentAt: Date.now()
            };

            if (attachment) {
                msgData.attachment = wca_chat.ChatMessage.Attachment.create({
                    id: String(attachment.id || ''),
                    name: String(attachment.name || ''),
                    type: String(attachment.type || ''),
                    url: String(attachment.url || ''),
                    size: Number(attachment.size || 0)
                });
            }

            const chatMessage = wca_chat.ChatMessage.create(msgData);
            // ProtocolWrapper uses oneof — just set the chatMessage field directly
            const wrapper = wca_chat.ProtocolWrapper.create({
                chatMessage: chatMessage
            });

            this.socket.send(wca_chat.ProtocolWrapper.encode(wrapper).finish());
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    }

    subscribeGroup(groupId) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const command = wca_chat.Command.create({
                type: wca_chat.Command.CommandType.SUBSCRIBE_GROUP,
                targetId: String(groupId)
            });
            const wrapper = wca_chat.ProtocolWrapper.create({
                command: command
            });
            this.socket.send(wca_chat.ProtocolWrapper.encode(wrapper).finish());
        }
    }

    shouldRefresh(msg) {
        const state = useChatStore.getState();
        if (msg.isGroupMessage) {
            return !state.groups.some(g => String(g.id).toLowerCase() === String(msg.targetId).toLowerCase());
        } else {
            const senderId = String(msg.senderId).toLowerCase();
            return !state.bookmarks.some(b => b.username.toLowerCase() === senderId) &&
                !state.unverified.some(b => b.username.toLowerCase() === senderId);
        }
    }

    refreshData(reason) {
        if (this.refreshDebounceTimer) clearTimeout(this.refreshDebounceTimer);
        this.refreshDebounceTimer = setTimeout(async () => {
            console.log(`[WS] Refreshing data: ${reason}`);
            try {
                const [bookmarksData, groupsData, statusData] = await Promise.all([
                    fetchBookmarks(),
                    fetchGroups(),
                    fetchStatuses()
                ]);

                const state = useChatStore.getState();

                // Update lists
                state.setBookmarks(bookmarksData.bookmarks || []);
                state.setUnverified(bookmarksData.unverified || []);
                state.setGroups(groupsData || []);

                // Update Presences
                Object.entries(statusData.statuses || {}).forEach(([uid, s]) => {
                    state.updatePresence(uid, s);
                });

                // Calculate Unread Counts from fresh data
                const newUnreads = { ...state.unreadCounts };
                (bookmarksData.bookmarks || []).forEach(b => {
                    const cid = b.username.toLowerCase();
                    if (cid !== state.activeChatId) {
                        newUnreads[cid] = b.unread_count || 0;
                    } else {
                        newUnreads[cid] = 0; // Active chat is always 0 on client
                    }
                });
                (bookmarksData.unverified || []).forEach(b => {
                    const cid = b.username.toLowerCase();
                    if (cid !== state.activeChatId) {
                        newUnreads[cid] = b.unread_count || 0;
                    } else {
                        newUnreads[cid] = 0;
                    }
                });
                (groupsData || []).forEach(g => {
                    const cid = String(g.id).toLowerCase();
                    if (cid !== state.activeChatId) {
                        newUnreads[cid] = g.unread_count || 0;
                    } else {
                        newUnreads[cid] = 0;
                    }
                });

                state.setUnreadCounts(newUnreads);

                // Auto-subscribe to all groups
                (groupsData || []).forEach(g => this.subscribeGroup(String(g.id)));
            } catch (err) {
                console.error('[WS] Refresh failed:', err);
                if (err.status === 401 || (err.message && err.message.includes('401'))) {
                    useChatStore.getState().setIsRegistered(false);
                }
            }
        }, 500);
    }
}

export default WebSocketClient;
