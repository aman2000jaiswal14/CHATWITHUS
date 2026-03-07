import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, User as UserIcon, Check } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { searchUsers } from '../../services/api';

const AddGroupMember = ({ onBack }) => {
    const { activeChatId, groups, setGroups, setCurrentView } = useChatStore();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const config = window.CHAT_CONFIG || {};

    const group = groups.find(g => String(g.id) === activeChatId);

    const handleSearch = async (newSearch = search, newPage = 1) => {
        if (!newSearch.trim() && newPage === 1) {
            setUsers([]);
            return;
        }
        setLoading(true);
        try {
            const data = await searchUsers(newSearch, newPage);
            if (newPage === 1) {
                setUsers(data.users);
            } else {
                setUsers(prev => [...prev, ...data.users]);
            }
            setHasMore(data.has_more);
            setPage(newPage);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(search, 1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

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

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                {users.map((user) => (
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

                {loading && <p className="text-xs text-slate-500 font-mono p-2">Searching...</p>}

                {!loading && hasMore && (
                    <button
                        onClick={() => handleSearch(search, page + 1)}
                        className="w-full py-2 text-xs text-emerald-500 hover:text-emerald-400 font-mono"
                    >
                        Load More Results
                    </button>
                )}

                {!loading && users.length === 0 && search.trim() && (
                    <p className="text-xs text-slate-500 font-mono p-2 text-center mt-4">No users found for "{search}"</p>
                )}
            </div>
        </div>
    );
};

export default AddGroupMember;
