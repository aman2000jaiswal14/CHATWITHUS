import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookmarkPlus, BookmarkMinus, User as UserIcon } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { searchUsers, addBookmark, removeBookmark, fetchStatuses } from '../../services/api';

const DiscoverUsers = ({ onBack }) => {
    const { addBookmark: addToStore, removeBookmark: removeFromStore, updatePresence } = useChatStore();
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
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

    const handleToggleBookmark = async (user) => {
        if (user.is_bookmarked) {
            await removeBookmark(user.username);
            removeFromStore(user.username);
            setUsers(users.map(u => u.username === user.username ? { ...u, is_bookmarked: false } : u));
        } else {
            await addBookmark(user.username);
            addToStore({ username: user.username, name: user.name, role: user.role });
            setUsers(users.map(u => u.username === user.username ? { ...u, is_bookmarked: true } : u));
            // Refresh statuses so the new contact shows correct online/offline state
            try {
                const statusData = await fetchStatuses();
                Object.entries(statusData.statuses || {}).forEach(([uid, s]) => {
                    updatePresence(uid, s);
                });
            } catch (e) { /* ignore */ }
        }
    };

    return (
        <div className="w-full bg-[#0f172a] flex flex-col h-full text-white">
            <div className="h-12 border-b border-slate-800 flex items-center px-3 gap-2 flex-shrink-0">
                <button onClick={onBack} className="p-1 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-sm uppercase tracking-wide">Add Contacts</span>
            </div>

            <div className="px-3 py-2 flex-shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search 50,000+ users..."
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder-slate-500 outline-none focus:border-emerald-800"
                    style={{ boxShadow: 'none' }}
                />
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
                {users.map((user) => (
                    <div key={user.username} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">@{user.username} · {user.role}</p>
                        </div>
                        <button
                            onClick={() => handleToggleBookmark(user)}
                            className={`p-1.5 rounded-md transition-colors ${user.is_bookmarked
                                ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                                }`}
                            title={user.is_bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                        >
                            {user.is_bookmarked ? <BookmarkMinus className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
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

export default DiscoverUsers;
