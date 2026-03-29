import React, { useState } from 'react';
import { ArrowLeft, LogOut, Pencil, Check, X, Shield, Users, Calendar, Crown, Download } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { leaveGroup, renameGroup } from '../../services/api';
import ExportModal from './ExportModal';

const config = () => window.CHAT_CONFIG || {};

const GroupSettings = ({ onBack }) => {
    const { activeChatId, groups, setGroups, setCurrentView } = useChatStore();
    const currentUser = config().USER_ID || '';
    const group = groups.find(g => String(g.id) === activeChatId);
    const isAdmin = group?.is_admin || false;

    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState(group?.name || '');
    const [saving, setSaving] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showExport, setShowExport] = useState(false);

    const handleLeave = async () => {
        const result = await leaveGroup(activeChatId);
        if (result.status === 'left') {
            setGroups(groups.filter(g => String(g.id) !== activeChatId));
            useChatStore.setState({ activeChatId: null, isGroupChat: false });
            setCurrentView('contacts');
        }
    };

    const handleRename = async () => {
        if (!newName.trim() || newName === group?.name) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            const data = await renameGroup(activeChatId, newName.trim());
            if (data.status === 'renamed') {
                setGroups(groups.map(g =>
                    String(g.id) === activeChatId ? { ...g, name: data.name } : g
                ));
            }
        } catch (err) {
            console.error('Rename failed:', err);
        }
        setSaving(false);
        setEditing(false);
    };

    if (!group) {
        return (
            <div className="w-full bg-[#0f172a] flex flex-col h-full text-white items-center justify-center">
                <p className="text-slate-500 text-sm">Group not found</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#0b1121] flex flex-col h-full text-white">
            {/* Header */}
            <div className="h-14 border-b border-slate-800 flex items-center px-4 gap-3 bg-[#0f172a] flex-shrink-0">
                <button onClick={onBack} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-800 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="font-semibold text-sm uppercase tracking-wide">Group Settings</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Group Avatar & Name */}
                <div className="flex flex-col items-center py-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-800/60 to-emerald-900/40 border-2 border-emerald-700/50 flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/20">
                        <Users className="w-10 h-10 text-emerald-400" />
                    </div>
                    {editing ? (
                        <div className="flex items-center gap-2 w-full max-w-[250px]">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="flex-1 bg-[#1e293b] border border-emerald-700/50 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-emerald-500 transition-colors"
                                style={{ boxShadow: 'none' }}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            />
                            <button onClick={handleRename} disabled={saving}
                                className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 disabled:opacity-50 transition-colors">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditing(false)}
                                className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold tracking-tight">{group.name}</h2>
                            {isAdmin && (
                                <button onClick={() => { setNewName(group.name); setEditing(true); }}
                                    className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors rounded-md hover:bg-slate-800" title="Rename">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1e293b]/80 rounded-xl p-4 border border-slate-700/50 text-center">
                        <Users className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xl font-bold">{group.member_count || 0}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Members</p>
                    </div>
                    <div className="bg-[#1e293b]/80 rounded-xl p-4 border border-slate-700/50 text-center">
                        <Crown className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold truncate">{isAdmin ? 'Admin' : 'Member'}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Your Role</p>
                    </div>
                </div>

                {/* Details */}
                <div className="bg-[#1e293b]/80 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-400">Created by</span>
                        </div>
                        <span className="text-sm font-medium">{group.creator || '—'}</span>
                    </div>
                </div>

                {/* Export Messages */}
                <button
                    onClick={() => setShowExport(true)}
                    className="w-full bg-[#1e293b]/80 rounded-xl border border-slate-700/50 p-4 flex items-center gap-3 hover:bg-slate-700/50 transition-colors text-left"
                >
                    <div className="w-9 h-9 rounded-lg bg-emerald-900/30 border border-emerald-800/50 flex items-center justify-center flex-shrink-0">
                        <Download className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">Export Messages</p>
                        <p className="text-[10px] text-slate-500">Download chat history as .txt file</p>
                    </div>
                </button>
            </div>

            {/* Leave Group */}
            <div className="p-4 border-t border-slate-800/50 flex-shrink-0 bg-[#0f172a]/50">
                {showLeaveConfirm ? (
                    <div className="space-y-3">
                        <p className="text-xs text-center text-red-400 font-medium">Are you sure you want to leave this group?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowLeaveConfirm(false)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLeave}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Leave
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowLeaveConfirm(true)}
                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold transition-all uppercase tracking-wider flex items-center justify-center gap-2 hover:border-red-400/50"
                    >
                        <LogOut className="w-4 h-4" />
                        Leave Group
                    </button>
                )}
            </div>
            {showExport && (
                <ExportModal
                    chatId={activeChatId}
                    isGroup={true}
                    chatName={group.name}
                    onClose={() => setShowExport(false)}
                />
            )}
        </div>
    );
};

export default GroupSettings;
