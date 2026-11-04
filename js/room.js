/**
 * Together Room - Real-Time WebRTC Peer-to-Peer Multiplayer System
 * Powered by PeerJS (Zero-backend serverless WebRTC media + data channels)
 * Optimized for Ultra-Low Latency (< 150ms real-time video sync)
 */

class TogetherRoom {
  constructor({
    onRemoteStream,
    onRemoteTransform,
    onRemoteDisconnected,
    onCountdownSync,
    onCustomizationSync,
    onStatusChange,
    onRemoteCameraState,
    onStatusUpdate,
    onStatusRequest,
    onStripStateSync,
    onPeerLeft,
    onSyncState
  }) {
    this.peer = null;
    this.conn = null;
    this.call = null;
    this.roomId = null;
    this.isHost = false;
    this.isConnected = false;
    this.localStream = null;
    this.remoteStream = null;

    // Local state tracking for bi-directional synchronization
    this.currentLocalState = {
      activeTab: 'shoot', // 'shoot' or 'decorate'
      cameraActive: true
    };
    this.heartbeatTimer = null;
    this.guestRetryTimer = null;

    // Callbacks
    this.onRemoteStream = onRemoteStream || (() => {});
    this.onRemoteTransform = onRemoteTransform || (() => {});
    this.onRemoteDisconnected = onRemoteDisconnected || (() => {});
    this.onCountdownSync = onCountdownSync || (() => {});
    this.onCustomizationSync = onCustomizationSync || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.onRemoteCameraState = onRemoteCameraState || (() => {});
    this.onStatusUpdate = onStatusUpdate || (() => {});
    this.onStatusRequest = onStatusRequest || (() => {});
    this.onStripStateSync = onStripStateSync || (() => {});
    this.onPeerLeft = onPeerLeft || (() => {});
    this.onSyncState = onSyncState || (() => {});
  }

  /**
   * Generate a romantic, friendly room code (e.g., rose-4892)
   */
  static generateRoomId() {
    const prefixes = ['rose', 'coquette', 'ribbon', 'bow', 'sweet', 'blush', 'honey'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }

  saveRoomSession(roomId, role) {
    try {
      if (roomId) {
        sessionStorage.setItem('couples_photobooth_room_id', roomId);
        sessionStorage.setItem('couples_photobooth_room_role', role || 'host');
      }
    } catch (e) {
      console.warn('SessionStorage save error:', e);
    }
  }

  getSavedRoomSession() {
    try {
      const roomId = sessionStorage.getItem('couples_photobooth_room_id');
      const role = sessionStorage.getItem('couples_photobooth_room_role') || 'host';
      if (roomId) return { roomId, role };
    } catch (e) {
      console.warn('SessionStorage get error:', e);
    }
    return null;
  }

  clearRoomSession() {
    try {
      sessionStorage.removeItem('couples_photobooth_room_id');
      sessionStorage.removeItem('couples_photobooth_room_role');
    } catch (e) {
      console.warn('SessionStorage clear error:', e);
    }
  }

  /**
   * Apply ultra-low-latency real-time video configuration to RTCPeerConnection
   */
  tuneCallLatency(call) {
    if (!call || !call.peerConnection) return;
    try {
      const pc = call.peerConnection;

      // 1. Force zero playout buffer delay on receivers (eliminates 1.5 - 2s buffer bloat)
      if (pc.getReceivers) {
        pc.getReceivers().forEach(receiver => {
          if ('playoutDelayHint' in receiver) {
            receiver.playoutDelayHint = 0;
          }
          if ('jitterBufferTarget' in receiver) {
            receiver.jitterBufferTarget = 0;
          }
        });
      }

      // 2. Configure video senders for responsive, high-priority streaming
      if (pc.getSenders) {
        pc.getSenders().forEach(sender => {
          if (sender.track && sender.track.kind === 'video') {
            const params = sender.getParameters ? sender.getParameters() : null;
            if (params && params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 1200000; // 1.2 Mbps is crystal clear for 480p/720p without queuing
              params.encodings[0].networkPriority = 'high';
              params.encodings[0].priority = 'high';
              sender.setParameters(params).catch(() => {});
            }
          }
        });
      }
    } catch (e) {
      console.warn('Low-latency WebRTC tuning warning:', e);
    }
  }

  /**
   * Initialize PeerJS client cleanly with low-latency STUN servers
   */
  initPeer(peerId = null) {
    return new Promise((resolve, reject) => {
      if (typeof window.Peer === 'undefined') {
        const err = new Error('PeerJS is not loaded');
        this.onStatusChange({ state: 'error', message: 'WebRTC library unavailable' });
        return reject(err);
      }

      try {
        // Destroy existing peer instance if open
        if (this.peer && !this.peer.destroyed) {
          try { this.peer.destroy(); } catch (e) {}
          this.peer = null;
        }

        const peerConfig = {
          debug: 1,
          pingInterval: 5000,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ],
            sdpSemantics: 'unified-plan',
            iceCandidatePoolSize: 10
          }
        };

        // Configure fresh PeerJS
        this.peer = peerId ? new window.Peer(peerId, peerConfig) : new window.Peer(peerConfig);

        this.peer.on('open', (id) => {
          this.onStatusChange({ state: 'ready', peerId: id, roomId: this.roomId });
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.setupDataConnection(conn);
        });

        this.peer.on('call', (call) => {
          this.call = call;
          call.answer(this.localStream || undefined);
          this.tuneCallLatency(call);

          call.on('stream', (remoteStream) => {
            this.remoteStream = remoteStream;
            this.tuneCallLatency(call);
            this.onRemoteStream(remoteStream);
          });
          call.on('close', () => {
            this.handleRemoteLeave();
          });
          call.on('error', (err) => {
            console.warn('Call error:', err);
          });
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS connection error:', err);
          const errType = err.type || '';

          if (errType === 'unavailable-id') {
            console.warn('Room ID collision / broker delay, retrying in 500ms...');
            setTimeout(() => {
              if (this.roomId) {
                if (this.isHost) {
                  this.initPeer(`coquette-pb-${this.roomId}`).catch(() => {});
                } else {
                  this.initPeer().catch(() => {});
                }
              }
            }, 500);
            return;
          }

          if (errType === 'peer-unavailable') {
            console.log('Partner peer temporarily unavailable on broker; retry loop is active.');
            return;
          }

          if (this.roomId) {
            this.onStatusChange({
              state: 'reconnecting',
              roomId: this.roomId,
              message: 'Reconnecting room...'
            });
            if (this.peer && !this.peer.destroyed) {
              try { this.peer.reconnect(); } catch (e) {}
            }
          } else {
            this.onStatusChange({ state: 'error', message: err.type || err.message });
          }
        });

        this.peer.on('disconnected', () => {
          console.log('Peer disconnected from signaling broker, attempting auto-reconnect...');
          if (this.roomId) {
            this.onStatusChange({
              state: 'reconnecting',
              roomId: this.roomId,
              message: 'Reconnecting room...'
            });
          }
          if (this.peer && !this.peer.destroyed) {
            try { this.peer.reconnect(); } catch (e) {}
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Host creates a new Together Room
   */
  async createRoom(customId = null) {
    this.isHost = true;
    this.roomId = customId || TogetherRoom.generateRoomId();
    this.saveRoomSession(this.roomId, 'host');
    this.onStatusChange({ state: 'connecting', roomId: this.roomId, message: 'Creating your room...' });

    // Prefix for namespacing on public broker
    const brokerId = `coquette-pb-${this.roomId}`;
    await this.initPeer(brokerId);

    // Update browser URL query string without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomId);
    window.history.replaceState({ room: this.roomId }, '', url.toString());

    this.onStatusChange({
      state: 'waiting_for_partner',
      roomId: this.roomId,
      inviteUrl: url.toString(),
      message: 'Waiting for partner to join...',
      showToast: !customId
    });

    return {
      roomId: this.roomId,
      inviteUrl: url.toString()
    };
  }

  /**
   * Partner joins an existing Together Room from URL
   */
  async joinRoom(roomId, localStream = null) {
    this.isHost = false;
    this.roomId = roomId;
    this.localStream = localStream;
    this.saveRoomSession(this.roomId, 'guest');
    this.onStatusChange({
      state: 'connecting',
      roomId: this.roomId,
      message: "Connecting to partner's room... <3"
    });

    // Update browser URL query string without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomId);
    window.history.replaceState({ room: this.roomId }, '', url.toString());

    await this.initPeer(); // random ID for client

    this.startGuestConnectionLoop();
  }

  startGuestConnectionLoop() {
    this.stopGuestConnectionLoop();

    let attempts = 0;
    const maxAttempts = 15;
    const hostBrokerId = `coquette-pb-${this.roomId}`;

    const tryConnect = () => {
      if (this.isConnected || !this.roomId) {
        this.stopGuestConnectionLoop();
        return;
      }

      attempts++;
      console.log(`[Guest] Connecting to host (${hostBrokerId}), attempt ${attempts}/${maxAttempts}...`);
      this.onStatusChange({
        state: 'connecting',
        roomId: this.roomId,
        message: "Connecting to partner's room... <3"
      });

      try {
        if (!this.peer || this.peer.destroyed) {
          this.initPeer().then(() => tryConnect()).catch(() => {});
          return;
        }

        if (this.conn && !this.conn.open) {
          try { this.conn.close(); } catch (e) {}
        }

        const conn = this.peer.connect(hostBrokerId, { reliable: true });
        this.setupDataConnection(conn);

        if (this.localStream) {
          this.callHost(hostBrokerId);
        }
      } catch (err) {
        console.warn('[Guest] Connection attempt error:', err);
      }

      if (attempts >= maxAttempts) {
        this.stopGuestConnectionLoop();
        this.onStatusChange({
          state: 'waiting_for_partner',
          roomId: this.roomId,
          message: 'Waiting for partner to join...'
        });
      }
    };

    tryConnect();

    this.guestRetryTimer = setInterval(() => {
      if (this.isConnected || !this.roomId) {
        this.stopGuestConnectionLoop();
        return;
      }
      tryConnect();
    }, 2000);
  }

  stopGuestConnectionLoop() {
    if (this.guestRetryTimer) {
      clearInterval(this.guestRetryTimer);
      this.guestRetryTimer = null;
    }
  }

  waitForPeerOpen(timeoutMs = 1500) {
    return new Promise((resolve) => {
      if (this.peer && this.peer.open && !this.peer.disconnected) {
        return resolve(true);
      }
      let timer = null;
      const onOpen = () => {
        cleanup();
        resolve(true);
      };
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (this.peer) this.peer.off('open', onOpen);
      };
      if (this.peer) {
        this.peer.once('open', onOpen);
      }
      timer = setTimeout(() => {
        cleanup();
        resolve(this.peer && this.peer.open && !this.peer.disconnected);
      }, timeoutMs);
    });
  }

  async ensureConnected(targetRoomId) {
    const roomId = targetRoomId || this.roomId;
    if (!roomId) return;
    this.roomId = roomId;

    if (this.isConnected && this.conn && this.conn.open && this.peer && this.peer.open && !this.peer.disconnected) {
      return;
    }

    if (this.peer && !this.peer.destroyed) {
      if (this.peer.disconnected) {
        try {
          this.peer.reconnect();
        } catch (e) {
          console.warn('reconnect error:', e);
        }
      }
      const reconnected = await this.waitForPeerOpen(1500);
      if (reconnected) {
        console.log('Peer broker connection verified/re-established');
        if (!this.isConnected) {
          if (!this.isHost) {
            this.startGuestConnectionLoop();
          } else {
            this.onStatusChange({
              state: 'waiting_for_partner',
              roomId: this.roomId,
              message: 'Waiting for partner to join...'
            });
          }
        }
        return;
      }
    }

    console.log(`Re-instantiating peer for room ${roomId}...`);
    const saved = this.getSavedRoomSession();
    const role = this.isHost ? 'host' : (saved?.role || (window.location.search.includes('room=') ? 'guest' : 'host'));

    if (role === 'host') {
      await this.createRoom(roomId);
    } else {
      await this.joinRoom(roomId, this.localStream);
    }
  }

  callHost(hostBrokerId) {
    if (!this.peer || !this.localStream) return;
    try {
      const call = this.peer.call(hostBrokerId, this.localStream);
      this.call = call;
      this.tuneCallLatency(call);

      call.on('stream', (remoteStream) => {
        this.remoteStream = remoteStream;
        this.tuneCallLatency(call);
        this.onRemoteStream(remoteStream);
      });
      call.on('close', () => {
        this.handleRemoteLeave();
      });
      call.on('error', (err) => {
        console.warn('Call host error:', err);
      });
    } catch (err) {
      console.warn('Call host error:', err);
    }
  }

  /**
   * Set or update local media stream (e.g. after camera restart / tab switch)
   */
  updateLocalStream(newStream) {
    this.localStream = newStream;

    // If active call exists, replace track in place
    if (this.call && this.call.peerConnection) {
      const senders = this.call.peerConnection.getSenders();
      const videoTrack = newStream ? newStream.getVideoTracks()[0] : null;
      if (videoTrack) {
        const videoSender = senders.find(s => s.track && s.track.kind === 'video') ||
                            senders.find(s => !s.track || s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack)
            .then(() => {
              this.tuneCallLatency(this.call);
            })
            .catch(e => console.warn('Track replace error:', e));
        }
      }
    } else if (!this.isHost && this.isConnected && this.roomId) {
      // Re-call if partner just enabled webcam
      const hostBrokerId = `coquette-pb-${this.roomId}`;
      this.callHost(hostBrokerId);
    }
  }

  setupDataConnection(conn) {
    if (this.conn && this.conn !== conn) {
      try { this.conn.close(); } catch (e) {}
    }
    this.conn = conn;

    conn.on('open', () => {
      this.stopGuestConnectionLoop();
      this.isConnected = true;
      this.onStatusChange({
        state: 'connected',
        roomId: this.roomId,
        isHost: this.isHost,
        message: 'Partner connected!'
      });

      // Start 3-second heartbeat to maintain state sync
      this.startHeartbeat();

      // Immediately broadcast our current local tab & camera state
      this.broadcastSyncState(this.currentLocalState);

      // If host and we have local media, call client back if needed
      if (this.isHost && this.localStream) {
        try {
          const call = this.peer.call(conn.peer, this.localStream);
          this.call = call;
          this.tuneCallLatency(call);

          call.on('stream', (remoteStream) => {
            this.remoteStream = remoteStream;
            this.tuneCallLatency(call);
            this.onRemoteStream(remoteStream);
          });
          call.on('close', () => {
            this.handleRemoteLeave();
          });
        } catch (e) {
          console.warn('Host call back error:', e);
        }
      }

      // If host, request status from partner and trigger strip sync
      if (this.isHost && this.onStatusRequest) {
        this.onStatusRequest();
      }
    });

    conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    conn.on('close', () => {
      this.stopHeartbeat();
      this.handleRemoteLeave();
      this.onPeerLeft();
    });

    conn.on('error', (err) => {
      console.warn('Data connection error:', err);
    });
  }

  handleIncomingData(data) {
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'SYNC_STATE':
        this.onSyncState(data);
        break;

      case 'PING_STATE':
        this.onSyncState(data);
        this.broadcast({
          type: 'PONG_STATE',
          activeTab: this.currentLocalState.activeTab,
          cameraActive: this.currentLocalState.cameraActive
        });
        break;

      case 'PONG_STATE':
        this.onSyncState(data);
        break;

      case 'PEER_STATUS_UPDATE':
        this.onStatusUpdate(data);
        this.onSyncState({
          activeTab: data.currentTab || 'shoot',
          cameraActive: data.cameraEnabled !== false
        });
        break;

      case 'REQUEST_PEER_STATUS':
        this.onStatusRequest();
        this.broadcastSyncState(this.currentLocalState);
        break;

      case 'CAMERA_STATE':
        this.onRemoteCameraState(data.active);
        this.onSyncState({
          cameraActive: !!data.active
        });
        break;

      case 'PEER_LEFT':
      case 'DISCONNECT':
        this.stopHeartbeat();
        this.handleRemoteLeave();
        this.onPeerLeft();
        break;

      case 'SYNC_STRIP_STATE':
        this.onStripStateSync(data);
        break;

      case 'TRANSFORM_UPDATE':
        this.onRemoteTransform(data.transform);
        break;

      case 'START_COUNTDOWN':
        this.onCountdownSync(data.duration);
        break;

      case 'SYNC_CUSTOMIZATION':
        this.onCustomizationSync(data);
        break;

      default:
        break;
    }
  }

  /**
   * Set local state and broadcast SYNC_STATE payload
   */
  setLocalState(partialState) {
    Object.assign(this.currentLocalState, partialState);
    this.broadcastSyncState(this.currentLocalState);
  }

  /**
   * Broadcast state payload: { type: 'SYNC_STATE', activeTab, cameraActive }
   */
  broadcastSyncState(payload = {}) {
    const activeTab = payload.activeTab || this.currentLocalState.activeTab || 'shoot';
    const cameraActive = payload.cameraActive !== undefined ? !!payload.cameraActive : this.currentLocalState.cameraActive;
    this.broadcast({
      type: 'SYNC_STATE',
      activeTab,
      cameraActive
    });
  }

  /**
   * 3-Second Auto-Recovery Heartbeat
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.conn && this.conn.open) {
        this.broadcast({
          type: 'PING_STATE',
          activeTab: this.currentLocalState.activeTab,
          cameraActive: this.currentLocalState.cameraActive
        });
      }
    }, 3000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Broadcast camera power/active state to peer
   */
  broadcastCameraState(active) {
    this.setLocalState({ cameraActive: !!active });
    this.broadcast({ type: 'CAMERA_STATE', active: !!active });
  }

  /**
   * Broadcast peer status update (currentTab and cameraEnabled)
   */
  broadcastPeerStatus({ currentTab, cameraEnabled }) {
    this.setLocalState({
      activeTab: currentTab || 'shoot',
      cameraActive: !!cameraEnabled
    });
    this.broadcast({
      type: 'PEER_STATUS_UPDATE',
      currentTab: currentTab || 'shoot',
      cameraEnabled: !!cameraEnabled
    });
  }

  /**
   * Request live status from peer
   */
  requestPeerStatus() {
    this.broadcast({ type: 'REQUEST_PEER_STATUS' });
  }

  /**
   * Broadcast full strip state for reconnect / live syncing
   */
  broadcastStripState(statePayload) {
    this.broadcast({
      type: 'SYNC_STRIP_STATE',
      ...statePayload
    });
  }

  /**
   * Broadcast message to peer
   */
  broadcast(payload) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(payload);
      } catch (e) {
        console.warn('Broadcast error:', e);
      }
    }
  }

  sendTransformUpdate(transform) {
    this.broadcast({
      type: 'TRANSFORM_UPDATE',
      transform
    });
  }

  broadcastCountdown(duration = 3) {
    this.broadcast({
      type: 'START_COUNTDOWN',
      duration
    });
  }

  broadcastCustomization(data) {
    this.broadcast({
      type: 'SYNC_CUSTOMIZATION',
      ...data
    });
  }

  handleRemoteLeave() {
    this.stopHeartbeat();
    this.isConnected = false;
    this.remoteStream = null;
    this.onRemoteDisconnected();
    if (this.roomId) {
      this.onStatusChange({
        state: 'waiting_for_partner',
        roomId: this.roomId,
        message: 'Waiting for partner to join...'
      });
    } else {
      this.onStatusChange({
        state: 'idle',
        message: 'Left room'
      });
    }
  }

  /**
   * Full clean teardown on Leave
   */
  leaveRoom() {
    this.stopHeartbeat();
    this.stopGuestConnectionLoop();
    this.clearRoomSession();

    // 1. Notify partner before closing
    try {
      this.broadcast({ type: 'PEER_LEFT' });
      this.broadcast({ type: 'DISCONNECT' });
    } catch (e) {}

    // 2. Close active media and data connections
    if (this.conn) {
      try { this.conn.close(); } catch (e) {}
      this.conn = null;
    }
    if (this.call) {
      try { this.call.close(); } catch (e) {}
      this.call = null;
    }

    // 3. Destroy PeerJS instance
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.isConnected = false;
    this.roomId = null;
    this.remoteStream = null;

    // 4. Clean up query param using replaceState
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.pathname);

    this.onStatusChange({ state: 'idle', message: 'Left room' });
  }
}

window.TogetherRoom = TogetherRoom;
