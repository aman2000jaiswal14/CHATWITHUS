import React, { useEffect } from 'react';
import Sidebar from './components/chat/Sidebar';
import ChatArea from './components/chat/ChatArea';
import DiscoverUsers from './components/chat/DiscoverUsers';
import CreateGroup from './components/chat/CreateGroup';
import GroupMembers from './components/chat/GroupMembers';
import GroupSettings from './components/chat/GroupSettings';
import Register from './components/chat/Register';
import { useChatStore } from './store/useChatStore';
import WebSocketClient from './services/WebSocketClient';
import { fetchBookmarks, fetchGroups, fetchStatuses } from './services/api';

function App() {
  const { messagesByChat, activeChatId, isGroupChat, currentView, lastOpenedUnread,
    isRegistered, setIsRegistered,
    setBookmarks, setUnverified, setGroups, setActiveChat, setCurrentView, clearActiveChat } = useChatStore();

  const config = window.CHAT_CONFIG || {};
  const currentUser = config.USER_ID || 'anonymous';
  const wsUrl = config.WS_URL || `ws://${window.location.host}/ws/chat/${currentUser}/`;

  useEffect(() => {
    const wsClient = WebSocketClient.getInstance(wsUrl, currentUser);
    wsClient.connect();

    const initialUnreads = {};

    fetchBookmarks().then(data => {
      setBookmarks(data.bookmarks || []);
      setUnverified(data.unverified || []);

      (data.bookmarks || []).forEach(b => {
        if (b.unread_count > 0) initialUnreads[b.username.toLowerCase()] = b.unread_count;
      });
      (data.unverified || []).forEach(b => {
        if (b.unread_count > 0) initialUnreads[b.username.toLowerCase()] = b.unread_count;
      });
      useChatStore.getState().setUnreadCounts({ ...useChatStore.getState().unreadCounts, ...initialUnreads });
    }).catch(err => {
      console.error(err);
      if (err.message.includes('401') || err.status === 401) setIsRegistered(false);
    });

    fetchGroups().then(groups => {
      setGroups(groups);
      groups.forEach(g => {
        if (g.unread_count > 0) initialUnreads[String(g.id).toLowerCase()] = g.unread_count;
      });
      useChatStore.getState().setUnreadCounts({ ...useChatStore.getState().unreadCounts, ...initialUnreads });

      const ws = WebSocketClient.getInstance();
      if (ws && ws.socket && ws.socket.readyState === WebSocket.OPEN) {
        groups.forEach(g => ws.subscribeGroup(String(g.id)));
      }
    }).catch(err => {
      console.error(err);
      if (err.message?.includes('401') || err.status === 401) setIsRegistered(false);
    });

    // Load persisted statuses for all contacts
    fetchStatuses().then(data => {
      const { updatePresence } = useChatStore.getState();
      Object.entries(data.statuses || {}).forEach(([userId, status]) => {
        updatePresence(userId, status);
      });
    }).catch(err => {
      console.error(err);
      if (err.message?.includes('401') || err.status === 401) setIsRegistered(false);
    });
  }, [wsUrl, currentUser, setBookmarks, setUnverified, setGroups]);

  const handleSelectChat = (chatId, isGroup) => {
    setActiveChat(chatId, isGroup);
    setCurrentView('chat');
  };

  const handleBack = () => {
    clearActiveChat();
    setCurrentView('contacts');
  };

  const handleSendMessage = (text, attachment = null) => {
    if (!activeChatId) return;
    const wsClient = WebSocketClient.getInstance();
    const payload = {
      messageId: `m${Date.now()}`,
      type: 0,
      payload: new TextEncoder().encode(text),
      sentAt: Date.now(),
      isHighPriority: false
    };
    wsClient.sendMessage(activeChatId, isGroupChat, payload, attachment);
  };

  const activeMessages = activeChatId ? (messagesByChat[activeChatId] || []) : [];

  if (!isRegistered) {
    return <Register />;
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0f1c] font-sans antialiased text-slate-300 overflow-hidden">
      {currentView === 'contacts' && (
        <Sidebar onSelectChat={handleSelectChat} />
      )}
      {currentView === 'chat' && (
        <ChatArea
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          onBack={handleBack}
          currentUser={currentUser}
          openedUnread={lastOpenedUnread}
        />
      )}
      {currentView === 'discover' && (
        <DiscoverUsers onBack={() => setCurrentView('contacts')} />
      )}
      {currentView === 'create_group' && (
        <CreateGroup onBack={() => setCurrentView('contacts')} />
      )}
      {currentView === 'group_members' && (
        <GroupMembers onBack={() => setCurrentView('chat')} />
      )}
      {currentView === 'group_settings' && (
        <GroupSettings onBack={() => setCurrentView('chat')} />
      )}
    </div>
  );
}

export default App;
