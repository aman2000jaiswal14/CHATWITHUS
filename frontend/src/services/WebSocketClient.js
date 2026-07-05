/* eslint-disable no-console */
import { wca_chat } from '../protocols/messages';
import { useChatStore } from '../store/useChatStore';
import { fetchBookmarks, fetchGroups, fetchStatuses, refreshToken } from './api';
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
        if (!WebSocketClient.instance || (userId && WebSocketClient.instance.userId !== userId)) {
            if (WebSocketClient.instance) {
                WebSocketClient.instance.disconnect();
            }
            WebSocketClient.instance = new WebSocketClient(url, userId);
        }
        return WebSocketClient.instance;
    }

    connect() {
        if (this.socket) return;
        
        // Dynamically append the current token to the base URL
        const baseUrl = this.url.split('?')[0];
        const token = window.CHAT_CONFIG?.TOKEN || '';
        const connectionUrl = `${baseUrl}?token=${token}`;

        console.log('[WS] Connecting to', connectionUrl);
        this.socket = new WebSocket(connectionUrl);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
            console.log('[WS] Connected as', this.userId);
            this.refreshData('initial_connect');
        };

        this.socket.onmessage = this.onmessage.bind(this);

        this.socket.onerror = (err) => {
            console.error('[WS] Error', err);
        };

        this.socket.onclose = async (event) => {
            console.log('[WS] Disconnected, code:', event.code);
            this.socket = null;
            
            // If the connection was closed due to authorization failure (code 4003)
            if (event.code === 4003) {
                console.log('[WS] Authorization failure detected. Clearing token and attempting refresh...');
                window.CHAT_CONFIG.TOKEN = null;
                try {
                    await refreshToken();
                    console.log('[WS] Token refreshed successfully.');
                } catch (err) {
                    console.error('[WS] Token refresh failed:', err);
                }
            }
            
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

    useProtobuf() {
        return (window.CWU_VERIFIED_MODULES || []).includes('PROTOBUF');
    }

    async onmessage(event) {
        let wrapper = null;
        if (typeof event.data === 'string') {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'group_refresh') {
                    this.refreshData(data.reason);
                    return;
                } else if (data.type === 'presence_update') {
                    useChatStore.getState().updatePresence(data.user_id, {
                        status: data.status,
                        is_online: data.is_online
                    });
                    return;
                }

                // Check if it is a JSON ProtocolWrapper
                if (data.chatMessage || data.presence || data.receipt || data.webrtcSignal || data.chat_message || data.webrtc_signal) {
                    wrapper = data;
                    if (data.chatMessage || data.chat_message) wrapper.content = 'chatMessage';
                    else if (data.presence) wrapper.content = 'presence';
                    else if (data.receipt) wrapper.content = 'receipt';
                    else if (data.webrtcSignal || data.webrtc_signal) wrapper.content = 'webrtcSignal';
                } else {
                    console.warn('[WS] Unknown text message:', data);
                    return;
                }
            } catch (err) {
                console.error('[WS] Failed to parse text message', err);
                return;
            }
        } else {
            const data = new Uint8Array(event.data);
            try {
                wrapper = wca_chat.ProtocolWrapper.decode(data);
            } catch (err) {
                console.error('[WS] Failed to decode binary message', err);
                return;
            }
        }

        try {
            // Use the content / wrapper type to determine message type
            if (wrapper.content === 'chatMessage') {
                const chatMsg = wrapper.chatMessage || wrapper.chat_message;
                const messageId = chatMsg.messageId || chatMsg.message_id;
                if (this.receivedMessages.has(messageId)) return;
                this.receivedMessages.add(messageId);

                const senderId = chatMsg.senderId || chatMsg.sender_id;
                const targetId = chatMsg.targetId || chatMsg.target_id;
                const isGroupMessage = chatMsg.isGroupMessage !== undefined ? chatMsg.isGroupMessage : chatMsg.is_group_message;
                const msgType = chatMsg.type;
                const sentAt = chatMsg.sentAt !== undefined ? chatMsg.sentAt : chatMsg.sent_at;
                const timerSeconds = chatMsg.timerSeconds !== undefined ? chatMsg.timerSeconds : chatMsg.timer_seconds;
                const replyToMessageId = chatMsg.replyToMessageId || chatMsg.reply_to_message_id;

                // E2EE: Decrypt payload
                let decryptedContent = '';
                try {
                    const payload = chatMsg.payload;
                    const encryptedPayload = (typeof payload === 'string')
                        ? payload
                        : new TextDecoder().decode(payload);
                    decryptedContent = await encryptionService.decrypt(
                        encryptedPayload,
                        senderId,
                        isGroupMessage,
                        targetId
                    );
                } catch (err) {
                    console.warn('[WS] E2EE Decryption failed, falling back to raw payload:', err);
                    try {
                        const payload = chatMsg.payload;
                        decryptedContent = (typeof payload === 'string')
                            ? payload
                            : new TextDecoder().decode(payload);
                    } catch (err2) {
                        decryptedContent = '[Decryption Error]';
                    }
                }

                const attachmentRaw = chatMsg.attachment;
                const attachment = attachmentRaw ? {
                    id: attachmentRaw.id,
                    name: attachmentRaw.name,
                    type: attachmentRaw.type,
                    url: attachmentRaw.url,
                    size: attachmentRaw.size
                } : null;

                const msg = {
                    messageId: messageId,
                    senderId: senderId,
                    targetId: targetId,
                    isGroupMessage: isGroupMessage,
                    type: msgType,
                    content: decryptedContent,
                    sentAt: Number(sentAt),
                    timerSeconds: timerSeconds || 0,
                    replyToMessageId: replyToMessageId,
                    expires_at: timerSeconds > 0
                        ? Number(sentAt) + timerSeconds * 1000
                        : null,
                    attachment: attachment
                };

                const chatId = msg.isGroupMessage ? String(msg.targetId) :
                    (String(msg.senderId).toLowerCase() === String(this.userId).toLowerCase()
                        ? String(msg.targetId)
                        : String(msg.senderId));

                useChatStore.getState().addMessage(chatId, msg);

                // Auto-send DELIVERED receipt for messages from others
                if (String(msg.senderId).toLowerCase() !== String(this.userId).toLowerCase()) {
                    const isLicensed = (window.CWU_VERIFIED_MODULES || []).includes('READ_RECEIPT');
                    if (isLicensed) {
                        this.sendMessageReceipt(
                            msg.messageId,
                            msg.isGroupMessage ? msg.targetId : msg.senderId,
                            msg.isGroupMessage,
                            0 // DELIVERED
                        );
                    }
                }

                const isMine = String(msg.senderId).toLowerCase() === String(this.userId).toLowerCase();

                // Check for Emergency Broadcast
                if (String(msg.targetId).toUpperCase() === 'EMERGENCY' && !isMine) {
                    useChatStore.getState().setIsEmergencyAlertActive(true);
                }

                const isMuted = useChatStore.getState().isMuted;
                const hasNotifications = (window.CWU_VERIFIED_MODULES || []).includes('NOTIFICATIONS');
                if (!isMine && !isMuted && hasNotifications) {
                    this.playNotificationSound();
                }

                if (this.shouldRefresh(msg)) {
                    this.refreshData('new_chat');
                }
            } else if (wrapper.content === 'presence') {
                const presence = wrapper.presence;
                const presenceUserId = presence.userId || presence.user_id;
                const presenceStatus = presence.status;
                const presenceIsOnline = presence.isOnline !== undefined ? presence.isOnline : presence.is_online;
                useChatStore.getState().updatePresence(presenceUserId, {
                    status: presenceStatus,
                    is_online: presenceIsOnline
                });
            } else if (wrapper.content === 'receipt') {
                const receipt = wrapper.receipt;
                const status = receipt.type === 0 ? 1 : 2;
                
                const receiptIsGroup = receipt.isGroup !== undefined ? receipt.isGroup : receipt.is_group;
                const receiptChatId = receipt.chatId || receipt.chat_id;
                const receiptReaderId = receipt.readerId || receipt.reader_id;
                const receiptMessageId = receipt.messageId || receipt.message_id;

                const targetChatId = receiptIsGroup ? receiptChatId : receiptReaderId;
                useChatStore.getState().updateMessageStatus(targetChatId, receiptMessageId, status);
            } else if (wrapper.content === 'webrtcSignal') {
                const sigRaw = wrapper.webrtcSignal || wrapper.webrtc_signal;
                const sig = {
                    type: sigRaw.type,
                    senderId: sigRaw.senderId || sigRaw.sender_id,
                    targetId: sigRaw.targetId || sigRaw.target_id,
                    sdp: sigRaw.sdp,
                    candidate: sigRaw.candidate,
                    callId: sigRaw.callId || sigRaw.call_id,
                    isVideo: sigRaw.isVideo !== undefined ? sigRaw.isVideo : sigRaw.is_video
                };
                this.handleWebRTCSignal(sig);
            }
        } catch (err) {
            console.error('[WS] Failed to process message wrapper', err);
        }
    }

    async sendMessageReceipt(messageId, chatId, isGroup, type) {
        if (!(window.CWU_VERIFIED_MODULES || []).includes('READ_RECEIPT')) return;
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        try {
            const receiptData = {
                messageId: messageId,
                chatId: String(chatId),
                readerId: this.userId,
                type: type, // 0: DELIVERED, 1: READ
                isGroup: isGroup
            };
            if (this.useProtobuf()) {
                const receipt = wca_chat.Receipt.create(receiptData);
                const wrapper = wca_chat.ProtocolWrapper.create({
                    receipt: receipt
                });
                this.socket.send(wca_chat.ProtocolWrapper.encode(wrapper).finish());
            } else {
                const wrapper = {
                    receipt: receiptData
                };
                this.socket.send(JSON.stringify(wrapper));
            }
        } catch (err) {
            console.error('[WS] Failed to send receipt:', err);
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

    async sendMessage(targetId, content, isGroup, type = 0, attachment = null, timerSeconds = 0, replyToMessageId = null) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('[WS] Cannot send — socket not open');
            return;
        }

        try {
            // E2EE: Encrypt content before sending
            const encryptedContent = await encryptionService.encrypt(content, String(targetId), isGroup);
            const msgData = {
                messageId: Math.random().toString(36).substr(2, 9),
                senderId: this.userId,
                targetId: String(targetId),
                isGroupMessage: isGroup,
                type: type,
                payload: this.useProtobuf() ? new TextEncoder().encode(encryptedContent) : encryptedContent,
                sentAt: Date.now(),
                timerSeconds: timerSeconds,
                replyToMessageId: replyToMessageId
            };

            if (attachment) {
                msgData.attachment = {
                    id: String(attachment.id || ''),
                    name: String(attachment.name || ''),
                    type: String(attachment.type || ''),
                    url: String(attachment.url || ''),
                    size: Number(attachment.size || 0)
                };
            }

            if (this.useProtobuf()) {
                if (msgData.attachment) {
                    msgData.attachment = wca_chat.ChatMessage.Attachment.create(msgData.attachment);
                }
                const chatMessage = wca_chat.ChatMessage.create(msgData);
                // ProtocolWrapper uses oneof — just set the chatMessage field directly
                const wrapper = wca_chat.ProtocolWrapper.create({
                    chatMessage: chatMessage
                });
                this.socket.send(wca_chat.ProtocolWrapper.encode(wrapper).finish());
            } else {
                const wrapper = {
                    chatMessage: msgData
                };
                this.socket.send(JSON.stringify(wrapper));
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    }

    subscribeGroup(groupId) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            if (this.useProtobuf()) {
                const command = wca_chat.Command.create({
                    type: wca_chat.Command.CommandType.SUBSCRIBE_GROUP,
                    targetId: String(groupId)
                });
                const wrapper = wca_chat.ProtocolWrapper.create({
                    command: command
                });
                this.socket.send(wca_chat.ProtocolWrapper.encode(wrapper).finish());
            } else {
                const wrapper = {
                    command: {
                        type: 0, // SUBSCRIBE_GROUP
                        targetId: String(groupId)
                    }
                };
                this.socket.send(JSON.stringify(wrapper));
            }
        }
    }

    shouldRefresh(msg) {
        const state = useChatStore.getState();
        const isMine = String(msg.senderId).toLowerCase() === String(this.userId).toLowerCase();
        if (isMine) return false;

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
                    const cid = b.username;
                    if (cid !== state.activeChatId) {
                        newUnreads[cid] = b.unread_count || 0;
                    } else {
                        newUnreads[cid] = 0; // Active chat is always 0 on client
                    }
                });
                (bookmarksData.unverified || []).forEach(b => {
                    const cid = b.username;
                    if (cid !== state.activeChatId) {
                        newUnreads[cid] = b.unread_count || 0;
                    } else {
                        newUnreads[cid] = 0;
                    }
                });
                (groupsData || []).forEach(g => {
                    const cid = String(g.id);
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

    sendWebRTCSignal(sig) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        try {
            const typeMap = {
                'OFFER': 0,
                'ANSWER': 1,
                'ICE_CANDIDATE': 2,
                'CALL_INITIATE': 3,
                'CALL_REJECT': 4,
                'CALL_HANGUP': 5
            };

            const sigData = {
                type: typeof sig.type === 'string' ? typeMap[sig.type] : sig.type,
                senderId: sig.senderId,
                targetId: sig.targetId,
                sdp: sig.sdp || '',
                candidate: sig.candidate || '',
                callId: sig.callId,
                isVideo: sig.isVideo || false
            };

            if (this.useProtobuf()) {
                const webrtcSignal = wca_chat.WebRTCSignal.create(sigData);
                const wrapper = wca_chat.ProtocolWrapper.create({
                    webrtcSignal: webrtcSignal
                });
                this.socket.send(wca_chat.ProtocolWrapper.encode(wrapper).finish());
            } else {
                const wrapper = {
                    webrtcSignal: sigData
                };
                this.socket.send(JSON.stringify(wrapper));
            }
        } catch (err) {
            console.error('[WS] Failed to send WebRTC signal:', err);
        }
    }

    async handleWebRTCSignal(sig) {
        console.log('[WS] Received WebRTC Signal:', sig.type, 'from:', sig.senderId);
        
        const { default: webrtcService } = await import('./WebRTCService');
        const state = useChatStore.getState();

        switch (sig.type) {
            case 3: // CALL_INITIATE
                if (state.activeCall || state.incomingCall || state.outgoingCall) {
                    webrtcService.rejectCall(sig.senderId, sig.callId);
                    return;
                }
                useChatStore.getState().setIncomingCall({
                    senderId: sig.senderId,
                    callId: sig.callId,
                    isVideo: sig.isVideo
                });
                break;
            case 0: // OFFER
                if (state.incomingCall && state.incomingCall.callId === sig.callId) {
                    useChatStore.getState().setIncomingCall({
                        ...state.incomingCall,
                        sdp: sig.sdp
                    });
                }
                break;
            case 1: // ANSWER
                if (state.outgoingCall && state.outgoingCall.callId === sig.callId) {
                    await webrtcService.handleIncomingAnswer(sig);
                }
                break;
            case 2: // ICE_CANDIDATE
                await webrtcService.handleIncomingIceCandidate(sig);
                break;
            case 4: // CALL_REJECT
                if (
                    (state.incomingCall && state.incomingCall.callId === sig.callId) ||
                    (state.outgoingCall && state.outgoingCall.callId === sig.callId) ||
                    (state.activeCall && state.activeCall.callId === sig.callId)
                ) {
                    webrtcService.wasRejected = true;
                    webrtcService.handleCallEndLocally();
                }
                break;
            case 5: // CALL_HANGUP
                if (
                    (state.incomingCall && state.incomingCall.callId === sig.callId) ||
                    (state.outgoingCall && state.outgoingCall.callId === sig.callId) ||
                    (state.activeCall && state.activeCall.callId === sig.callId)
                ) {
                    webrtcService.wasHungUp = true;
                    webrtcService.handleCallEndLocally();
                }
                break;
            default:
                break;
        }
    }
}

export default WebSocketClient;
