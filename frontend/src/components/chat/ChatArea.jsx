import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, ShieldAlert, ArrowLeft, Settings, Users, Download, Paperclip, X, FileText, Image as ImageIcon, Loader2, Play, Pause } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import ExportModal from './ExportModal';
import { markRead, uploadAttachment } from '../../services/api';
import encryptionService from '../../services/EncryptionService';

const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const config = window.CHAT_CONFIG || {};
    const base = config.API_BASE_URL || '';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${cleanBase}${cleanUrl}`;
};

const DecryptedImage = ({ url, alt }) => {
    const [decryptedUrl, setDecryptedUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;
        const decryptAndShow = async () => {
            try {
                const response = await fetch(url);
                const buffer = await response.arrayBuffer();
                const decrypted = await encryptionService.decryptBuffer(buffer);
                const blob = new Blob([decrypted]);
                const localUrl = URL.createObjectURL(blob);
                if (isMounted) setDecryptedUrl(localUrl);
            } catch (err) {
                console.error("Image decryption failed:", err);
                if (isMounted) setDecryptedUrl(url); // Fallback to raw URL
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        decryptAndShow();
        return () => {
            isMounted = false;
            if (decryptedUrl && decryptedUrl.startsWith('blob:')) {
                URL.revokeObjectURL(decryptedUrl);
            }
        };
    }, [url]);

    const handleDownload = (e) => {
        e.stopPropagation();
        if (!decryptedUrl) return;
        const a = document.createElement('a');
        a.href = decryptedUrl;
        a.download = alt || 'image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) return <div className="w-full h-32 bg-slate-800 animate-pulse flex items-center justify-center text-[10px] text-slate-500 font-mono">DECRYPTING...</div>;
    return (
        <div className="relative group/img cursor-pointer" onClick={() => window.open(decryptedUrl, '_blank')}>
            <img src={decryptedUrl} alt={alt} className="w-full h-auto block" />
            <button
                onClick={handleDownload}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
                title="Download"
            >
                <Download size={14} />
            </button>
        </div>
    );
};

const DecryptedFile = ({ url, name, size }) => {
    const [decrypting, setDecrypting] = React.useState(false);

    const handleDownload = async () => {
        setDecrypting(true);
        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const decrypted = await encryptionService.decryptBuffer(buffer);
            const blob = new Blob([decrypted]);
            const localUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = localUrl;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(localUrl);
        } catch (err) {
            console.error("File decryption failed:", err);
            window.open(url, '_blank'); // Fallback
        } finally {
            setDecrypting(false);
        }
    };

    return (
        <div className="mt-2 flex items-center gap-3 p-2 rounded-lg border border-slate-700 bg-slate-800/50 group hover:bg-slate-800 transition-colors">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{name}</p>
                <p className="text-[10px] text-slate-500">{(size / 1024).toFixed(1)} KB</p>
            </div>
            <button
                onClick={handleDownload}
                disabled={decrypting}
                className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
            >
                {decrypting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </button>
        </div>
    );
};

const DecryptedAudio = ({ url, name }) => {
    const [decryptedUrl, setDecryptedUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
    const audioRef = React.useRef(null);

    React.useEffect(() => {
        let isMounted = true;
        const decryptAndShow = async () => {
            try {
                const response = await fetch(url);
                const buffer = await response.arrayBuffer();
                const decrypted = await encryptionService.decryptBuffer(buffer);
                const blob = new Blob([decrypted], { type: 'audio/webm' });
                const localUrl = URL.createObjectURL(blob);
                if (isMounted) setDecryptedUrl(localUrl);
            } catch (err) {
                console.error("Audio decryption failed:", err);
                if (isMounted) setDecryptedUrl(url); // Fallback to raw URL
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        decryptAndShow();
        return () => {
            isMounted = false;
            if (decryptedUrl && decryptedUrl.startsWith('blob:')) {
                URL.revokeObjectURL(decryptedUrl);
            }
        };
    }, [url]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleSpeed = () => {
        if (!audioRef.current) return;
        let nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
        audioRef.current.playbackRate = nextSpeed;
        setPlaybackSpeed(nextSpeed);
    };

    const handleDownload = () => {
        if (!decryptedUrl) return;
        const a = document.createElement('a');
        a.href = decryptedUrl;
        a.download = name || 'voice_message.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        // Sometimes duration is infinity or NaN until loaded, grab from state if valid
        const total = isFinite(audioRef.current.duration) ? audioRef.current.duration : 0;
        setCurrentTime(current);
        if (total > 0) {
            setProgress((current / total) * 100);
            setDuration(total);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioRef.current.currentTime = percent * duration;
    };

    const formatTime = (time) => {
        if (!time || isNaN(time) || !isFinite(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-1 h-12 w-64">
                <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                    <Loader2 size={14} className="text-emerald-500 animate-spin" />
                </div>
                <div className="flex-1 flex flex-col gap-1.5 pr-3">
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-600 rounded-full w-1/3 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 p-1 w-64 group/audio">
            <audio
                ref={audioRef}
                src={decryptedUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onLoadedMetadata={handleTimeUpdate}
                className="hidden"
            />
            <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
            </button>
            <div className="flex-1 flex flex-col gap-1 pr-1">
                <div
                    className="h-1.5 w-full bg-slate-700/80 rounded-full cursor-pointer overflow-hidden flex items-center group/scrub"
                    onClick={handleSeek}
                >
                    <div
                        className="h-full bg-emerald-400 transition-all duration-75 relative"
                        style={{ width: `${Math.max(2, progress)}%` }} // Minimum width so it's visible
                    />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                    <span>{formatTime(currentTime)}</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSpeed}
                            className="hover:text-emerald-400 transition-colors bg-slate-800 px-1 rounded"
                            title="Playback Speed"
                        >
                            {playbackSpeed}x
                        </button>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
            <button
                onClick={handleDownload}
                className="p-1 px-1.5 text-slate-500 hover:text-emerald-400 opacity-0 group-hover/audio:opacity-100 transition-opacity"
                title="Download"
            >
                <Download size={14} />
            </button>
        </div>
    );
};

const ChatArea = ({ messages, onSendMessage, onBack, currentUser, openedUnread = 0, license = {} }) => {
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState(null);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
    const fileInputRef = useRef(null);

    // Voice recording refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const { activeChatId, isGroupChat, bookmarks, groups, setCurrentView, setMessages, fetchedChats, presence } = useChatStore();

    const scrollRef = useRef(null);
    const [unreadStartIdx, setUnreadStartIdx] = useState(null);
    const [showExport, setShowExport] = useState(false);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeChatId]);

    // Fetch history, mark as read, and determine unread marker
    useEffect(() => {
        if (!activeChatId) return;

        // Mark as read in backend
        markRead(activeChatId, isGroupChat).catch(console.error);

        if (!fetchedChats.has(activeChatId)) {
            const config = window.CHAT_CONFIG || {};
            const baseUrl = config.API_BASE_URL || '';
            const url = `${baseUrl}/chat/api/history/${activeChatId}/?is_group=${isGroupChat}`;

            fetch(url, {
                headers: {
                    'X-Chat-User': config.USER_ID || ''
                }
            })
                .then(res => res.json())
                .then(async data => {
                    if (data.messages) {
                        const processed = await Promise.all(data.messages.map(async m => {
                            let content = '';
                            if (m.payload) {
                                try {
                                    // Step 1: Hex decode to string (removes at-rest layer done by backend)
                                    const bytes = new Uint8Array(m.payload.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                                    const e2eeCiphertext = new TextDecoder().decode(bytes);
                                    // Step 2: Decrypt E2EE layer
                                    content = await encryptionService.decrypt(e2eeCiphertext);
                                } catch (e) {
                                    // Fallback: payload might be unencrypted plaintext
                                    try {
                                        const bytes = new Uint8Array(m.payload.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                                        content = new TextDecoder().decode(bytes);
                                    } catch (e2) {
                                        content = m.payload;
                                    }
                                }
                            }
                            return {
                                ...m,
                                content: content,
                                attachment: m.attachment
                            };
                        }));
                        setMessages(activeChatId, processed);

                        // After merging, set unread marker
                        if (openedUnread > 0) {
                            const total = (useChatStore.getState().messagesByChat[activeChatId] || []).length;
                            setUnreadStartIdx(Math.max(0, total - openedUnread));
                        } else {
                            setUnreadStartIdx(null);
                        }
                    }
                })
                .catch(console.error);
        } else {
            // Already fetched — use openedUnread prop directly
            if (openedUnread > 0) {
                setUnreadStartIdx(Math.max(0, messages.length - openedUnread));
            } else {
                setUnreadStartIdx(null);
            }
        }
    }, [activeChatId]);

    const handleSend = async () => {
        if (!inputText.trim() && !pendingAttachment) return;

        let attachment = null;
        if (pendingAttachment) {
            attachment = {
                id: pendingAttachment.id,
                name: pendingAttachment.name,
                type: pendingAttachment.type,
                url: pendingAttachment.url,
                size: pendingAttachment.size
            };
        }

        onSendMessage(inputText, attachment);
        setInputText('');
        setPendingAttachment(null);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 50MB limit check
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert('File is too large. Maximum size is 50MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        try {
            // Read file as ArrayBuffer
            const buffer = await file.arrayBuffer();
            // Encrypt buffer
            const encryptedBuffer = await encryptionService.encryptBuffer(buffer);
            // Create encrypted file object
            const encryptedFile = new File([encryptedBuffer], file.name, { type: file.type });

            const result = await uploadAttachment(encryptedFile);
            setPendingAttachment({
                ...result,
                isEncrypted: true // Mark as encrypted for later decryption
            });
        } catch (err) {
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Stop tracks to release microphone
                stream.getTracks().forEach((track) => track.stop());

                if (audioBlob.size < 1000) return; // Ignore empty/accidental clicks

                setIsUploading(true);
                try {
                    const buffer = await audioBlob.arrayBuffer();
                    const encryptedBuffer = await encryptionService.encryptBuffer(buffer);

                    const fileName = `voice_message_${Date.now()}.webm`;
                    const encryptedFile = new File([encryptedBuffer], fileName, { type: 'audio/webm' });

                    const attachmentResult = await uploadAttachment(encryptedFile);

                    // Immediately send the audio message with type PTT. Use empty text so it doesn't show "[Voice Message]".
                    onSendMessage('', {
                        id: attachmentResult.id,
                        name: attachmentResult.name,
                        type: attachmentResult.type,
                        url: attachmentResult.url,
                        size: attachmentResult.size
                    });
                } catch (err) {
                    console.error("Voice message upload failed:", err);
                    alert("Failed to send voice message");
                } finally {
                    setIsUploading(false);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied or error:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const handleInputChanges = (e) => {
        const val = e.target.value;

        // Strictly enforce local character whitelist defined by License cryptography
        if (license?.allowedChars && val.length > 0) {
            try {
                const regex = new RegExp(license.allowedChars);
                if (!regex.test(val)) return; // Drop invalid keystrokes entirely
            } catch (err) {
                console.error("Invalid allowedChars regex from license", err);
            }
        }

        setInputText(val);

        const lastAtCharIdx = val.lastIndexOf('@');
        if (lastAtCharIdx !== -1) {
            const query = val.slice(lastAtCharIdx + 1);
            if (!query.includes(' ')) {
                setMentionQuery(query.toLowerCase());
                setSelectedMentionIdx(0);
                return;
            }
        }
        setMentionQuery(null);
    };

    const insertMention = (username) => {
        const lastAtIdx = inputText.lastIndexOf('@');
        const before = inputText.slice(0, lastAtIdx);
        setInputText(before + '@' + username + ' ');
        setMentionQuery(null);
    };

    const filteredMentionUsers = (() => {
        if (mentionQuery === null) return [];
        let candidates = [];
        if (isGroupChat) {
            const group = groups.find(g => String(g.id) === activeChatId);
            if (group && group.members) candidates = group.members;
            else {
                // Fallback to all bookmarks if group members not yet loaded here
                candidates = bookmarks.map(b => ({ username: b.username, name: b.name }));
            }
        } else {
            candidates = bookmarks.map(b => ({ username: b.username, name: b.name }));
        }

        return candidates.filter(u =>
            u.username.toLowerCase().includes(mentionQuery) ||
            (u.name && u.name.toLowerCase().includes(mentionQuery))
        ).slice(0, 5);
    })();


    const renderAttachment = (att) => {
        if (!att || !att.url) return null;
        const isImage = att.type?.startsWith('image/');
        const isAudio = att.type?.startsWith('audio/');
        const absoluteUrl = getFullUrl(att.url);

        if (isImage) {
            return (
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 max-w-sm">
                    <DecryptedImage url={absoluteUrl} alt={att.name} />
                </div>
            );
        }

        if (isAudio) {
            return <DecryptedAudio url={absoluteUrl} name={att.name} />;
        }

        return <DecryptedFile url={absoluteUrl} name={att.name} size={att.size} />;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(Number(timestamp));
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderFormattedContent = (content) => {
        if (!content) return '';

        // Safely parse markdown by splitting text into tokens instead of using dangerouslySetInnerHTML
        // Token format: { type: 'text'|'mention'|'bold'|'italic'|'strike'|'code'|'pre', content: string }

        let tokens = [{ type: 'text', content: content }];

        const applyRule = (regex, type) => {
            let newTokens = [];
            tokens.forEach(token => {
                if (token.type !== 'text') {
                    newTokens.push(token);
                    return;
                }

                let lastIndex = 0;
                let match;
                while ((match = regex.exec(token.content)) !== null) {
                    if (match.index > lastIndex) {
                        newTokens.push({ type: 'text', content: token.content.substring(lastIndex, match.index) });
                    }
                    newTokens.push({ type: type, content: match[1] || match[0] });
                    lastIndex = match.index + match[0].length;
                }
                if (lastIndex < token.content.length) {
                    newTokens.push({ type: 'text', content: token.content.substring(lastIndex) });
                }
            });
            tokens = newTokens;
        };

        // 1. Code blocks ```code```
        applyRule(/```([\s\S]*?)```/g, 'pre');
        // 2. Inline code `code`
        applyRule(/`([^`]+)`/g, 'code');
        // 3. Bold *bold*
        applyRule(/\*([^*\n]+)\*/g, 'bold');
        // 4. Italic _italic_
        applyRule(/_([^\_\n]+)_/g, 'italic');
        // 5. Strike ~strike~
        applyRule(/~([^~\n]+)~/g, 'strike');
        // 6. Mentions @username
        applyRule(/(@\w+)/g, 'mention');

        return tokens.map((token, i) => {
            switch (token.type) {
                case 'mention':
                    return <span key={i} className="text-emerald-400 font-bold bg-emerald-400/10 px-1 rounded">{token.content}</span>;
                case 'bold':
                    return <strong key={i} className="font-bold text-white">{token.content}</strong>;
                case 'italic':
                    return <em key={i} className="italic text-slate-300">{token.content}</em>;
                case 'strike':
                    return <del key={i} className="line-through text-slate-500">{token.content}</del>;
                case 'code':
                    return <code key={i} className="font-mono text-[11px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-emerald-400">{token.content}</code>;
                case 'pre':
                    return (
                        <pre key={i} className="font-mono text-xs bg-[#0b1121] border border-slate-800 p-2 rounded-md my-1 overflow-x-auto text-emerald-500">
                            <code>{token.content}</code>
                        </pre>
                    );
                default:
                    return <span key={i}>{token.content}</span>;
            }
        });
    };

    let chatName = activeChatId || "SECURE CHANNEL";
    if (isGroupChat) {
        const group = groups.find(g => String(g.id) === activeChatId);
        if (group) chatName = group.name;
    } else {
        const contact = bookmarks.find(c => c.username === activeChatId);
        if (contact) chatName = contact.name;
    }

    return (
        <div className="flex-1 flex flex-col bg-[#0b1121] text-gray-200 h-full">
            {/* Header */}
            <div className="h-14 border-b border-slate-800 flex items-center px-3 gap-2 bg-[#0f172a] shadow-sm z-10 flex-shrink-0">
                <button onClick={onBack} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <span className="font-semibold tracking-wide uppercase text-sm block truncate">{chatName}</span>
                    {!isGroupChat && (
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono ${presence[activeChatId]?.is_online ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {presence[activeChatId]?.is_online ? 'ONLINE' : 'OFFLINE'}
                            </span>
                            {bookmarks.find(c => c.username === activeChatId)?.role && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className="text-[10px] text-slate-400 uppercase tracking-tighter font-semibold">
                                        {bookmarks.find(c => c.username === activeChatId)?.role}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-1 items-center">
                    {isGroupChat && (
                        <button
                            onClick={() => setCurrentView('group_members')}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-md transition-colors"
                            title="Members"
                        >
                            <Users className="w-4 h-4" />
                        </button>
                    )}

                    <button
                        onClick={() => setShowExport(true)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Export History"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    {isGroupChat && (
                        <button
                            onClick={() => setCurrentView('group_settings')}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                            title="Group Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-slate-600 font-mono text-xs">
                        [NO MESSAGES YET — START TRANSMITTING]
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isOwn = String(msg.senderId).toLowerCase() === String(currentUser).toLowerCase();
                    const isUnread = unreadStartIdx !== null && idx >= unreadStartIdx && !isOwn;
                    const showBanner = unreadStartIdx !== null && idx === unreadStartIdx;

                    return (
                        <React.Fragment key={msg.messageId || idx}>
                            {showBanner && idx > 0 && (
                                <div className="flex items-center gap-2 py-3">
                                    <div className="flex-1 h-px bg-amber-500/30"></div>
                                    <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/30">
                                        ● {messages.length - unreadStartIdx} New
                                    </span>
                                    <div className="flex-1 h-px bg-amber-500/30"></div>
                                </div>
                            )}

                            {msg.type === 4 ? (
                                <div className="flex items-center justify-center w-full my-3">
                                    <div className="bg-slate-800/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-700/10 transition-all duration-300">
                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-mono">
                                            {msg.content || ''}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className={`flex flex-col max-w-[85%] ${isOwn ? 'self-end ml-auto' : 'self-start mr-auto'}`}>
                                    <div className="flex items-baseline gap-1.5 mb-0.5">
                                        <span className={`text-[10px] font-semibold ${isOwn ? 'text-slate-400' : 'text-emerald-500'}`}>{isOwn ? 'ME' : msg.senderId}</span>
                                        <span className="text-[9px] text-slate-600 font-mono">{formatTime(msg.sentAt)}</span>
                                    </div>
                                    <div className={`px-3 py-2 rounded-lg text-sm transition-all duration-300
                                        ${isUnread
                                            ? 'bg-amber-900/20 border border-amber-500/40 text-amber-50 ring-1 ring-amber-500/30'
                                            : msg.isHighPriority
                                                ? 'bg-red-900/50 border border-red-500 text-red-100'
                                                : msg.type === 1
                                                    ? 'bg-transparent text-slate-200' // No border or background for native audio payloads
                                                    : isOwn
                                                        ? 'bg-emerald-900/20 border border-emerald-700 text-slate-100 shadow-sm'
                                                        : 'bg-[#1e293b] border border-slate-700 text-slate-200 shadow-sm'
                                        }`}>
                                        {(msg.type === 0 || msg.type === 1) && msg.content && (
                                            <div className="break-words mb-1 overflow-x-hidden">
                                                {(!license?.modules || license.modules.includes('MARKDOWN'))
                                                    ? renderFormattedContent(msg.content)
                                                    : <span>{msg.content}</span>}
                                            </div>
                                        )}
                                        {renderAttachment(msg.attachment)}
                                        {msg.type === 2 && (
                                            <div className="flex items-center gap-2 font-bold uppercase text-red-400">
                                                <ShieldAlert className="w-4 h-4" />
                                                <span className="text-xs">COMMANDER OVERRIDE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-2 bg-[#0f172a] border-t border-slate-800 flex-shrink-0">
                {pendingAttachment && pendingAttachment.url && (
                    <div className="mb-2 flex items-center gap-2 p-2 bg-slate-800 border border-slate-700 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-1.5 bg-slate-900 rounded-md text-emerald-400">
                            {pendingAttachment.type?.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                        </div>
                        <span className="text-[10px] font-mono text-slate-300 flex-1 truncate">{pendingAttachment.name}</span>
                        <button onClick={() => setPendingAttachment(null)} className="p-1 hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {mentionQuery !== null && filteredMentionUsers.length > 0 && (
                    <div className="mb-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-2">
                        {filteredMentionUsers.map((user, i) => (
                            <div
                                key={user.username}
                                onClick={() => insertMention(user.username)}
                                className={`px-3 py-2 text-xs cursor-pointer flex items-center gap-2 transition-colors ${i === selectedMentionIdx ? 'bg-emerald-600/30 text-emerald-400' : 'hover:bg-slate-700 text-slate-300'}`}
                            >
                                <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px]">
                                    {user.username[0].toUpperCase()}
                                </div>
                                <span className="font-bold">{user.username}</span>
                                {user.name && <span className="opacity-50">— {user.name}</span>}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-1 bg-[#1e293b] rounded-lg p-1.5 border border-slate-700 focus-within:border-emerald-800 transition-colors">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`p-1.5 rounded-md transition-colors ${isUploading ? 'text-slate-600' : 'text-slate-400 hover:text-white'}`}
                    >
                        {isUploading ? <div className="w-4 h-4 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChanges}
                        onKeyDown={(e) => {
                            if (mentionQuery !== null && filteredMentionUsers.length > 0) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedMentionIdx((selectedMentionIdx + 1) % filteredMentionUsers.length);
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedMentionIdx((selectedMentionIdx - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
                                } else if (e.key === 'Enter' || e.key === 'Tab') {
                                    e.preventDefault();
                                    insertMention(filteredMentionUsers[selectedMentionIdx].username);
                                } else if (e.key === 'Escape') {
                                    setMentionQuery(null);
                                }
                            } else if (e.key === 'Enter') {
                                handleSend();
                            }
                        }}
                        placeholder="Type message..."
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder-slate-500 px-2 focus:ring-0"
                        style={{ boxShadow: 'none' }}
                    />
                    {(!license?.modules || license.modules.includes('VOICE')) && (
                        <button
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            className={`p-1.5 transition-colors rounded-md ${isRecording ? 'text-red-400 bg-red-400/10' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                        </button>
                    )}
                    <button
                        onClick={handleSend}
                        className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-md transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {showExport && (
                <ExportModal
                    chatId={activeChatId}
                    isGroup={isGroupChat}
                    chatName={chatName}
                    onClose={() => setShowExport(false)}
                />
            )}
        </div>
    );
};

export default ChatArea;
