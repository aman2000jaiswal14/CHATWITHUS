import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, ShieldAlert, ArrowLeft, Settings, Users, Download } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import ExportModal from './ExportModal';

const ChatArea = ({ messages, onSendMessage, onBack, currentUser, openedUnread = 0 }) => {
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const { activeChatId, isGroupChat, bookmarks, groups, setCurrentView, setMessages, fetchedChats } = useChatStore();
    const scrollRef = useRef(null);
    const [unreadStartIdx, setUnreadStartIdx] = useState(null);
    const [showExport, setShowExport] = useState(false);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeChatId]);

    // Fetch history and determine unread marker
    useEffect(() => {
        if (!activeChatId) return;

        if (!fetchedChats.has(activeChatId)) {
            fetch(`/chat/api/history/${activeChatId}/?is_group=${isGroupChat}`)
                .then(res => res.json())
                .then(data => {
                    if (data.messages) {
                        const processed = data.messages.map(m => ({
                            ...m,
                            payload: m.payload ? new Uint8Array(m.payload.match(/.{1,2}/g).map(byte => parseInt(byte, 16))) : null
                        }));
                        setMessages(activeChatId, processed);

                        // After merging, set unread marker
                        if (openedUnread > 0) {
                            const total = (useChatStore.getState().messagesByChat[activeChatId] || []).length;
                            setUnreadStartIdx(Math.max(0, total - openedUnread));
                        } else {
                            setUnreadStartIdx(null);
                        }
                    }
                })
                .catch(console.error);
        } else {
            // Already fetched — use openedUnread prop directly
            if (openedUnread > 0) {
                setUnreadStartIdx(Math.max(0, messages.length - openedUnread));
            } else {
                setUnreadStartIdx(null);
            }
        }
    }, [activeChatId]);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(Number(timestamp));
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    let chatName = activeChatId || "SECURE CHANNEL";
    if (isGroupChat) {
        const group = groups.find(g => String(g.id) === activeChatId);
        if (group) chatName = group.name;
    } else {
        const contact = bookmarks.find(c => c.username === activeChatId);
        if (contact) chatName = contact.name;
    }

    return (
        <div className="flex-1 flex flex-col bg-[#0b1121] text-gray-200 h-full">
            {/* Header */}
            <div className="h-14 border-b border-slate-800 flex items-center px-3 gap-2 bg-[#0f172a] shadow-sm z-10 flex-shrink-0">
                <button onClick={onBack} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <span className="font-semibold tracking-wide uppercase text-sm block truncate">{chatName}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">ENCRYPTED</span>
                </div>
                {isGroupChat && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCurrentView('group_members')}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-md transition-colors"
                            title="Members"
                        >
                            <Users className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentView('group_settings')}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <button
                    onClick={() => setShowExport(true)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                    title="Export Messages"
                >
                    <Download className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-slate-600 font-mono text-xs">
                        [NO MESSAGES YET — START TRANSMITTING]
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isOwn = String(msg.senderId).toLowerCase() === String(currentUser).toLowerCase();
                    const isUnread = unreadStartIdx !== null && idx >= unreadStartIdx && !isOwn;
                    const showBanner = unreadStartIdx !== null && idx === unreadStartIdx;

                    return (
                        <React.Fragment key={msg.messageId || idx}>
                            {showBanner && idx > 0 && (
                                <div className="flex items-center gap-2 py-3">
                                    <div className="flex-1 h-px bg-amber-500/30"></div>
                                    <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/30">
                                        ● {messages.length - unreadStartIdx} New
                                    </span>
                                    <div className="flex-1 h-px bg-amber-500/30"></div>
                                </div>
                            )}
                            <div className={`flex flex-col max-w-[85%] ${isOwn ? 'self-end ml-auto' : 'self-start mr-auto'}`}>
                                <div className="flex items-baseline gap-1.5 mb-0.5">
                                    <span className={`text-[10px] font-semibold ${isOwn ? 'text-slate-400' : 'text-emerald-500'}`}>{isOwn ? 'ME' : msg.senderId}</span>
                                    <span className="text-[9px] text-slate-600 font-mono">{formatTime(msg.sentAt)}</span>
                                </div>
                                <div className={`px-3 py-2 rounded-lg text-sm shadow-sm border transition-all duration-300
                                    ${isUnread
                                        ? 'bg-amber-900/20 border-amber-500/40 text-amber-50 ring-1 ring-amber-500/30'
                                        : msg.isHighPriority
                                            ? 'bg-red-900/50 border-red-500 text-red-100'
                                            : isOwn
                                                ? 'bg-emerald-900/20 border-emerald-700 text-slate-100'
                                                : 'bg-[#1e293b] border-slate-700 text-slate-200'
                                    }`}>
                                    {msg.type === 0 && <p className="break-words">{msg.payload ? new TextDecoder().decode(msg.payload) : 'Encrypted'}</p>}
                                    {msg.type === 1 && (
                                        <div className="flex items-center gap-2">
                                            <Mic className="text-emerald-400 w-4 h-4" />
                                            <span className="font-mono text-xs">BURST AUDIO [PTT]</span>
                                        </div>
                                    )}
                                    {msg.type === 2 && (
                                        <div className="flex items-center gap-2 font-bold uppercase text-red-400">
                                            <ShieldAlert className="w-4 h-4" />
                                            <span className="text-xs">COMMANDER OVERRIDE</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-2 bg-[#0f172a] border-t border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-1 bg-[#1e293b] rounded-lg p-1.5 border border-slate-700 focus-within:border-emerald-800 transition-colors">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type message..."
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder-slate-500 px-2 focus:ring-0"
                        style={{ boxShadow: 'none' }}
                    />
                    <button
                        onMouseDown={() => setIsRecording(true)}
                        onMouseUp={() => setIsRecording(false)}
                        onMouseLeave={() => setIsRecording(false)}
                        className={`p-1.5 transition-colors rounded-md ${isRecording ? 'text-red-400 bg-red-400/10' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                        onClick={handleSend}
                        className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-md transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {showExport && (
                <ExportModal
                    chatId={activeChatId}
                    isGroup={isGroupChat}
                    chatName={chatName}
                    onClose={() => setShowExport(false)}
                />
            )}
        </div>
    );
};

export default ChatArea;
