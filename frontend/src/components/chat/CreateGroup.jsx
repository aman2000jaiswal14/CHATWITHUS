import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, User as UserIcon } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { searchUsers, createGroup } from '../../services/api';
import WebSocketClient from '../../services/WebSocketClient';

const CreateGroup = ({ onBack }) => {
    const { addGroup, setCurrentView } = useChatStore();
    const [name, setName] = useState('');
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

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

    return (
        <div className="w-full bg-[#0f172a] flex flex-col h-full text-white">
            <div className="h-12 border-b border-slate-800 flex items-center px-3 gap-2 flex-shrink-0">
                <button onClick={onBack} className="p-1 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-sm uppercase tracking-wide">Create Group</span>
            </div>

            <div className="px-3 py-2 flex-shrink-0 space-y-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Group name..."
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder-slate-500 outline-none focus:border-emerald-800"
                    style={{ boxShadow: 'none' }}
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder-slate-500 outline-none focus:border-emerald-800"
                    style={{ boxShadow: 'none' }}
                />
            </div>

            <div className="px-3 mb-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Select Members ({selected.size})</p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
                {users.map((user) => {
                    const isSelected = selected.has(user.username);
                    return (
                        <div
                            key={user.username}
                            onClick={() => toggleUser(user.username)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-emerald-900/30 ring-1 ring-emerald-800' : 'hover:bg-slate-800'
                                }`}
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-[10px] text-slate-500">@{user.username}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        </div>
                    );
                })}

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

            <div className="p-3 border-t border-slate-800 flex-shrink-0">
                <button
                    onClick={handleCreate}
                    disabled={!name.trim() || creating}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-semibold transition-colors uppercase tracking-wide"
                >
                    {creating ? 'Creating...' : 'Create Group'}
                </button>
            </div>
        </div>
    );
};

export default CreateGroup;
