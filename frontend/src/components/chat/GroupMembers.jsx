import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserMinus, UserPlus, User as UserIcon, Shield, ShieldPlus, LogOut } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { fetchGroupMembers, removeGroupMember, fetchAllUsers, addGroupMember, leaveGroup, makeGroupAdmin } from '../../services/api';

const GroupMembers = ({ onBack }) => {
    const { activeChatId, groups, setGroups, setCurrentView } = useChatStore();
    const [members, setMembers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddUser, setShowAddUser] = useState(false);
    const [removing, setRemoving] = useState(null);
    const [adding, setAdding] = useState(null);
    const [promoting, setPromoting] = useState(null);

    const config = window.CHAT_CONFIG || {};
    const currentUser = config.USER_ID || '';
    const group = groups.find(g => String(g.id) === activeChatId);

    useEffect(() => {
        fetchGroupMembers(activeChatId).then(data => {
            setMembers(data.members || []);
            setIsAdmin(data.is_admin || false);
            setLoading(false);
        });
    }, [activeChatId]);

    const handleRemove = async (username) => {
        setRemoving(username);
        const result = await removeGroupMember(activeChatId, username);
        if (result.status === 'removed') {
            setMembers(members.filter(m => m.username !== username));
            setGroups(groups.map(g =>
                String(g.id) === activeChatId ? { ...g, member_count: g.member_count - 1 } : g
            ));
        }
        setRemoving(null);
    };

    const handleMakeAdmin = async (username) => {
        setPromoting(username);
        const result = await makeGroupAdmin(activeChatId, username);
        if (result.status === 'promoted') {
            setMembers(members.map(m => m.username === username ? { ...m, is_admin: true } : m));
        }
        setPromoting(null);
    };

    const handleLeave = async () => {
        const result = await leaveGroup(activeChatId);
        if (result.status === 'left') {
            if (result.group_deleted) {
                setGroups(groups.filter(g => String(g.id) !== activeChatId));
            } else {
                setGroups(groups.filter(g => String(g.id) !== activeChatId));
            }
            setCurrentView('contacts');
        }
    };

    const handleShowAdd = async () => {
        setShowAddUser(true);
        const users = await fetchAllUsers();
        const memberUsernames = new Set(members.map(m => m.username));
        setAllUsers(users.filter(u => !memberUsernames.has(u.username)));
    };

    const handleAdd = async (username) => {
        setAdding(username);
        const result = await addGroupMember(activeChatId, username);
        if (result.status === 'added') {
            const user = allUsers.find(u => u.username === username);
            setMembers([...members, { username, name: user?.name || username, role: user?.role || '', is_admin: false }]);
            setAllUsers(allUsers.filter(u => u.username !== username));
            setGroups(groups.map(g =>
                String(g.id) === activeChatId ? { ...g, member_count: g.member_count + 1 } : g
            ));
        } else if (result.status === 'already_member') {
            setAllUsers(allUsers.filter(u => u.username !== username));
        }
        setAdding(null);
    };

    return (
        <div className="w-full bg-[#0f172a] flex flex-col h-full text-white">
            <div className="h-12 border-b border-slate-800 flex items-center px-3 gap-2 flex-shrink-0">
                <button onClick={onBack} className="p-1 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm uppercase tracking-wide">Members</span>
                    {group && <span className="text-[10px] text-emerald-400 block font-mono">{group.name}</span>}
                </div>
                {isAdmin && !showAddUser && (
                    <button onClick={handleShowAdd} className="p-1.5 text-emerald-400 hover:bg-slate-800 rounded-md transition-colors" title="Add member">
                        <UserPlus className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {loading && <p className="text-xs text-slate-500 font-mono p-2">Loading...</p>}

                {/* Current members */}
                {!showAddUser && members.map((member) => (
                    <div key={member.username} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <p className="text-sm font-medium truncate">{member.name}</p>
                                {member.is_admin && <Shield className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-slate-500">@{member.username}{member.is_admin ? ' · Admin' : ''}</p>
                        </div>
                        {isAdmin && !member.is_admin && member.username !== currentUser && (
                            <div className="flex gap-1">
                                <button onClick={() => handleMakeAdmin(member.username)}
                                    disabled={promoting === member.username}
                                    className="p-1 text-amber-400 hover:bg-amber-900/30 rounded transition-colors disabled:opacity-50"
                                    title="Make admin">
                                    <ShieldPlus className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleRemove(member.username)}
                                    disabled={removing === member.username}
                                    className="p-1 text-red-400 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                                    title="Remove">
                                    <UserMinus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add user panel */}
                {showAddUser && (
                    <>
                        <div className="flex items-center justify-between py-1">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Add New Members</p>
                            <button onClick={() => setShowAddUser(false)} className="text-[10px] text-emerald-400 hover:underline">Done</button>
                        </div>
                        {allUsers.length === 0 && <p className="text-xs text-slate-500 font-mono p-2">All users are already members</p>}
                        {allUsers.map((user) => (
                            <div key={user.username} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <UserIcon className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <p className="text-[10px] text-slate-500">@{user.username}</p>
                                </div>
                                <button onClick={() => handleAdd(user.username)}
                                    disabled={adding === user.username}
                                    className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-md transition-colors disabled:opacity-50">
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Leave Group Button */}
            {!showAddUser && (
                <div className="p-3 border-t border-slate-800 flex-shrink-0">
                    <button
                        onClick={handleLeave}
                        className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 rounded-lg text-sm font-semibold transition-colors uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Leave Group
                    </button>
                </div>
            )}
        </div>
    );
};

export default GroupMembers;
