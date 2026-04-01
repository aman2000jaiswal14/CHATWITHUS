import React, { useEffect } from 'react';
import Sidebar from './components/chat/Sidebar';
import ChatArea from './components/chat/ChatArea';
import DiscoverUsers from './components/chat/DiscoverUsers';
import CreateGroup from './components/chat/CreateGroup';
import GroupMembers from './components/chat/GroupMembers';
import GroupSettings from './components/chat/GroupSettings';
import Register from './components/chat/Register';
import { encryptionService } from './services/EncryptionService';
import { useChatStore } from './store/useChatStore';
import WebSocketClient from './services/WebSocketClient';
import { fetchBookmarks, fetchGroups, fetchStatuses, fetchMuteSettings } from './services/api';
import { ShieldAlert } from 'lucide-react';
import LicensingService from './services/LicensingService';

function App() {
  const { messagesByChat, activeChatId, isGroupChat, currentView, lastOpenedUnread,
    isRegistered, setIsRegistered, isMuted, setIsMuted, isSelfDestructEnabled, setIsSelfDestructEnabled,
    isEmergencyAlertActive, setIsEmergencyAlertActive, currentUser,
    setBookmarks, setUnverified, setGroups, setActiveChat, setCurrentView, clearActiveChat } = useChatStore();

  const [licenseState, setLicenseState] = React.useState({ loading: true, valid: false, error: null });

  const config = window.CHAT_CONFIG || {};
  const wsUrl = config.WS_URL ? config.WS_URL.replace(/\/chat\/ws\/chat\/[^/]+\//, `/chat/ws/chat/${currentUser}/`) : `ws://${window.location.host}/chat/ws/chat/${currentUser}/`;

  // 1. Effect for License Verification
  useEffect(() => {
    const rawLicense = config.LICENSE_INFO;
    LicensingService.verifyLicense(rawLicense).then(result => {
      window.CWU_VERIFIED_MODULES = result.modules || [];
      if (result.valid) {
        encryptionService.preDeriveKey();
        setIsSelfDestructEnabled(result.module_self_destruct === true);
      }
      setLicenseState({ loading: false, valid: !!result.valid, ...result });
    });
  }, []); // Only run once on mount

  // 2. Effect for WebSocket and Data Fetching (dependent on License)
  useEffect(() => {
    // ONLY proceed if license is valid AND user is registered
    if (licenseState.valid && isRegistered) {
      const wsClient = WebSocketClient.getInstance(wsUrl, currentUser);
      wsClient.connect();

      fetchMuteSettings().then(data => {
        setIsMuted(!!data.is_muted);
      }).catch(err => console.error(err));

      return () => {
        wsClient.disconnect();
      };
    }
  }, [wsUrl, currentUser, isRegistered, licenseState.valid]);

  // 3. Emergency Audio Alert — 2-second one-shot siren
  useEffect(() => {
    let audioCtx = null;

    if (isEmergencyAlertActive) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        // 2-second siren sweep
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
        osc.frequency.exponentialRampToValueAtTime(800, now + 1.0);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 1.5);
        osc.frequency.exponentialRampToValueAtTime(800, now + 2.0);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.1);
        gainNode.gain.setValueAtTime(0.25, now + 1.7);
        gainNode.gain.linearRampToValueAtTime(0, now + 2.0);

        osc.start(now);
        osc.stop(now + 2.0);
      } catch (err) {
        console.error("Emergency audio failed:", err);
      }
    }

    return () => {
      if (audioCtx) {
        audioCtx.close().catch(() => { });
      }
    };
  }, [isEmergencyAlertActive]);

  const handleSelectChat = (chatId, isGroup) => {
    setActiveChat(chatId, isGroup);
    setCurrentView('chat');
  };

  const handleBack = () => {
    clearActiveChat();
    setCurrentView('contacts');
  };

  const handleSendMessage = (text, attachment = null, timerSeconds = 0) => {
    if (!activeChatId) return;
    const wsClient = WebSocketClient.getInstance();

    let msgType = 0; // TEXT
    if (attachment && attachment.type && attachment.type.startsWith('audio/')) {
      msgType = 1; // PTT
    }

    wsClient.sendMessage(activeChatId, text, isGroupChat, msgType, attachment, timerSeconds);
  };

  if (!isRegistered) {
    return <Register />;
  }

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
      {isEmergencyAlertActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 z-[9999] animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
      )}
      {currentView === 'contacts' && (
        <Sidebar onSelectChat={handleSelectChat} />
      )}
      {currentView === 'chat' && (
        <ChatArea
          onSendMessage={handleSendMessage}
          onBack={handleBack}
          currentUser={currentUser}
          openedUnread={lastOpenedUnread}
          license={licenseState}
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
