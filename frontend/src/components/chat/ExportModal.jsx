import React, { useState } from 'react';
import { Download, X, Calendar, FileText, Loader2 } from 'lucide-react';

const ExportModal = ({ chatId, isGroup, chatName, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);
    const [exporting, setExporting] = useState(false);
    const [includeAttachments, setIncludeAttachments] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({
                is_group: String(isGroup),
                from: dateFrom,
                to: dateTo,
                include_attachments: String(includeAttachments),
            });
            const config = window.CHAT_CONFIG || {};
            const baseUrl = config.API_BASE_URL || '';
            const apiUrl = `${baseUrl}/chat/api/export/${chatId}/?${params}`;

            const response = await fetch(apiUrl, {
                credentials: 'same-origin',
                headers: {
                    'X-Chat-User': config.USER_ID || ''
                }
            });

            if (!response.ok) {
                const err = await response.json();
                alert(err.error || 'Export failed');
                setExporting(false);
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const extension = includeAttachments ? 'zip' : 'txt';
            a.download = `chat_export_${chatId}_${dateFrom || 'all'}_${dateTo || 'now'}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            onClose();
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        }
        setExporting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-800 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Export Messages</h3>
                            <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{chatName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Date Range */}
                <div className="p-4 space-y-4">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                            <Calendar className="w-3 h-3" /> From Date
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            max={dateTo || today}
                            className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
                            style={{ colorScheme: 'dark' }}
                        />
                        <p className="text-[9px] text-slate-600 mt-1">Leave empty to export from the beginning</p>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                            <Calendar className="w-3 h-3" /> To Date
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            min={dateFrom}
                            max={today}
                            className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2 px-1">
                        <input
                            type="checkbox"
                            id="include-attachments"
                            checked={includeAttachments}
                            onChange={e => setIncludeAttachments(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-[#0f172a]"
                        />
                        <label htmlFor="include-attachments" className="text-xs text-slate-400 cursor-pointer select-none">
                            Include Attachment Links
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-slate-800 flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleExport} disabled={exporting}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {exporting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
                        ) : (
                            <><Download className="w-4 h-4" /> Export</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
