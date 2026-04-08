import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
    messagesByChat: {},
    activeChatId: null,
    isGroupChat: false,
    bookmarks: [],       // verified bookmarked users
    unverified: [],      // unverified contacts (auto-added when someone DMs you)
    allUsers: [],
    groups: [],
    presence: {},
    currentView: 'contacts',
    unreadCounts: {},    // { chatId: count }
    fetchedChats: new Set(), // Track which chats have had history loaded
    lastOpenedUnread: 0,  // Snapshot of unread count when chat was opened
    isRegistered: true,
    isMuted: true,
    isSelfDestructEnabled: false,
    isEmergencyAlertActive: false,
    currentUser: (window.CHAT_CONFIG || {}).USER_ID || 'anonymous',

    setIsRegistered: (val) => set({ isRegistered: val }),
    setIsMuted: (val) => set({ isMuted: val }),
    setIsSelfDestructEnabled: (val) => set({ isSelfDestructEnabled: val }),
    setIsEmergencyAlertActive: (val) => set({ isEmergencyAlertActive: val }),
    setCurrentUser: (val) => set({ currentUser: val }),

    setActiveChat: (chatId, isGroup) => set((state) => {
        const cid = String(chatId);
        const snapshot = state.unreadCounts[cid] || 0;
        return {
            activeChatId: cid,
            isGroupChat: isGroup,
            unreadCounts: { ...state.unreadCounts, [cid]: 0 },
            lastOpenedUnread: snapshot,
        };
    }),
    clearActiveChat: () => set({ activeChatId: null, isGroupChat: false, lastOpenedUnread: 0 }),
    clearLastOpenedUnread: () => set({ lastOpenedUnread: 0 }),
    setCurrentView: (view) => set({ currentView: view }),

    setMessages: (chatId, newMessages) => set((state) => {
        const cid = String(chatId);
        const existing = state.messagesByChat[cid] || [];
        const combined = [...newMessages, ...existing];
        const unique = Array.from(new Map(combined.map(m => [m.messageId, m])).values())
            .sort((a, b) => (Number(a.sentAt) || 0) - (Number(b.sentAt) || 0));

        const newFetched = new Set(state.fetchedChats);
        newFetched.add(cid);

        return {
            messagesByChat: { ...state.messagesByChat, [cid]: unique },
            fetchedChats: newFetched
        };
    }),

    addMessage: (chatId, message) => set((state) => {
        const cid = String(chatId);
        const list = state.messagesByChat[cid] || [];
        // Deduplicate in addMessage too
        if (list.some(m => m.messageId === message.messageId)) return state;

        const newState = {
            messagesByChat: { ...state.messagesByChat, [cid]: [...list, message] }
        };

        // Update last_message_at for sorting (case-insensitive match)
        const timestamp = Number(message.sentAt) || Date.now();
        const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
        if (state.groups.some(g => eq(g.id, cid))) {
            newState.groups = state.groups.map(g =>
                eq(g.id, cid) ? { ...g, last_message_at: timestamp } : g
            );
        } else if (state.bookmarks.some(b => eq(b.username, cid))) {
            newState.bookmarks = state.bookmarks.map(b =>
                eq(b.username, cid) ? { ...b, last_message_at: timestamp } : b
            );
        } else if (state.unverified.some(u => eq(u.username, cid))) {
            newState.unverified = state.unverified.map(u =>
                eq(u.username, cid) ? { ...u, last_message_at: timestamp } : u
            );
        }

        if (state.activeChatId !== cid) {
            newState.unreadCounts = {
                ...state.unreadCounts,
                [cid]: (state.unreadCounts[cid] || 0) + 1
            };
        }

        return newState;
    }),

    loadMoreMessages: (chatId, oldMessages) => set((state) => {
        const cid = String(chatId);
        const existing = state.messagesByChat[cid] || [];
        const combined = [...oldMessages, ...existing];
        const unique = Array.from(new Map(combined.map(m => [m.messageId, m])).values())
            .sort((a, b) => (Number(a.sentAt) || 0) - (Number(b.sentAt) || 0));

        return {
            messagesByChat: { ...state.messagesByChat, [cid]: unique }
        };
    }),

    updatePresence: (userId, statusData) => set((state) => ({
        presence: { ...state.presence, [String(userId)]: statusData }
    })),

    setBookmarks: (bookmarks) => set({ bookmarks }),
    setUnverified: (unverified) => set({ unverified }),
    addBookmark: (user) => set((state) => ({
        bookmarks: [...state.bookmarks, user]
    })),
    removeBookmark: (username) => set((state) => ({
        bookmarks: state.bookmarks.filter(b => b.username !== username)
    })),
    moveToUnverified: (username) => set((state) => {
        const contact = state.bookmarks.find(b => b.username === username);
        if (!contact) return {};
        return {
            bookmarks: state.bookmarks.filter(b => b.username !== username),
            unverified: [...state.unverified, { ...contact, is_verified: false }],
        };
    }),
    verifyContact: (username) => set((state) => {
        const contact = state.unverified.find(u => u.username === username);
        if (!contact) return {};
        return {
            unverified: state.unverified.filter(u => u.username !== username),
            bookmarks: [...state.bookmarks, { ...contact, is_verified: true }],
        };
    }),
    removeUnverified: (username) => set((state) => ({
        unverified: state.unverified.filter(u => u.username !== username)
    })),

    setAllUsers: (users) => set({ allUsers: users }),
    setGroups: (groups) => set({ groups }),
    addGroup: (group) => set((state) => ({
        groups: [...state.groups, group]
    })),
    setUnreadCounts: (counts) => set({ unreadCounts: counts }),

    updateMessageStatus: (chatId, messageId, status) => set((state) => {
        const cid = String(chatId);
        const list = state.messagesByChat[cid] || [];
        const index = list.findIndex(m => m.messageId === messageId);
        if (index === -1) return state;

        // Only upgrade status, don't downgrade
        if ((list[index].readReceipt || 0) >= status) return state;

        const newList = [...list];
        newList[index] = { ...newList[index], readReceipt: status };

        return {
            messagesByChat: { ...state.messagesByChat, [cid]: newList }
        };
    }),
}));
