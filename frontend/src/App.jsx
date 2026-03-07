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
import { ShieldAlert } from 'lucide-react';
import LicensingService from './services/LicensingService';

function App() {
  const { messagesByChat, activeChatId, isGroupChat, currentView, lastOpenedUnread,
    isRegistered, setIsRegistered,
    setBookmarks, setUnverified, setGroups, setActiveChat, setCurrentView, clearActiveChat } = useChatStore();

  const [licenseState, setLicenseState] = React.useState({ loading: true, valid: false, error: null });

  const config = window.CHAT_CONFIG || {};
  const currentUser = config.USER_ID || 'anonymous';
  const wsUrl = config.WS_URL || `ws://${window.location.host}/ws/chat/${currentUser}/`;

  // 1. Effect for License Verification
  useEffect(() => {
    const rawLicense = config.LICENSE_INFO;
    LicensingService.verifyLicense(rawLicense).then(result => {
      setLicenseState({ loading: false, valid: !!result.valid, error: result.error });
    });
  }, []); // Only run once on mount

  // 2. Effect for WebSocket and Data Fetching (dependent on License)
  useEffect(() => {
    // ONLY proceed if license is valid AND user is registered
    if (licenseState.valid && isRegistered) {
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
      });
      return () => {
        wsClient.disconnect();
      };
    }
  }, [wsUrl, currentUser, setBookmarks, setUnverified, setGroups, isRegistered, licenseState.valid]);

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
    wsClient.sendMessage(activeChatId, text, isGroupChat, 0, attachment);
  };

  const activeMessages = activeChatId ? (messagesByChat[activeChatId] || []) : [];

  if (!isRegistered) {
    return <Register />;
  }

  const licenseInfo = window.CHAT_CONFIG?.LICENSE_INFO;
  const isLicenseValid = licenseInfo && !licenseInfo.error;

  if (licenseState.loading) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#0a0f1c] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-xs uppercase tracking-widest font-bold">Verifying Enterprise License...</p>
      </div>
    );
  }

  if (!licenseState.valid) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#0a0f1c] text-gray-200 p-8 text-center font-sans">
        <div className="bg-[#0f172a] p-10 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full">
          <ShieldAlert className="w-20 h-20 text-emerald-500 mb-6 mx-auto animate-pulse" />
          <h2 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">License Required</h2>
          <div className="h-px w-12 bg-emerald-500 mx-auto mb-6"></div>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {licenseState.error === 'License expired'
              ? "Your product license has expired. Please renew your subscription to restore access to ChatWithUs Enterprise."
              : "A valid enterprise license is required to access this system. Please contact your administrator to install a valid CWULicense.txt file."}
          </p>
          <div className="pt-6 border-t border-slate-800/50 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
              Project: {licenseState.project || "ChatWithUs"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              Version: {licenseState.version || "1.0.0"}
            </p>
            <p className="text-[10px] text-slate-500 italic">
              {licenseState.description || "Enterprise Communication System"}
            </p>
          </div>
        </div>
      </div>
    );
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
