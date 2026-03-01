import React, { useState } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { User, MessageCircle, Users, UserPlus, PlusCircle, BookmarkMinus, ShieldCheck, ShieldQuestion, ChevronDown } from 'lucide-react';
import { removeBookmark, verifyBookmark, setUserStatus } from '../../services/api';
import WebSocketClient from '../../services/WebSocketClient';

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'groups', label: 'Groups' },
    { id: 'unverified', label: 'Unverified' },
];

const STATUS_OPTIONS = [
    { value: 0, label: 'Active', color: 'bg-green-500', icon: '🟢' },
    { value: 1, label: 'Away', color: 'bg-yellow-500', icon: '🟡' },
    { value: 2, label: 'Sleeping', color: 'bg-blue-400', icon: '🔵' },
    { value: 3, label: 'Working', color: 'bg-red-500', icon: '🔴' },
];

const Sidebar = ({ onSelectChat }) => {
    const { bookmarks, unverified, groups, presence, activeChatId, setCurrentView,
        moveToUnverified, verifyContact, unreadCounts } = useChatStore();
    const [activeTab, setActiveTab] = useState('all');
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    const config = window.CHAT_CONFIG || {};
    const currentUser = config.USER_ID || 'anonymous';
    const myStatus = presence[currentUser] ?? 0;
    const currentStatusObj = STATUS_OPTIONS.find(s => s.value === myStatus) || STATUS_OPTIONS[0];

    const getStatusColor = (userId) => {
        const s = presence[userId];
        const opt = STATUS_OPTIONS.find(o => o.value === s);
        return opt ? opt.color : 'bg-gray-500';
    };

    const getStatusLabel = (userId) => {
        const s = presence[userId];
        const opt = STATUS_OPTIONS.find(o => o.value === s);
        return opt ? opt.label : 'Offline';
    };

    const handleStatusChange = async (status) => {
        try {
            await setUserStatus(status);
            // The local store will be updated either by the API success or by the incoming WS broadcast.
            // But we can update it immediately for better UX.
            useChatStore.getState().updatePresence(currentUser, status);
        } catch (err) {
            console.error('Failed to set status:', err);
        }
        setShowStatusPicker(false);
    };

    const handleRemoveBookmark = async (e, username) => {
        e.stopPropagation();
        await removeBookmark(username);
        moveToUnverified(username);
    };

    const handleVerify = async (e, username) => {
        e.stopPropagation();
        await verifyBookmark(username);
        verifyContact(username);
    };

    // Count total unread for badge on tabs
    const groupUnread = groups.reduce((sum, g) => sum + (unreadCounts[String(g.id).toLowerCase()] || 0), 0);
    const contactUnread = bookmarks.reduce((sum, c) => sum + (unreadCounts[c.username.toLowerCase()] || 0), 0);

    const showGroups = activeTab === 'all' || activeTab === 'groups';
    const showContacts = activeTab === 'all' || activeTab === 'contacts';
    const showUnverified = activeTab === 'all' || activeTab === 'unverified';

    const renderGroupItem = (group) => {
        const gid = String(group.id).toLowerCase();
        return (
            <div key={group.id} onClick={() => onSelectChat(gid, true)}
                className={`flex items-center gap-2.5 p-2.5 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-all ${activeChatId === gid ? 'bg-slate-800 ring-1 ring-emerald-800' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-emerald-900/40 border border-emerald-900 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{group.name}</p>
                    <p className="text-[10px] text-slate-500">{group.member_count} members</p>
                </div>
                {unreadCounts[gid] > 0 && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center animate-pulse">
                        {unreadCounts[gid]}
                    </div>
                )}
            </div>
        );
    };

    const renderContactItem = (contact) => {
        const cid = contact.username.toLowerCase();
        return (
            <div key={contact.username} onClick={() => onSelectChat(cid, false)}
                className={`flex items-center gap-2.5 p-2.5 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-all group ${activeChatId === cid ? 'bg-slate-800 ring-1 ring-emerald-800' : ''}`}>
                <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] ${getStatusColor(contact.username)}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">@{contact.username} · {getStatusLabel(contact.username)}</p>
                </div>
                {unreadCounts[cid] > 0 && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center mr-1 animate-pulse">
                        {unreadCounts[cid]}
                    </div>
                )}
                <button onClick={(e) => handleRemoveBookmark(e, contact.username)}
                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded" title="Remove">
                    <BookmarkMinus className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    };

    const renderUnverifiedItem = (contact) => (
        <div key={contact.username} onClick={() => onSelectChat(contact.username.toLowerCase(), false)}
            className="flex items-center gap-2.5 p-2.5 hover:bg-amber-900/20 rounded-xl cursor-pointer transition-all border border-amber-900/30 bg-amber-900/10">
            <div className="w-9 h-9 rounded-full bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldQuestion className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{contact.name}</p>
                <p className="text-[10px] text-slate-500">@{contact.username}</p>
            </div>
            <button onClick={(e) => handleVerify(e, contact.username)}
                className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-colors" title="Accept">
                <ShieldCheck className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="w-full bg-[#0f172a] flex flex-col h-full text-white">
            {/* Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="text-emerald-400 w-5 h-5" />
                    <h1 className="text-lg font-bold tracking-tight">CHAT WITH US</h1>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setCurrentView('discover')}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors" title="Add Contact">
                        <UserPlus className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentView('create_group')}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors" title="Create Group">
                        <PlusCircle className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Profile / Status */}
            <div className="px-3 py-2.5 border-b border-slate-800/50 bg-[#0b1121]">
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center border border-emerald-800 shadow-lg">
                            <User className="w-5 h-5 text-emerald-300" />
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0b1121] ${currentStatusObj.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{currentUser}</p>
                        <div className="relative">
                            <button
                                onClick={() => setShowStatusPicker(!showStatusPicker)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${currentStatusObj.color}`}></span>
                                {currentStatusObj.label}
                                <ChevronDown className={`w-3 h-3 transition-transform ${showStatusPicker ? 'rotate-180' : ''}`} />
                            </button>
                            {showStatusPicker && (
                                <div className="absolute top-6 left-0 z-50 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleStatusChange(opt.value)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-700/50 transition-colors
                                                ${opt.value === myStatus ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-300'}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${opt.color}`}></span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 px-2 pt-1">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    let badge = 0;
                    if (tab.id === 'groups') badge = groupUnread;
                    else if (tab.id === 'contacts') badge = contactUnread;
                    else if (tab.id === 'unverified') badge = unverified.length;
                    else if (tab.id === 'all') badge = groupUnread + contactUnread;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all rounded-t-lg
                                ${isActive
                                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/10'
                                    : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'
                                }`}
                        >
                            {tab.label}
                            {badge > 0 && (
                                <span className={`absolute -top-0.5 right-1 text-[8px] font-bold px-1 py-px rounded-full min-w-[14px] inline-flex items-center justify-center
                                    ${tab.id === 'unverified' ? 'bg-amber-500 text-black' : 'bg-red-500 text-white'}`}>
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Groups Section */}
                {showGroups && (
                    <div>
                        {activeTab === 'all' && (
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <Users className="w-3 h-3 text-emerald-500" />
                                <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Groups</h2>
                                <span className="text-[9px] text-slate-600 ml-auto">{groups.length}</span>
                            </div>
                        )}
                        <div className="space-y-1">
                            {groups.length === 0 && (
                                <p className="text-[10px] text-slate-600 font-mono px-2 py-3 text-center">No groups yet — create one above</p>
                            )}
                            {groups.map(renderGroupItem)}
                        </div>
                    </div>
                )}

                {/* Divider between sections on All tab */}
                {activeTab === 'all' && groups.length > 0 && bookmarks.length > 0 && (
                    <div className="h-px bg-slate-800/50 my-1"></div>
                )}

                {/* Contacts Section */}
                {showContacts && (
                    <div>
                        {activeTab === 'all' && (
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Contacts</h2>
                                <span className="text-[9px] text-slate-600 ml-auto">{bookmarks.length}</span>
                            </div>
                        )}
                        <div className="space-y-1">
                            {bookmarks.length === 0 && (
                                <p className="text-[10px] text-slate-600 font-mono px-2 py-3 text-center">No contacts — tap + to add</p>
                            )}
                            {bookmarks.map(renderContactItem)}
                        </div>
                    </div>
                )}

                {/* Divider */}
                {activeTab === 'all' && unverified.length > 0 && (
                    <div className="h-px bg-slate-800/50 my-1"></div>
                )}

                {/* Unverified Section */}
                {showUnverified && unverified.length > 0 && (
                    <div>
                        {activeTab === 'all' && (
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <ShieldQuestion className="w-3 h-3 text-amber-400" />
                                <h2 className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">Unverified</h2>
                                <span className="text-[9px] text-amber-600 ml-auto">{unverified.length}</span>
                            </div>
                        )}
                        <div className="space-y-1">
                            {unverified.map(renderUnverifiedItem)}
                        </div>
                    </div>
                )}

                {/* Empty state for unverified tab */}
                {activeTab === 'unverified' && unverified.length === 0 && (
                    <p className="text-[10px] text-slate-600 font-mono px-2 py-6 text-center">No unverified contacts</p>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
