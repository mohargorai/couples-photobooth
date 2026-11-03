/**
 * Together Room - Real-Time WebRTC Peer-to-Peer Multiplayer System
 * Powered by PeerJS (Zero-backend serverless WebRTC media + data channels)
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
    onPeerLeft
  }) {
    this.peer = null;
    this.conn = null;
    this.call = null;
    this.roomId = null;
    this.isHost = false;
    this.isConnected = false;
    this.localStream = null;
    this.remoteStream = null;

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

  /**
   * Initialize PeerJS client cleanly
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

        // Configure fresh PeerJS with default public cloud broker
        this.peer = peerId ? new window.Peer(peerId) : new window.Peer();

        this.peer.on('open', (id) => {
          this.onStatusChange({ state: 'ready', peerId: id });
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.setupDataConnection(conn);
        });

        this.peer.on('call', (call) => {
          this.call = call;
          call.answer(this.localStream || undefined);
          call.on('stream', (remoteStream) => {
            this.remoteStream = remoteStream;
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
          this.onStatusChange({ state: 'error', message: err.type || err.message });
          if (err.type === 'unavailable-id') {
            // Room ID collision, retry with fallback
            setTimeout(() => {
              this.createRoom();
            }, 500);
          }
        });

        this.peer.on('disconnected', () => {
          this.onStatusChange({ state: 'disconnected', message: 'Network disconnected' });
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
    this.onStatusChange({ state: 'connecting', message: 'Creating your room...' });

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
      message: 'Waiting for your partner to open the link...'
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
    this.onStatusChange({ state: 'connecting', message: 'Connecting to room...' });

    await this.initPeer(); // random ID for client

    const hostBrokerId = `coquette-pb-${this.roomId}`;

    // Establish Data Connection
    const conn = this.peer.connect(hostBrokerId, { reliable: true });
    this.setupDataConnection(conn);

    // Establish Media Call if local stream is ready
    if (this.localStream) {
      this.callHost(hostBrokerId);
    }
  }

  callHost(hostBrokerId) {
    if (!this.peer || !this.localStream) return;
    try {
      const call = this.peer.call(hostBrokerId, this.localStream);
      this.call = call;
      call.on('stream', (remoteStream) => {
        this.remoteStream = remoteStream;
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
          videoSender.replaceTrack(videoTrack).catch(e => console.warn('Track replace error:', e));
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
      this.isConnected = true;
      this.onStatusChange({
        state: 'connected',
        roomId: this.roomId,
        isHost: this.isHost,
        message: 'Partner connected!'
      });

      // If host and we have local media, call client back if needed
      if (this.isHost && this.localStream) {
        try {
          const call = this.peer.call(conn.peer, this.localStream);
          this.call = call;
          call.on('stream', (remoteStream) => {
            this.remoteStream = remoteStream;
            this.onRemoteStream(remoteStream);
          });
          call.on('close', () => {
            this.handleRemoteLeave();
          });
        } catch (e) {
          console.warn('Host call back error:', e);
        }
      }

      // If host, request status from partner and trigger sync
      if (this.isHost && this.onStatusRequest) {
        this.onStatusRequest();
      }
    });

    conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    conn.on('close', () => {
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
      case 'PEER_LEFT':
      case 'DISCONNECT':
        this.handleRemoteLeave();
        this.onPeerLeft();
        break;

      case 'PEER_STATUS_UPDATE':
        this.onStatusUpdate(data);
        break;

      case 'REQUEST_PEER_STATUS':
        this.onStatusRequest();
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

      case 'CAMERA_STATE':
        this.onRemoteCameraState(data.active);
        break;

      default:
        break;
    }
  }

  /**
   * Broadcast camera power/active state to peer
   */
  broadcastCameraState(active) {
    this.broadcast({ type: 'CAMERA_STATE', active: !!active });
  }

  /**
   * Broadcast peer status update (currentTab and cameraEnabled)
   */
  broadcastPeerStatus({ currentTab, cameraEnabled }) {
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
    this.isConnected = false;
    this.remoteStream = null;
    this.onRemoteDisconnected();
    this.onStatusChange({
      state: 'partner_left',
      roomId: this.roomId,
      message: 'Partner disconnected'
    });
  }

  /**
   * Full clean teardown on Leave
   */
  leaveRoom() {
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
