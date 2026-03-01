import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookmarkPlus, BookmarkMinus, User as UserIcon } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { fetchAllUsers, addBookmark, removeBookmark } from '../../services/api';

const DiscoverUsers = ({ onBack }) => {
    const { setAllUsers, allUsers, addBookmark: addToStore, removeBookmark: removeFromStore } = useChatStore();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllUsers().then(users => {
            setAllUsers(users);
            setLoading(false);
        });
    }, [setAllUsers]);

    const handleToggleBookmark = async (user) => {
        if (user.is_bookmarked) {
            await removeBookmark(user.username);
            removeFromStore(user.username);
            // Update local allUsers state
            setAllUsers(allUsers.map(u => u.username === user.username ? { ...u, is_bookmarked: false } : u));
        } else {
            await addBookmark(user.username);
            addToStore({ username: user.username, name: user.name, role: user.role });
            setAllUsers(allUsers.map(u => u.username === user.username ? { ...u, is_bookmarked: true } : u));
        }
    };

    const filtered = allUsers.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
    );

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
                    placeholder="Search users..."
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder-slate-500 outline-none focus:border-emerald-800"
                    style={{ boxShadow: 'none' }}
                />
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1">
                {loading && <p className="text-xs text-slate-500 font-mono p-2">Loading...</p>}
                {filtered.map((user) => (
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
                {!loading && filtered.length === 0 && (
                    <p className="text-xs text-slate-500 font-mono p-2">No users found</p>
                )}
            </div>
        </div>
    );
};

export default DiscoverUsers;
