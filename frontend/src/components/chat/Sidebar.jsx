import React, { useState } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { User, MessageCircle, Users, UserPlus, PlusCircle, BookmarkMinus, ShieldCheck, ShieldQuestion, ChevronDown, X, Bell, BellOff } from 'lucide-react';
import { removeBookmark, verifyBookmark, setUserStatus, updateMuteSettings } from '../../services/api';

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
        moveToUnverified, verifyContact, unreadCounts, isMuted, setIsMuted } = useChatStore();
    const [activeTab, setActiveTab] = useState('all');
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const config = window.CHAT_CONFIG || {};
    const currentUser = config.USER_ID || 'anonymous';
    const myPresence = presence[currentUser] || { status: 0, is_online: true };
    const myStatus = typeof myPresence === 'object' ? myPresence.status : myPresence;
    const currentStatusObj = STATUS_OPTIONS.find(s => s.value === myStatus) || STATUS_OPTIONS[0];

    const getStatusColor = (username) => {
        const p = presence[username];
        if (!p || !p.is_online) return 'bg-slate-500'; // Offline
        switch (p.status) {
            case 0: return 'bg-emerald-500';
            case 1: return 'bg-amber-500';
            case 2: return 'bg-indigo-500';
            case 3: return 'bg-rose-500';
            default: return 'bg-emerald-500';
        }
    };

    const getStatusLabel = (username) => {
        const p = presence[username];
        if (!p || !p.is_online) return 'Offline';
        switch (p.status) {
            case 0: return 'Online';
            case 1: return 'Away';
            case 2: return 'Sleeping';
            case 3: return 'Working';
            default: return 'Online';
        }
    };

    const handleStatusChange = async (status) => {
        try {
            await setUserStatus(status);
            useChatStore.getState().updatePresence(currentUser, { status, is_online: true });
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

    const filteredBookmarks = bookmarks.filter(b =>
        b.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.name && b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => (b.last_message_at || 0) - (a.last_message_at || 0));

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (b.last_message_at || 0) - (a.last_message_at || 0));

    const filteredUnverified = unverified.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (b.last_message_at || 0) - (a.last_message_at || 0));

    const renderGroupItem = (group) => {
        const gid = String(group.id);
        const isEmergency = gid.toLowerCase() === 'emergency';
        const unreadCount = unreadCounts[gid] || 0;

        return (
            <div key={group.id} onClick={() => onSelectChat(gid, true)}
                className={`flex items-center gap-2.5 p-2.5 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-all ${activeChatId === gid ? (isEmergency ? 'bg-red-950/30 ring-1 ring-red-500' : 'bg-slate-800 ring-1 ring-emerald-800') : ''} ${isEmergency ? 'border border-red-950/50 bg-red-950/10' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isEmergency ? 'bg-red-500/20 border border-red-500/30' : 'bg-emerald-900/40 border border-emerald-900'}`}>
                    <Users className={`w-4 h-4 ${isEmergency ? 'text-red-500' : 'text-emerald-500'}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isEmergency ? 'text-red-400 font-bold tracking-tight' : ''}`}>{group.name}</p>
                    <p className="text-[10px] text-slate-500">{isEmergency ? 'System Broadcast' : `${group.member_count} members`}</p>
                </div>
                {unreadCount > 0 && (
                    <div className={`${isEmergency ? 'bg-red-600' : 'bg-red-500'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]`}>
                        {unreadCount}
                    </div>
                )}
            </div>
        );
    };

    const renderContactItem = (contact) => {
        const cid = contact.username;
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
                    <div className="flex items-center gap-1.5 truncate">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        {contact.role && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                                {contact.role}
                            </span>
                        )}
                    </div>
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
        <div key={contact.username} onClick={() => onSelectChat(contact.username, false)}
            className="flex items-center gap-2.5 p-2.5 hover:bg-amber-900/20 rounded-xl cursor-pointer transition-all border border-amber-900/30 bg-amber-900/10">
            <div className="w-9 h-9 rounded-full bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldQuestion className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    {contact.role && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-500 uppercase tracking-tighter">
                            {contact.role}
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-amber-500/70 truncate flex items-center gap-1">
                    <span>@{contact.username}</span>
                    <span className="w-1 h-1 rounded-full bg-amber-500/30" />
                    <span>Click to verify</span>
                </p>
            </div>
            <button onClick={(e) => handleVerify(e, contact.username)}
                className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-colors" title="Accept">
                <ShieldCheck className="w-4 h-4" />
            </button>
        </div>
    );

    // Inject/Merge Emergency Broadcast group if licensed
    const isEmergencyLicensed = window.CWU_VERIFIED_MODULES && window.CWU_VERIFIED_MODULES.includes('EMERGENCY_BROADCAST');
    const serverEmergencyGroup = groups.find(g => g.id === 'emergency');

    const emergencyGroup = isEmergencyLicensed ? {
        id: 'emergency',
        name: 'EMERGENCY BROADCAST',
        isGroup: true,
        last_message_at: serverEmergencyGroup?.last_message_at || Infinity,
        unread_count: serverEmergencyGroup?.unread_count || 0
    } : null;

    const allItems = [
        ...(emergencyGroup ? [emergencyGroup] : []),
        ...filteredGroups.filter(g => g.id !== 'emergency').map(g => ({ ...g, isGroup: true })),
        ...filteredBookmarks.map(b => ({ ...b, isGroup: false })),
        ...filteredUnverified.map(u => ({ ...u, isGroup: false, isUnverified: true }))
    ].sort((a, b) => {
        if (a.id === 'emergency') return -1;
        if (b.id === 'emergency') return 1;
        return (b.last_message_at || 0) - (a.last_message_at || 0);
    });

    const displayGroups = filteredGroups.filter(g => g.id !== 'emergency');

    const groupUnread = displayGroups.reduce((sum, g) => sum + (unreadCounts[String(g.id)] || 0), 0);
    const contactUnread = filteredBookmarks.reduce((sum, c) => sum + (unreadCounts[c.username] || 0), 0);

    const showGroupsList = activeTab === 'all' || activeTab === 'groups';
    const showContacts = activeTab === 'all' || activeTab === 'contacts';
    const showUnverified = activeTab === 'all' || activeTab === 'unverified';

    const renderItems = () => {
        if (activeTab === 'all') {
            return allItems.map(item => {
                if (item.isGroup) return renderGroupItem(item);
                if (item.isUnverified) return renderUnverifiedItem(item);
                return renderContactItem(item);
            });
        }
        return (
            <>
                {showGroupsList && displayGroups.length > 0 && (
                    <div className="space-y-1">
                        {displayGroups.map(renderGroupItem)}
                    </div>
                )}

                {showContacts && filteredBookmarks.length > 0 && (
                    <div className="space-y-1">
                        {filteredBookmarks.map(renderContactItem)}
                    </div>
                )}

                {showUnverified && filteredUnverified.length > 0 && (
                    <div className="space-y-1">
                        {filteredUnverified.map(renderUnverifiedItem)}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="w-full bg-[#0f172a] flex flex-col h-full text-white">
            {/* Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="text-emerald-400 w-5 h-5" />
                    <h1 className="text-lg font-bold tracking-tight">CHAT APP</h1>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={async () => {
                            const newStatus = !isMuted;
                            setIsMuted(newStatus);
                            await updateMuteSettings(newStatus);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                        title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
                    >
                        {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4 text-emerald-400" />}
                    </button>
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
                    else if (tab.id === 'unverified') badge = filteredUnverified.length;
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

            {/* Search Bar */}
            <div className="px-3 py-3 border-b border-slate-800/50 bg-[#0f172a]/50">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search users or groups..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-700/50 transition-all font-mono"
                    />
                    <div className="absolute left-2.5 top-2 text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                {renderItems()}

                {allItems.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center opacity-50">
                        <MessageCircle className="w-8 h-8 text-slate-700 mb-2" />
                        <p className="text-xs text-slate-500 font-mono">No matches found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
