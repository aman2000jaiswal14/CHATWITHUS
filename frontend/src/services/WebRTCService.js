// WebRTC Service for WCA Secure Chat
// Manages RTCPeerConnection, media streams, and candidate negotiation
import { useChatStore } from '../store/useChatStore';

class WebRTCService {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.socketClient = null;
        this.myUserId = null;
        this.targetUserId = null;
        this.currentCallId = null;
        this.isVideo = false;
        
        // Callbacks from UI
        this.onLocalStreamCallback = null;
        this.onRemoteStreamCallback = null;
        this.onConnectionStateCallback = null;
        this.onCallEndCallback = null;
    }

    initialize(socketClient, myUserId, { onLocalStream, onRemoteStream, onConnectionState, onCallEnd }) {
        this.socketClient = socketClient;
        this.myUserId = myUserId;
        this.onLocalStreamCallback = onLocalStream;
        this.onRemoteStreamCallback = onRemoteStream;
        this.onConnectionStateCallback = onConnectionState;
        this.onCallEndCallback = onCallEnd;
        this.wasRejected = false;
        this.wasHungUp = false;
    }

    async getLocalStream(isVideo = true) {
        if (this.localStream) {
            return this.localStream;
        }

        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            },
            video: isVideo ? {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 15 } // Bandwidth optimization for 1 Mbps constraint
            } : false
        };

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.isVideo = isVideo;
        } catch (error) {
            console.warn("[WebRTC] Advanced media constraints failed, trying basic constraints:", error);
            try {
                const basicConstraints = {
                    audio: true,
                    video: isVideo
                };
                this.localStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
                this.isVideo = isVideo;
            } catch (err2) {
                console.warn("[WebRTC] Basic media constraints failed, trying audio-only fallback:", err2);
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    this.isVideo = false;
                } catch (err3) {
                    console.error("[WebRTC] Failed to acquire any media devices:", err3);
                    throw err3;
                }
            }
        }

        if (this.onLocalStreamCallback) {
            this.onLocalStreamCallback(this.localStream);
        }
        return this.localStream;
    }

    createPeerConnection() {
        if (this.peerConnection) {
            this.cleanupPeerConnection();
        }

        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceTransportPolicy: 'all' // Can be restricted to 'relay' for high security
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Listen for remote tracks
        this.remoteStream = new MediaStream();
        this.peerConnection.ontrack = (event) => {
            console.log("Received remote track:", event.track.kind);
            if (event.track) {
                this.remoteStream.addTrack(event.track);
            }
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(this.remoteStream);
            }
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.socketClient) {
                const candidateStr = event.candidate.candidate;
                
                // Security Mitigation: IP address leakage protection
                const hostname = window.location.hostname;
                const isLocalOrPrivate = hostname === 'localhost' || 
                                         hostname === '127.0.0.1' || 
                                         hostname.startsWith('192.168.') || 
                                         hostname.startsWith('10.') || 
                                         hostname.startsWith('172.');
                if (candidateStr && candidateStr.includes('typ host') && !isLocalOrPrivate) {
                    // Exclude host candidates in public production environments to mitigate private IP leakage
                    return;
                }

                this.socketClient.sendWebRTCSignal({
                    type: 'ICE_CANDIDATE',
                    senderId: this.myUserId,
                    targetId: this.targetUserId,
                    candidate: JSON.stringify(event.candidate),
                    callId: this.currentCallId,
                    isVideo: this.isVideo
                });
            }
        };

        // Monitor connection state
        this.peerConnection.onconnectionstatechange = () => {
            console.log("WebRTC Connection State changed:", this.peerConnection.connectionState);
            if (this.onConnectionStateCallback) {
                this.onConnectionStateCallback(this.peerConnection.connectionState);
            }

            if (this.peerConnection.connectionState === 'disconnected' || 
                this.peerConnection.connectionState === 'failed' || 
                this.peerConnection.connectionState === 'closed') {
                this.handleCallEndLocally();
            }
        };
    }

    async initiateCall(targetUserId, isVideo = true) {
        this.targetUserId = targetUserId;
        this.currentCallId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
        this.isVideo = isVideo;

        // Update local state to show Outgoing Call UI
        useChatStore.getState().setOutgoingCall({
            targetId: targetUserId,
            callId: this.currentCallId,
            isVideo: isVideo
        });

        // 1. Get media stream
        await this.getLocalStream(isVideo);

        // 2. Create peer connection
        this.createPeerConnection();

        // 3. Create and set Local Offer
        const offer = await this.peerConnection.createOffer();
        
        // Bandwidth limit SDP settings if video is enabled
        let sdp = offer.sdp;
        if (isVideo) {
            sdp = this.limitSdpBandwidth(sdp, 250); // limit video to 250 kbps
        }
        
        await this.peerConnection.setLocalDescription({ type: 'offer', sdp });

        // 4. Send CALL_INITIATE signal to peer
        this.socketClient.sendWebRTCSignal({
            type: 'CALL_INITIATE',
            senderId: this.myUserId,
            targetId: targetUserId,
            callId: this.currentCallId,
            isVideo: isVideo
        });

        // 5. Send Offer
        this.socketClient.sendWebRTCSignal({
            type: 'OFFER',
            senderId: this.myUserId,
            targetId: targetUserId,
            sdp: sdp,
            callId: this.currentCallId,
            isVideo: isVideo
        });
    }

    async acceptCall(incomingOffer, targetUserId) {
        this.targetUserId = targetUserId;
        this.currentCallId = incomingOffer.callId;
        this.isVideo = incomingOffer.isVideo;

        // 1. Get media stream
        await this.getLocalStream(this.isVideo);

        // 2. Create peer connection
        this.createPeerConnection();

        // 3. Set remote description from offer
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
            type: 'offer',
            sdp: incomingOffer.sdp
        }));
        
        await this.flushQueuedCandidates();

        // 4. Create and set Local Answer
        const answer = await this.peerConnection.createAnswer();
        
        let sdp = answer.sdp;
        if (this.isVideo) {
            sdp = this.limitSdpBandwidth(sdp, 250); // limit to 250 kbps
        }

        await this.peerConnection.setLocalDescription({ type: 'answer', sdp });

        // 5. Send Answer to caller
        this.socketClient.sendWebRTCSignal({
            type: 'ANSWER',
            senderId: this.myUserId,
            targetId: targetUserId,
            sdp: sdp,
            callId: this.currentCallId,
            isVideo: this.isVideo
        });
    }

    async handleIncomingAnswer(answer) {
        if (this.peerConnection && this.peerConnection.signalingState !== 'stable') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: answer.sdp
            }));
            await this.flushQueuedCandidates();
        }
    }

    async handleIncomingIceCandidate(candidateData) {
        try {
            const candidateObj = JSON.parse(candidateData.candidate);
            if (!candidateObj) return;

            if (this.peerConnection) {
                if (this.peerConnection.remoteDescription) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
                } else {
                    if (!this.queuedCandidates) {
                        this.queuedCandidates = [];
                    }
                    this.queuedCandidates.push(candidateObj);
                    console.log("[WebRTC] Queued incoming ICE candidate (remoteDescription not set yet)");
                }
            }
        } catch (e) {
            console.error("Error adding remote ICE candidate:", e);
        }
    }

    async flushQueuedCandidates() {
        if (this.queuedCandidates && this.peerConnection) {
            console.log(`[WebRTC] Flushing ${this.queuedCandidates.length} queued ICE candidates`);
            for (const candidate of this.queuedCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding queued ICE candidate:", e);
                }
            }
            this.queuedCandidates = [];
        }
    }

    rejectCall(targetUserId, callId) {
        if (this.socketClient) {
            this.socketClient.sendWebRTCSignal({
                type: 'CALL_REJECT',
                senderId: this.myUserId,
                targetId: targetUserId,
                callId: callId || this.currentCallId
            });
        }
        this.wasRejected = true;
        this.handleCallEndLocally();
    }

    hangUp() {
        if (this.socketClient && this.targetUserId) {
            this.socketClient.sendWebRTCSignal({
                type: 'CALL_HANGUP',
                senderId: this.myUserId,
                targetId: this.targetUserId,
                callId: this.currentCallId
            });
        }
        this.wasHungUp = true;
        this.handleCallEndLocally();
    }

    handleCallEndLocally() {
        if (this.onCallEndCallback) {
            this.onCallEndCallback();
        }
        this.cleanup();
    }

    // SDP Modifier to limit video bandwidth (e.g. 250 kbps)
    limitSdpBandwidth(sdp, bitrateKbps) {
        let lines = sdp.split('\r\n');
        let lineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('m=video') === 0) {
                lineIndex = i;
                break;
            }
        }
        if (lineIndex === -1) {
            return sdp;
        }
        // Insert b=AS:bitrate line right after m=video line
        lineIndex++;
        // Skip c= and a= lines if they immediately follow m=video, but typically b= goes first
        lines.splice(lineIndex, 0, `b=AS:${bitrateKbps}`);
        return lines.join('\r\n');
    }

    cleanupPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.ontrack = null;
            this.peerConnection.onicecandidate = null;
            this.peerConnection.onconnectionstatechange = null;
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.queuedCandidates = null;
    }

    cleanup() {
        this.cleanupPeerConnection();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.onLocalStreamCallback) {
            this.onLocalStreamCallback(null);
        }

        this.remoteStream = null;
        this.targetUserId = null;
        this.currentCallId = null;
        // Reset per-call termination flags so they don't leak into the next call
        this.wasRejected = false;
        this.wasHungUp = false;
    }
}

const webrtcService = new WebRTCService();
export default webrtcService;
