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

    setActiveChat: (chatId, isGroup) => set((state) => {
        const lowerId = String(chatId).toLowerCase();
        const snapshot = state.unreadCounts[lowerId] || 0;
        return {
            activeChatId: lowerId,
            isGroupChat: isGroup,
            unreadCounts: { ...state.unreadCounts, [lowerId]: 0 },
            lastOpenedUnread: snapshot,
        };
    }),
    clearActiveChat: () => set({ activeChatId: null, isGroupChat: false, lastOpenedUnread: 0 }),
    setCurrentView: (view) => set({ currentView: view }),

    setMessages: (chatId, newMessages) => set((state) => {
        const lowerId = String(chatId).toLowerCase();
        const existing = state.messagesByChat[lowerId] || [];
        const combined = [...newMessages, ...existing];
        const unique = Array.from(new Map(combined.map(m => [m.messageId, m])).values())
            .sort((a, b) => (Number(a.sentAt) || 0) - (Number(b.sentAt) || 0));

        const newFetched = new Set(state.fetchedChats);
        newFetched.add(lowerId);

        return {
            messagesByChat: { ...state.messagesByChat, [lowerId]: unique },
            fetchedChats: newFetched
        };
    }),

    addMessage: (chatId, message) => set((state) => {
        const lowerId = String(chatId).toLowerCase();
        const list = state.messagesByChat[lowerId] || [];
        // Deduplicate in addMessage too
        if (list.some(m => m.messageId === message.messageId)) return state;

        const newState = {
            messagesByChat: { ...state.messagesByChat, [lowerId]: [...list, message] }
        };
        if (state.activeChatId !== lowerId) {
            newState.unreadCounts = {
                ...state.unreadCounts,
                [lowerId]: (state.unreadCounts[lowerId] || 0) + 1
            };
        }
        return newState;
    }),

    updatePresence: (userId, statusData) => set((state) => ({
        presence: { ...state.presence, [String(userId).toLowerCase()]: statusData }
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
}));
