import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/useChatStore';
import webrtcService from '../../services/WebRTCService';
import WebSocketClient from '../../services/WebSocketClient';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume, Volume1, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

// Audio level detection hook using Web Audio API
const useAudioLevel = (stream) => {
    const [level, setLevel] = useState(0);

    useEffect(() => {
        if (!stream) {
            setLevel(0);
            return;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            setLevel(0);
            return;
        }

        let audioContext;
        let analyser;
        let source;
        let animationFrameId;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256; // Smaller fftSize for snappy animation
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkVolume = () => {
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                analyser.getByteFrequencyData(dataArray);
                let total = 0;
                for (let i = 0; i < bufferLength; i++) {
                    total += dataArray[i];
                }
                const average = total / bufferLength;
                setLevel(average);
                animationFrameId = requestAnimationFrame(checkVolume);
            };

            checkVolume();
        } catch (e) {
            console.error("Web Audio API error:", e);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (source) {
                source.disconnect();
            }
            if (audioContext) {
                audioContext.close();
            }
        };
    }, [stream]);

    return level;
};

const VideoCallModal = () => {
    const {
        incomingCall,
        outgoingCall,
        activeCall,
        callConnectionState,
        setIncomingCall,
        setOutgoingCall,
        setActiveCall,
        setCallConnectionState,
        resetCallState,
        currentUser
    } = useChatStore();

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [volume, setVolume] = useState(80);
    const [prevVolume, setPrevVolume] = useState(80);
    const [callDuration, setCallDuration] = useState(0);

    const localLevel = useAudioLevel(localStream);
    const remoteLevel = useAudioLevel(remoteStream);
    const isLocalSpeaking = localLevel > 15 && !isAudioMuted;
    const isRemoteSpeaking = remoteLevel > 15;

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);

    // Duration and volume management
    useEffect(() => {
        let interval;
        if (activeCall) {
            setCallDuration(0);
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setVolume(80);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeCall]);

    useEffect(() => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.volume = volume / 100;
        }
    }, [volume]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleVolumeMute = () => {
        if (volume > 0) {
            setPrevVolume(volume);
            setVolume(0);
        } else {
            setVolume(prevVolume || 80);
        }
    };

    // Initialize WebRTC Service and bind callbacks
    useEffect(() => {
        const wsClient = WebSocketClient.getInstance();
        if (wsClient && currentUser) {
            webrtcService.initialize(wsClient, currentUser, {
                onLocalStream: (stream) => {
                    console.log("[WebRTC] Local stream received:", stream);
                    setLocalStream(stream);
                },
                onRemoteStream: (stream) => {
                    console.log("[WebRTC] Remote stream received:", stream);
                    setRemoteStream(stream);
                },
                onConnectionState: (state) => {
                    console.log("[WebRTC] Connection state callback:", state);
                    setCallConnectionState(state);
                    
                    if (state === 'connected') {
                        // Move to active call state
                        const currentIncoming = useChatStore.getState().incomingCall;
                        const currentOutgoing = useChatStore.getState().outgoingCall;
                        if (currentOutgoing) {
                            setActiveCall({
                                targetId: currentOutgoing.targetId,
                                callId: currentOutgoing.callId,
                                isVideo: currentOutgoing.isVideo
                            });
                            setOutgoingCall(null);
                        } else if (currentIncoming) {
                            setActiveCall({
                                targetId: currentIncoming.senderId,
                                callId: currentIncoming.callId,
                                isVideo: currentIncoming.isVideo
                            });
                            setIncomingCall(null);
                        }
                    }
                },
                onCallEnd: () => {
                    console.log("[WebRTC] Call ended callback");
                    resetCallState();
                    setLocalStream(null);
                    setRemoteStream(null);
                    setIsAudioMuted(false);
                    setIsVideoMuted(false);
                }
            });
        }
    }, [currentUser]);

    // Handle audio/video ringtones using synthetic Web Audio API
    useEffect(() => {
        let osc1, osc2, gainNode, interval;
        let audioCtx;
        
        const startRingtone = (frequency1, frequency2, cycleTime, ringTime) => {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                const playRing = () => {
                    if (!audioCtx || audioCtx.state === 'closed') return;
                    
                    osc1 = audioCtx.createOscillator();
                    osc2 = audioCtx.createOscillator();
                    gainNode = audioCtx.createGain();
                    
                    osc1.type = 'sine';
                    osc2.type = 'sine';
                    osc1.frequency.value = frequency1;
                    osc2.frequency.value = frequency2;
                    
                    osc1.connect(gainNode);
                    osc2.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
                    gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + ringTime - 0.1);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ringTime);
                    
                    osc1.start();
                    osc2.start();
                    
                    setTimeout(() => {
                        try {
                            osc1.stop();
                            osc2.stop();
                        } catch (e) {}
                    }, ringTime * 1000);
                };

                playRing();
                interval = setInterval(playRing, cycleTime * 1000);
            } catch (e) {
                console.error("[WebAudio] Ringtone error:", e);
            }
        };

        if (incomingCall && !activeCall) {
            // High pitch alarm pattern for incoming call
            startRingtone(600, 650, 4, 1.5);
        } else if (outgoingCall && !activeCall) {
            // US Dialback tone for outgoing call
            startRingtone(440, 480, 5, 2);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (audioCtx) {
                audioCtx.close().catch(() => {});
            }
        };
    }, [incomingCall, outgoingCall, activeCall]);

    // Attach local, remote video, and remote audio streams to DOM elements
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        } else if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
    }, [localVideoRef.current, localStream, activeCall, outgoingCall, incomingCall, isVideoMuted]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        } else if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    }, [remoteVideoRef.current, remoteStream, activeCall]);

    useEffect(() => {
        if (remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
        } else if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }
    }, [remoteAudioRef.current, remoteStream]);

    if (!incomingCall && !outgoingCall && !activeCall) {
        return null;
    }

    const handleAccept = async () => {
        if (incomingCall) {
            try {
                await webrtcService.acceptCall(incomingCall, incomingCall.senderId);
            } catch (err) {
                console.error("Failed to accept call:", err);
                webrtcService.rejectCall(incomingCall.senderId, incomingCall.callId);
            }
        }
    };

    const handleReject = () => {
        if (incomingCall) {
            webrtcService.rejectCall(incomingCall.senderId, incomingCall.callId);
        }
    };

    const handleCancel = () => {
        webrtcService.hangUp();
    };

    const handleHangup = () => {
        webrtcService.hangUp();
    };

    const toggleAudio = () => {
        if (webrtcService.localStream) {
            const tracks = webrtcService.localStream.getAudioTracks();
            tracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsAudioMuted(!isAudioMuted);
        }
    };

    const toggleVideo = () => {
        if (webrtcService.localStream) {
            const tracks = webrtcService.localStream.getVideoTracks();
            tracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoMuted(!isVideoMuted);
        }
    };

    const targetName = activeCall?.targetId || outgoingCall?.targetId || incomingCall?.senderId || 'Unknown User';
    const isCallVideo = activeCall?.isVideo || outgoingCall?.isVideo || incomingCall?.isVideo;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
            {/* Hidden audio tag for playing remote stream voice in all call types */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
            
            {/* INCOMING CALL SCREEN */}
            {incomingCall && !activeCall && (
                <div className="relative w-80 max-w-sm rounded-3xl border border-slate-800 bg-[#0f172a] p-6 text-center text-white shadow-2xl">
                    <div className="mt-4 flex justify-center">
                        <div className="relative">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-950/50 ring-2 ring-emerald-500/30 animate-pulse">
                                {isCallVideo ? (
                                    <Video className="h-8 w-8 text-emerald-400" />
                                ) : (
                                    <Phone className="h-8 w-8 text-emerald-400" />
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1.5 ring-2 ring-[#0f172a]">
                                <Volume2 className="h-3 w-3 text-white" />
                            </div>
                        </div>
                    </div>
                    
                    <h3 className="mt-5 text-xl font-bold tracking-tight">{targetName}</h3>
                    <p className="mt-1.5 text-xs font-mono text-slate-400">
                        {isCallVideo ? 'Incoming Video Call...' : 'Incoming Voice Call...'}
                    </p>

                    <div className="mt-8 flex justify-center gap-6">
                        <button
                            onClick={handleReject}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 shadow-lg hover:shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
                            title="Decline"
                        >
                            <PhoneOff className="h-5 w-5 text-white" />
                        </button>
                        <button
                            onClick={handleAccept}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                            title="Accept"
                        >
                            <Phone className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>
            )}

            {/* OUTGOING CALL SCREEN */}
            {outgoingCall && !activeCall && (
                <div className="relative w-80 max-w-sm rounded-3xl border border-slate-800 bg-[#0f172a] p-6 text-center text-white shadow-2xl">
                    <div className="mt-4 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 ring-2 ring-slate-700/50 animate-pulse">
                            {isCallVideo ? (
                                <Video className="h-8 w-8 text-slate-300" />
                            ) : (
                                <Phone className="h-8 w-8 text-slate-300" />
                            )}
                        </div>
                    </div>
                    
                    <h3 className="mt-5 text-xl font-bold tracking-tight">{targetName}</h3>
                    <p className="mt-1.5 text-xs font-mono text-emerald-400">
                        Calling...
                    </p>

                    {/* Local stream preview */}
                    {isCallVideo && (
                        <div className="relative mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 aspect-video w-full">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="h-full w-full object-cover scale-x-[-1]"
                            />
                        </div>
                    )}

                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={handleCancel}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 shadow-lg hover:shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
                            title="Cancel Call"
                        >
                            <PhoneOff className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>
            )}

            {/* ACTIVE CALL SCREEN */}
            {activeCall && (
                <div className="relative flex h-[90vh] max-h-[650px] md:max-h-[800px] w-[95vw] max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
                    
                    {/* Upper status banner */}
                    <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-1.5 text-xs border border-slate-800 backdrop-blur-sm">
                        <span className={`h-2 w-2 rounded-full ${callConnectionState === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                        <span className="font-mono text-slate-300">
                            {callConnectionState === 'connected' ? 'Connected' : 'Connecting...'}
                        </span>
                        {callConnectionState === 'connected' && (
                            <>
                                <span className="text-slate-600">|</span>
                                <span className="font-mono text-slate-300">{formatDuration(callDuration)}</span>
                            </>
                        )}
                        <span className="text-slate-600">|</span>
                        <span className="font-medium text-white">@{targetName}</span>
                        {isRemoteSpeaking && (
                            <span className="flex items-center gap-0.5 ml-1 animate-pulse">
                                <span className="h-2 w-0.5 bg-emerald-400" />
                                <span className="h-3.5 w-0.5 bg-emerald-400" />
                                <span className="h-2.5 w-0.5 bg-emerald-400" />
                            </span>
                        )}
                    </div>

                    {/* Video layouts */}
                    <div className="relative flex-1 min-h-0 bg-slate-900">
                        {isCallVideo ? (
                            <>
                                {/* Remote video stream */}
                                {remoteStream ? (
                                    <div className={`h-full w-full transition-all duration-300 ${isRemoteSpeaking ? 'ring-4 ring-emerald-400/80 shadow-[inset_0_0_30px_rgba(52,211,153,0.3)]' : ''}`}>
                                        <video
                                            ref={remoteVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-500">
                                        <div className="text-center">
                                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 animate-pulse">
                                                <Video className="h-6 w-6 text-slate-500" />
                                            </div>
                                            <p className="mt-3 text-xs font-mono">Waiting for video stream...</p>
                                        </div>
                                    </div>
                                )}

                                {/* Local video PIP (Picture in Picture) */}
                                <div className="absolute bottom-4 right-4 z-10 overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 aspect-video w-32 md:w-48 shadow-lg">
                                    {!isVideoMuted ? (
                                        <video
                                            ref={localVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="h-full w-full object-cover scale-x-[-1]"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-900">
                                            <VideoOff className="h-5 w-5 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Voice Call Avatar Layout */
                            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#0f172a] to-slate-950 p-6 text-center">
                                <div className="relative">
                                    <div className={`flex h-32 w-32 items-center justify-center rounded-full bg-emerald-950/20 ring-4 transition-all duration-300 ${isRemoteSpeaking ? 'ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'ring-emerald-500/20'} animate-pulse`}>
                                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-900 border border-emerald-500/40">
                                            <span className="text-3xl font-bold uppercase">{targetName.substring(0, 2)}</span>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-2 border-4 border-slate-950">
                                        {isRemoteSpeaking ? (
                                            <Volume2 className="h-5 w-5 text-white animate-bounce" />
                                        ) : (
                                            <Volume2 className="h-5 w-5 text-white" />
                                        )}
                                    </div>
                                </div>
                                <h2 className="mt-6 text-2xl font-extrabold tracking-tight">{targetName}</h2>
                                <p className="mt-2 text-xs font-mono text-slate-500">Secure Peer-to-Peer Encrypted Voice Stream</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom controls panel */}
                    <div className="bg-[#0b0f19] px-6 py-4 flex-shrink-0 flex items-center justify-center gap-6 border-t border-slate-900">
                        {/* Mute Mic */}
                        <button
                            onClick={toggleAudio}
                            className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${
                                isAudioMuted 
                                    ? 'bg-rose-600 text-white hover:bg-rose-500' 
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                            title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                            {isLocalSpeaking && (
                                <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping pointer-events-none" />
                            )}
                            {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>

                        {/* Hangup */}
                        <button
                            onClick={handleHangup}
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg hover:shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
                            title="End Call"
                        >
                            <PhoneOff className="h-6 w-6" />
                        </button>

                        {/* Toggle Camera (If call has video capability) */}
                        {isCallVideo && (
                            <button
                                onClick={toggleVideo}
                                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${
                                    isVideoMuted 
                                        ? 'bg-rose-600 text-white hover:bg-rose-500' 
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                                title={isVideoMuted ? "Start Camera" : "Stop Camera"}
                            >
                                {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                            </button>
                        )}

                        {/* Volume Control Slider */}
                        <div className="flex items-center gap-2 bg-slate-800/60 rounded-full px-3 py-1.5 border border-slate-700/50">
                            <button
                                onClick={toggleVolumeMute}
                                className="hover:scale-105 active:scale-95 transition-all focus:outline-none"
                                title={volume === 0 ? "Unmute Audio" : "Mute Audio"}
                            >
                                {volume === 0 ? (
                                    <VolumeX className="h-4 w-4 text-rose-400" />
                                ) : volume < 50 ? (
                                    <Volume1 className="h-4 w-4 text-slate-300" />
                                ) : (
                                    <Volume2 className="h-4 w-4 text-emerald-400" />
                                )}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={(e) => setVolume(parseInt(e.target.value))}
                                className="w-16 md:w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                                title={`Volume: ${volume}%`}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoCallModal;
