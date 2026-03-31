import React, { useState } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { User, Shield, Briefcase, UserCircle } from 'lucide-react';

const Register = () => {
    const config = window.CHAT_CONFIG || {};
    const [formData, setFormData] = useState({
        username: config.USER_ID || '',
        name: '',
        role: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setIsRegistered, setCurrentUser } = useChatStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const baseUrl = config.API_BASE_URL || '';
            const res = await fetch(`${baseUrl}/chat/api/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': config.CSRF_TOKEN || ''
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setCurrentUser(formData.username);
                setIsRegistered(true);
                // No more window.location.reload(); 
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0f1c] p-6 text-slate-300">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <UserCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
                    <p className="mt-2 text-sm text-slate-500">Welcome! Please register to start chatting.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                Full Name
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl leading-5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all sm:text-sm"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                Username
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Shield className="h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl leading-5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all sm:text-sm"
                                    placeholder="Choose a username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                Role
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Briefcase className="h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl leading-5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all sm:text-sm"
                                    placeholder="e.g. Developer, Manager"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : 'Complete Setup'}
                    </button>

                    <p className="text-[10px] text-center text-slate-600 mt-4 leading-relaxed px-4">
                        By registering, you'll be set up with a secure account using our default organization credentials.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;
