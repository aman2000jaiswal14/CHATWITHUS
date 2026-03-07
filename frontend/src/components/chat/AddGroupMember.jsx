import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, User as UserIcon, Check } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { fetchAllUsers } from '../../services/api';

const AddGroupMember = ({ onBack }) => {
    const { activeChatId, groups, setGroups, setCurrentView } = useChatStore();
    const [allUsers, setAllUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(null);

    const config = window.CHAT_CONFIG || {};

    const group = groups.find(g => String(g.id) === activeChatId);

    useEffect(() => {
        fetchAllUsers().then(users => {
            setAllUsers(users);
            setLoading(false);
        });
    }, []);

    const handleAddMember = async (username) => {
        setAdding(username);
        try {
            const res = await fetch(`/chat/api/groups/${activeChatId}/add_member/`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': config.CSRF_TOKEN || '',
                    'X-Chat-User': config.USER_ID || '',
                },
                body: JSON.stringify({ username }),
            });
            const data = await res.json();
            if (data.status === 'added') {
                // Update local group member count
                setGroups(groups.map(g =>
                    String(g.id) === activeChatId ? { ...g, member_count: g.member_count + 1 } : g
                ));
            }
        } catch (err) {
            console.error('Failed to add member:', err);
        }
        setAdding(null);
    };

    const filtered = allUsers.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-full bg-[#0f172a] flex flex-col h-full text-white">
            <div className="h-12 border-b border-slate-800 flex items-center px-3 gap-2 flex-shrink-0">
                <button onClick={() => setCurrentView('chat')} className="p-1 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                    <span className="font-semibold text-sm uppercase tracking-wide">Add Member</span>
                    {group && <span className="text-[10px] text-emerald-400 block font-mono">{group.name}</span>}
                </div>
            </div>

            <div className="px-3 py-2 flex-shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder-slate-500 outline-none focus:border-emerald-800"
                    style={{ boxShadow: 'none' }}
                />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {loading && <p className="text-xs text-slate-500 font-mono p-2">Loading...</p>}
                {!loading && filtered.length === 0 && (
                    <p className="text-xs text-slate-500 font-mono p-2">No users found</p>
                )}
                {filtered.map((user) => (
                    <div key={user.username} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500">@{user.username}</p>
                        </div>
                        <button
                            onClick={() => handleAddMember(user.username)}
                            disabled={adding === user.username}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-md transition-colors disabled:opacity-50"
                            title="Add to group"
                        >
                            {adding === user.username ? (
                                <Check className="w-4 h-4 text-yellow-400" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AddGroupMember;
