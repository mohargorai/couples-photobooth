/**
 * Main Application Orchestrator
 * Connects Camera Hardware, PeerJS Together Room, Stickers, Presets, Export, and UI States.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Workflow Phase Tabs & Panels
  const tabPhaseShoot = document.getElementById('tab-phase-shoot');
  const tabPhaseDecorate = document.getElementById('tab-phase-decorate');
  const panelShoot = document.getElementById('panel-shoot');
  const panelDecorate = document.getElementById('panel-decorate');
  const btnGotoDecorate = document.getElementById('btn-goto-decorate');
  const btnGotoShoot = document.getElementById('btn-goto-shoot');

  // Advanced Camera Tray Toggle
  const btnToggleAdvCam = document.getElementById('btn-toggle-adv-cam');
  const advCamTray = document.getElementById('adv-cam-tray');

  // DOM Elements
  const webcamEl = document.getElementById('webcam');
  const remoteWebcamEl = document.getElementById('remote-webcam');
  const viewfinderFrameEl = document.getElementById('viewfinder-frame');
  const localVideoBox = document.getElementById('local-video-box');
  const remoteVideoBox = document.getElementById('remote-video-box');
  const flashEl = document.getElementById('camera-flash');
  const countdownEl = document.getElementById('countdown-display');
  const togetherGuideEl = document.getElementById('together-guide-overlay');
  const ribbonToast = document.getElementById('ribbon-toast');
  const toastMessage = document.getElementById('toast-message');

  // Hardware Controls
  const btnToggleCamPower = document.getElementById('btn-toggle-cam-power');
  const camPowerLabel = document.getElementById('cam-power-label');
  const cameraOffPlaceholder = document.getElementById('camera-off-placeholder');
  const btnTurnCamOn = document.getElementById('btn-turn-cam-on');
  const partnerCameraOffCard = document.getElementById('partner-camera-off-card');
  const cameraSelect = document.getElementById('camera-select');
  const btnMirrorH = document.getElementById('btn-mirror-h');
  const btnFlipV = document.getElementById('btn-flip-v');
  const btnRotateStep = document.getElementById('btn-rotate-step');
  const rotateAngleLabel = document.getElementById('rotate-angle-label');
  const cameraZoomRange = document.getElementById('camera-zoom-range');
  const zoomValueLabel = document.getElementById('zoom-value-label');
  const btnZoomWide = document.getElementById('btn-zoom-wide');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const btnToggleFit = document.getElementById('btn-toggle-fit');
  const fitModeLabel = document.getElementById('fit-mode-label');

  // Room Controls
  const roomControlsBar = document.getElementById('room-controls-bar');
  const roomPulseDot = document.getElementById('room-pulse-dot');
  const roomStatusText = document.getElementById('room-status-text');
  const roomIdBadge = document.getElementById('room-id-badge');
  const roomCodeDisplay = document.getElementById('room-code-display');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnCopyInvite = document.getElementById('btn-copy-invite');
  const btnLeaveRoom = document.getElementById('btn-leave-room');

  // Capture & Modes
  const btnStartSession = document.getElementById('btn-start-session');
  const shutterBtnText = document.getElementById('shutter-btn-text');
  const btnToggleTimer = document.getElementById('btn-toggle-timer');
  const timerLabel = document.getElementById('timer-label');
  const inputGalleryUpload = document.getElementById('input-gallery-upload');
  const btnLoadDemo = document.getElementById('btn-load-demo');

  const tabSolo = document.getElementById('tab-solo');
  const tabTogether = document.getElementById('tab-together');
  const tabRoom = document.getElementById('tab-room');

  // Strip & Customization
  const stripEl = document.getElementById('photobooth-strip');
  const stickerTrayEl = document.getElementById('sticker-tray');
  const btnClearStickers = document.getElementById('btn-clear-stickers');
  const captionInput = document.getElementById('strip-caption-input');
  const dateInput = document.getElementById('strip-date-input');
  const stripFooterCaption = document.getElementById('strip-footer-caption');
  const stripFooterDate = document.getElementById('strip-footer-date');

  // Export Modal
  const btnPrintStrip = document.getElementById('btn-print-strip');
  const exportModal = document.getElementById('export-modal');
  const exportCanvas = document.getElementById('export-canvas');
  const exportStripImg = document.getElementById('export-strip-img');
  const linkDownloadPng = document.getElementById('link-download-png');
  const btnCloseExport = document.getElementById('btn-close-export');
  const btnDownloadPng = document.getElementById('btn-download-png');
  const btnShareStrip = document.getElementById('btn-share-strip');

  // Pose Inspiration Modal
  const posesModal = document.getElementById('poses-modal');
  const btnClosePoses = document.getElementById('btn-close-poses');
  const btnDismissPoses = document.getElementById('btn-dismiss-poses');
  const btnApplySamplePhotos = document.getElementById('btn-apply-sample-photos');

  // Welcome Screen
  const welcomeModal = document.getElementById('welcome-modal');
  const welcomeRibbonBtn = document.getElementById('welcome-ribbon-btn');
  const btnStartClassic = document.getElementById('btn-start-classic');
  const btnStartTogether = document.getElementById('btn-start-together');
  const btnStartRoom = document.getElementById('btn-start-room');
  const btnBackWelcome = document.getElementById('btn-back-welcome');

  // Sound
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const svgSoundOn = document.getElementById('svg-sound-on');
  const svgSoundOff = document.getElementById('svg-sound-off');

  // Application State
  const state = {
    mode: 'solo', // 'solo', 'together', or 'room'
    currentPhase: 'shoot', // 'shoot' or 'decorate'
    timerDuration: 3,
    activeSlotIndex: 0,
    isCapturingSession: false,
    frameStyle: 'classic', // 8 styles: classic, gingham, polkadot, lace, ribbon, airmail, watercolor, film
    fontFamily: 'Caveat',  // Caveat, Sacramento, Indie Flower
    inkColor: '#5A3E42',    // #5A3E42, #D85A67, #C47A87
    userPhotos: [null, null, null, null],
    togetherPhotos: [null, null, null, null],
    decodedUserPhotos: [null, null, null, null],
    decodedTogetherPhotos: [null, null, null, null],
    isMuted: false,
    isCameraActive: true,
    cameraManuallyTurnedOff: false,
    remoteTransform: { mirrorH: true, flipV: false, rotation: 0 }
  };

  // Subsystems
  const camera = new PhotoboothCamera(webcamEl);
  const stickers = new StickerStudio(stripEl);
  const exporter = new PhotoboothExporter();

  // Toast Helper
  let toastTimer = null;
  function showToast(message, duration = 2500) {
    if (!ribbonToast) return;
    toastMessage.textContent = message;
    ribbonToast.classList.remove('is-hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      ribbonToast.classList.add('is-hidden');
    }, duration);
  }

  // Session Storage Persistence
  const STRIP_STORAGE_KEY = 'couples_photobooth_strip_state';

  function saveStripStateToSession() {
    try {
      const payload = {
        userPhotos: state.userPhotos,
        togetherPhotos: state.togetherPhotos,
        frameStyle: state.frameStyle,
        caption: captionInput ? captionInput.value : '',
        date: dateInput ? dateInput.value : '',
        fontFamily: state.fontFamily,
        inkColor: state.inkColor,
        stickers: stickers && stickers.stickers ? stickers.stickers.map(s => ({
          catalogId: s.catalogId,
          xPercent: s.xPercent,
          yPercent: s.yPercent,
          scale: s.scale,
          rotation: s.rotation
        })) : []
      };
      sessionStorage.setItem(STRIP_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('SessionStorage save error:', e);
    }
  }

  function restoreStripStateFromSession() {
    try {
      const raw = sessionStorage.getItem(STRIP_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      let hasCustomPhotos = false;

      if (Array.isArray(data.userPhotos)) {
        data.userPhotos.forEach((p, idx) => {
          if (p) {
            state.userPhotos[idx] = p;
            hasCustomPhotos = true;
          }
        });
      }
      if (Array.isArray(data.togetherPhotos)) {
        data.togetherPhotos.forEach((p, idx) => {
          if (p) {
            state.togetherPhotos[idx] = p;
            hasCustomPhotos = true;
          }
        });
      }
      if (data.frameStyle) {
        state.frameStyle = data.frameStyle;
        applyFrameStyle(data.frameStyle, false);
      }
      if (data.caption !== undefined && captionInput) {
        captionInput.value = data.caption;
        if (stripFooterCaption) stripFooterCaption.textContent = data.caption;
      }
      if (data.date !== undefined && dateInput) {
        dateInput.value = data.date;
        if (stripFooterDate) stripFooterDate.textContent = `  ${data.date}  `;
      }
      if (data.fontFamily) {
        state.fontFamily = data.fontFamily;
        applyFontFamily(data.fontFamily, false);
      }
      if (data.inkColor) {
        state.inkColor = data.inkColor;
        applyInkColor(data.inkColor, false);
      }
      if (Array.isArray(data.stickers) && stickers) {
        stickers.clearAll();
        data.stickers.forEach(s => {
          stickers.addSticker(s.catalogId, {
            xPercent: s.xPercent,
            yPercent: s.yPercent,
            scale: s.scale,
            rotation: s.rotation
          });
        });
        stickers.selectedSticker = null;
        document.querySelectorAll('.sticker-element').forEach(el => el.classList.remove('is-selected'));
      }
      if (hasCustomPhotos) {
        updateStripDOM();
      }
      return hasCustomPhotos;
    } catch (e) {
      console.warn('SessionStorage restore error:', e);
      return false;
    }
  }

  function syncStripToPartner() {
    if (state.mode === 'room' && room.isConnected) {
      room.broadcastStripState({
        photos: state.userPhotos,
        togetherPhotos: state.togetherPhotos,
        frameStyle: state.frameStyle,
        caption: captionInput ? captionInput.value : '',
        date: dateInput ? dateInput.value : '',
        fontFamily: state.fontFamily,
        inkColor: state.inkColor,
        stickers: stickers && stickers.stickers ? stickers.stickers.map(s => ({
          catalogId: s.catalogId,
          xPercent: s.xPercent,
          yPercent: s.yPercent,
          scale: s.scale,
          rotation: s.rotation
        })) : []
      });
    }
  }

  let decorationSyncDebounce = null;
  function broadcastDecorationSync(immediate = false) {
    if (state.mode !== 'room' || !room.isConnected) return;

    const send = () => {
      room.broadcastDecoration({
        frameId: state.frameStyle,
        captionText: captionInput ? captionInput.value : '',
        dateText: dateInput ? dateInput.value : '',
        fontFamily: state.fontFamily,
        inkColor: state.inkColor,
        stickers: stickers && stickers.stickers ? stickers.stickers.map(s => ({
          catalogId: s.catalogId,
          xPercent: s.xPercent,
          yPercent: s.yPercent,
          scale: s.scale,
          rotation: s.rotation
        })) : []
      });
    };

    if (immediate) {
      clearTimeout(decorationSyncDebounce);
      send();
    } else {
      clearTimeout(decorationSyncDebounce);
      decorationSyncDebounce = setTimeout(send, 100);
    }
  }

  stickers.onStickersChange = () => {
    saveStripStateToSession();
    broadcastDecorationSync(false);
  };

  // White Rose and Camera-Off SVGs for partner status card
  const WHITE_ROSE_DECORATING_SVG = `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <path d="M16 9 C14 9 13 11 13 13 C13 15.5 15 17 16 17 C17 17 19 15.5 19 13 C19 11 18 9 16 9 Z" fill="#FFFDF7" stroke="#5A3E42" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M14.5 12 C14.5 10.5 15.5 10 16 10 C16.8 10 17.5 10.8 17.5 11.8 C17.5 13 16.5 13.5 15.5 14" stroke="#5A3E42" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M12 12 C10 13.5 10 16 11.5 17.5 C13 19 15 19.5 16 19.5 C17 19.5 19 19 20.5 17.5 C22 16 22 13.5 20 12" fill="#FFFFFF" stroke="#5A3E42" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M9 14 C7.5 16.5 8 20 11 22 C13 23.5 16 24 16 24 C16 24 19 23.5 21 22 C24 20 24.5 16.5 23 14" fill="#FFFFFF" stroke="#5A3E42" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M15 15.5 C15.5 16 16.5 16 17 15.5" stroke="#F7E6EA" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  const CAMERA_RESTING_SVG = `<svg viewBox="0 0 20 20" width="28" height="28" fill="none" stroke="#D85A67" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 3 6 C 3 4.8 4 4 5 4 L 7 4 L 8.5 2 L 11.5 2 L 13 4 L 15 4 C 16.2 4 17 4.8 17 6 L 17 14 C 17 15.2 16.2 16 15 16 L 5 16 C 4 16 3 15.2 3 14 Z"/>
    <line x1="2" y1="2" x2="18" y2="18"/>
  </svg>`;

  function handlePartnerSyncState({ activeTab, cameraActive }) {
    if (!partnerCameraOffCard) return;
    const textEl = document.getElementById('partner-off-text') || partnerCameraOffCard.querySelector('.partner-off-text');
    const iconEl = document.getElementById('partner-card-icon');

    if (activeTab === 'shoot' && cameraActive) {
      partnerCameraOffCard.classList.add('is-hidden');
      if (remoteWebcamEl && remoteWebcamEl.paused) {
        remoteWebcamEl.play().catch(() => {});
      }
    } else if (activeTab === 'decorate') {
      partnerCameraOffCard.classList.remove('is-hidden');
      if (textEl) textEl.textContent = 'Gungun is decorating the strip...';
      if (iconEl) iconEl.innerHTML = WHITE_ROSE_DECORATING_SVG;
    } else {
      // activeTab === 'shoot' && !cameraActive
      partnerCameraOffCard.classList.remove('is-hidden');
      if (textEl) textEl.textContent = "Partner's camera is resting";
      if (iconEl) iconEl.innerHTML = CAMERA_RESTING_SVG;
    }
  }

  // Real-Time WebRTC Together Room
  const room = new TogetherRoom({
    onRemoteStream: (stream) => {
      remoteWebcamEl.srcObject = stream;
      remoteWebcamEl.playsInline = true;
      remoteWebcamEl.autoplay = true;
      remoteWebcamEl.muted = true;
      remoteWebcamEl.play().catch(() => {});
      viewfinderFrameEl.classList.add('is-duo-view');
      if (partnerCameraOffCard) partnerCameraOffCard.classList.add('is-hidden');
      window.photoboothAudio.playOpenEnvelope();
      showToast('Partner connected! You are both in the room.');
    },

    onRemoteTransform: (transform) => {
      state.remoteTransform = transform;
      camera.applyViewfinderTransform(remoteWebcamEl, transform);
    },

    onRemoteCameraState: (active) => {
      handlePartnerSyncState({
        activeTab: state.currentPhase,
        cameraActive: !!active
      });
    },

    onRemoteDisconnected: () => {
      viewfinderFrameEl.classList.remove('is-duo-view');
      if (remoteWebcamEl) remoteWebcamEl.srcObject = null;
      showToast('Partner disconnected.');
    },

    onPeerLeft: () => {
      viewfinderFrameEl.classList.remove('is-duo-view');
      if (remoteWebcamEl) remoteWebcamEl.srcObject = null;
      if (partnerCameraOffCard) partnerCameraOffCard.classList.add('is-hidden');
      roomPulseDot.className = 'status-pulse is-waiting';
      roomStatusText.textContent = 'Waiting for partner to join...';
      showToast('Partner left the room.');
    },

    onSyncState: (data) => {
      handlePartnerSyncState(data);
    },

    onStatusUpdate: (data) => {
      handlePartnerSyncState({
        activeTab: data.currentTab || 'shoot',
        cameraActive: !!data.cameraEnabled
      });
    },

    onStatusRequest: () => {
      room.broadcastPeerStatus({
        currentTab: state.currentPhase,
        cameraEnabled: state.isCameraActive
      });
      room.broadcastSyncState(state.currentPhase, state.isCameraActive);
      if (room.isHost) {
        syncStripToPartner();
      }
    },

    onStripStateSync: (data) => {
      if (Array.isArray(data.photos)) {
        data.photos.forEach((p, idx) => {
          if (p) state.userPhotos[idx] = p;
        });
      }
      if (Array.isArray(data.togetherPhotos)) {
        data.togetherPhotos.forEach((p, idx) => {
          if (p) state.togetherPhotos[idx] = p;
        });
      }
      if (data.frameStyle) {
        state.frameStyle = data.frameStyle;
        applyFrameStyle(data.frameStyle, false);
      }
      if (data.caption !== undefined && captionInput) {
        captionInput.value = data.caption;
        if (stripFooterCaption) stripFooterCaption.textContent = data.caption;
      }
      if (data.date !== undefined && dateInput) {
        dateInput.value = data.date;
        if (stripFooterDate) stripFooterDate.textContent = `  ${data.date}  `;
      }
      if (data.fontFamily) {
        state.fontFamily = data.fontFamily;
        applyFontFamily(data.fontFamily, false);
      }
      if (data.inkColor) {
        state.inkColor = data.inkColor;
        applyInkColor(data.inkColor, false);
      }
      if (Array.isArray(data.stickers) && stickers) {
        stickers.clearAll();
        data.stickers.forEach(s => {
          stickers.addSticker(s.catalogId, {
            xPercent: s.xPercent,
            yPercent: s.yPercent,
            scale: s.scale,
            rotation: s.rotation
          });
        });
        stickers.selectedSticker = null;
        document.querySelectorAll('.sticker-element').forEach(el => el.classList.remove('is-selected'));
      }
      updateStripDOM();
      saveStripStateToSession();
    },

    onCountdownSync: (duration) => {
      runSynchronizedSession(duration);
    },

    onCustomizationSync: (data) => {
      if (data.frameStyle) {
        applyFrameStyle(data.frameStyle, false);
      }
      if (data.caption !== undefined) {
        captionInput.value = data.caption;
        stripFooterCaption.textContent = data.caption;
      }
      if (data.fontFamily) {
        applyFontFamily(data.fontFamily, false);
      }
      if (data.inkColor) {
        applyInkColor(data.inkColor, false);
      }
      if (data.preset) {
        stickers.applyPreset(data.preset);
      }
      saveStripStateToSession();
    },

    onStatusChange: (status) => {
      updateRoomUI(status);
    },

    onDecorationSync: (payload) => {
      if (!payload) return;
      if (payload.frameId) {
        state.frameStyle = payload.frameId;
        applyFrameStyle(payload.frameId, false);
      }
      if (payload.captionText !== undefined && captionInput) {
        captionInput.value = payload.captionText;
        if (stripFooterCaption) stripFooterCaption.textContent = payload.captionText;
      }
      if (payload.dateText !== undefined && dateInput) {
        dateInput.value = payload.dateText;
        if (stripFooterDate) stripFooterDate.textContent = `  ${payload.dateText}  `;
      }
      if (payload.fontFamily) {
        state.fontFamily = payload.fontFamily;
        applyFontFamily(payload.fontFamily, false);
      }
      if (payload.inkColor) {
        state.inkColor = payload.inkColor;
        applyInkColor(payload.inkColor, false);
      }
      if (Array.isArray(payload.stickers) && stickers) {
        stickers.clearAll();
        payload.stickers.forEach(s => {
          stickers.addSticker(s.catalogId, {
            xPercent: s.xPercent,
            yPercent: s.yPercent,
            scale: s.scale,
            rotation: s.rotation
          });
        });
        stickers.selectedSticker = null;
        document.querySelectorAll('.sticker-element').forEach(el => el.classList.remove('is-selected'));
      }
      saveStripStateToSession();
    },

    onSlotPhotoSync: async (data) => {
      const { slotIndex, dataUrl } = data;
      if (slotIndex !== undefined && dataUrl) {
        state.togetherPhotos[slotIndex] = dataUrl;
        const img = new Image();
        img.src = dataUrl;
        try { await img.decode(); } catch (e) {}
        state.decodedTogetherPhotos[slotIndex] = img;
        updateStripDOM();
        saveStripStateToSession();
      }
    },

    onTriggerPrint: () => {
      triggerPrintWorkflow(false);
    }
  });

  function updateRoomUI(status) {
    const currentRoomId = status.roomId || (room ? room.roomId : null);

    if (status.state === 'waiting_for_partner') {
      roomPulseDot.className = 'status-pulse is-waiting';
      roomStatusText.textContent = status.message || 'Waiting for partner to join...';
      roomIdBadge.classList.remove('is-hidden');
      if (currentRoomId) roomCodeDisplay.textContent = currentRoomId;
      btnCreateRoom.classList.add('is-hidden');
      btnCopyInvite.classList.remove('is-hidden');
      btnLeaveRoom.classList.remove('is-hidden');
      if (status.showToast) {
        showToast('Room created! Share your invite link.');
      }
    } else if (status.state === 'connected') {
      roomPulseDot.className = 'status-pulse is-online';
      roomStatusText.textContent = 'Partner connected!';
      roomIdBadge.classList.remove('is-hidden');
      if (currentRoomId) roomCodeDisplay.textContent = currentRoomId;
      btnCreateRoom.classList.add('is-hidden');
      btnCopyInvite.classList.remove('is-hidden');
      btnLeaveRoom.classList.remove('is-hidden');
    } else if (status.state === 'connecting' || status.state === 'reconnecting') {
      roomPulseDot.className = 'status-pulse is-waiting';
      roomStatusText.textContent = status.message || (status.state === 'reconnecting' ? 'Reconnecting room...' : 'Connecting...');
      if (currentRoomId) {
        roomIdBadge.classList.remove('is-hidden');
        roomCodeDisplay.textContent = currentRoomId;
        btnCreateRoom.classList.add('is-hidden');
        btnCopyInvite.classList.remove('is-hidden');
        btnLeaveRoom.classList.remove('is-hidden');
      }
    } else {
      roomPulseDot.className = 'status-pulse';
      roomStatusText.textContent = status.message || 'Room offline';
      roomIdBadge.classList.add('is-hidden');
      btnCreateRoom.classList.remove('is-hidden');
      btnCopyInvite.classList.add('is-hidden');
      btnLeaveRoom.classList.add('is-hidden');
    }
  }

  // Camera Transform Changes: Sync to partner
  camera.onTransformChange = (transform) => {
    btnMirrorH.classList.toggle('is-active-toggle', transform.mirrorH);
    btnFlipV.classList.toggle('is-active-toggle', transform.flipV);
    rotateAngleLabel.textContent = `${transform.rotation}°`;

    if (state.mode === 'room' && room.isConnected) {
      room.sendTransformUpdate(transform);
    }
  };

  camera.onDevicesUpdated = (devices) => {
    cameraSelect.innerHTML = '';
    if (devices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Default Camera';
      cameraSelect.appendChild(opt);
      return;
    }

    devices.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label;
      if (d.deviceId === camera.currentDeviceId) {
        opt.selected = true;
      }
      cameraSelect.appendChild(opt);
    });
  };

  cameraSelect.addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    try {
      const stream = await camera.selectDevice(deviceId);
      state.isCameraActive = true;
      state.cameraManuallyTurnedOff = false;
      if (cameraOffPlaceholder) cameraOffPlaceholder.classList.add('is-hidden');
      if (localVideoBox) localVideoBox.classList.remove('is-hidden');
      if (btnToggleCamPower) {
        btnToggleCamPower.classList.add('is-active-toggle');
        btnToggleCamPower.title = 'Turn Camera Off';
      }
      if (camPowerLabel) camPowerLabel.textContent = 'Cam On';
      if (btnStartSession) {
        btnStartSession.classList.remove('is-disabled');
        btnStartSession.removeAttribute('aria-disabled');
      }
      if (state.mode === 'room') {
        room.updateLocalStream(stream);
        room.broadcastCameraState(true);
      }
    } catch (err) {
      console.warn('Failed to switch camera device:', err);
    }
  });

  btnMirrorH.addEventListener('click', () => camera.toggleMirrorH());
  btnFlipV.addEventListener('click', () => camera.toggleFlipV());
  btnRotateStep.addEventListener('click', () => camera.stepRotate());

  // Zoom & Field of View Controls
  function updateZoom(val) {
    const num = parseFloat(val);
    camera.setZoom(num);
    zoomValueLabel.textContent = `${num.toFixed(2)}x`;
    cameraZoomRange.value = num;
  }

  if (cameraZoomRange) {
    cameraZoomRange.addEventListener('input', (e) => {
      updateZoom(e.target.value);
    });
  }

  if (btnZoomWide) {
    btnZoomWide.addEventListener('click', () => {
      updateZoom(0.75);
    });
  }

  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => {
      updateZoom(1.0);
    });
  }

  if (btnToggleFit) {
    btnToggleFit.addEventListener('click', () => {
      const mode = camera.toggleFitMode();
      fitModeLabel.textContent = mode === 'contain' ? 'Fill Fit' : 'Fit Full';
      btnToggleFit.classList.toggle('is-active-toggle', mode === 'contain');
    });
  }

  // Phase Switching (1. Pose & Shoot vs 2. Decorate Strip)
  function setWorkflowPhase(phase) {
    state.currentPhase = phase;
    const studioLayout = document.querySelector('.studio-layout');
    if (studioLayout) {
      studioLayout.classList.toggle('is-phase-decorate', phase === 'decorate');
      studioLayout.classList.toggle('is-phase-shoot', phase === 'shoot');
    }

    if (phase === 'shoot') {
      tabPhaseShoot.classList.add('is-active');
      tabPhaseDecorate.classList.remove('is-active');
      panelShoot.classList.remove('is-hidden');
      panelDecorate.classList.add('is-hidden');

      if (state.mode === 'room' && room.isConnected) {
        if (camera.stream) {
          camera.stream.getVideoTracks().forEach(t => t.enabled = true);
        }
      }

      // Seamlessly restart camera if not manually toggled off
      if (!state.cameraManuallyTurnedOff) {
        enableCamera(false).then((stream) => {
          if (state.mode === 'room' && room.isConnected) {
            if (stream) room.updateLocalStream(stream);
            room.broadcastPeerStatus({ currentTab: 'shoot', cameraEnabled: state.isCameraActive });
            room.broadcastSyncState('shoot', state.isCameraActive);
            room.requestPeerStatus();
          }
        });
      } else if (state.mode === 'room' && room.isConnected) {
        room.broadcastPeerStatus({ currentTab: 'shoot', cameraEnabled: false });
        room.broadcastSyncState('shoot', false);
        room.requestPeerStatus();
      }
    } else {
      tabPhaseShoot.classList.remove('is-active');
      tabPhaseDecorate.classList.add('is-active');
      panelShoot.classList.add('is-hidden');
      panelDecorate.classList.remove('is-hidden');
      stickers.recalculateLayout();

      if (state.mode === 'room' && room.isConnected) {
        // In Together Room, pause video tracks so WebRTC connection stays alive
        if (camera.stream) {
          camera.stream.getVideoTracks().forEach(t => t.enabled = false);
        }
        state.isCameraActive = false;
        room.broadcastPeerStatus({ currentTab: 'decorate', cameraEnabled: false });
        room.broadcastSyncState('decorate', false);
      } else {
        // Automatically release camera hardware when leaving Pose & Shoot
        disableCamera(false);
      }
    }
  }

  tabPhaseShoot.addEventListener('click', () => setWorkflowPhase('shoot'));
  tabPhaseDecorate.addEventListener('click', () => setWorkflowPhase('decorate'));
  if (btnGotoDecorate) btnGotoDecorate.addEventListener('click', () => setWorkflowPhase('decorate'));
  if (btnGotoShoot) btnGotoShoot.addEventListener('click', () => setWorkflowPhase('shoot'));

  if (btnToggleAdvCam && advCamTray) {
    btnToggleAdvCam.addEventListener('click', () => {
      advCamTray.classList.toggle('is-hidden');
      btnToggleAdvCam.classList.toggle('is-active-toggle', !advCamTray.classList.contains('is-hidden'));
    });
  }
  const defaultDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  dateInput.value = defaultDateStr;
  stripFooterDate.textContent = `• ${defaultDateStr} •`;

  // Prepopulate Demo Posers or restore from session
  function loadDemoPoses() {
    for (let i = 0; i < 4; i++) {
      state.userPhotos[i] = PhotoboothCamera.generatePlaceholder(i, `Pose ${i + 1}`, false);
      state.togetherPhotos[i] = PhotoboothCamera.generatePlaceholder(i, `Partner Pose ${i + 1}`, true);
    }
    const restored = restoreStripStateFromSession();
    if (!restored) {
      updateStripDOM();
    }
  }
  loadDemoPoses();

  // Populate 16 Stickers Tray
  function buildStickerTray() {
    stickerTrayEl.innerHTML = '';
    STICKER_CATALOG.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'sticker-item-btn';
      btn.title = `Add ${item.name}`;
      btn.innerHTML = item.svg;
      btn.addEventListener('click', () => {
        stickers.addSticker(item.id);
      });
      stickerTrayEl.appendChild(btn);
    });
  }
  buildStickerTray();

  btnClearStickers.addEventListener('click', () => {
    stickers.clearAll();
    broadcastDecorationSync(true);
  });

  // One-Tap Sticker Layout Presets
  document.querySelectorAll('.preset-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      stickers.applyPreset(preset);
      if (state.mode === 'room' && room.isConnected) {
        room.broadcastCustomization({ preset });
        broadcastDecorationSync(true);
      }
    });
  });

  // Welcome Screen Interactions
  let isDismissingWelcome = false;
  function dismissWelcome(selectedMode) {
    if (isDismissingWelcome) return;
    isDismissingWelcome = true;

    if (selectedMode) {
      setBoothMode(selectedMode);
    }
    try {
      window.photoboothAudio.playOpenEnvelope();
    } catch (e) {}

    welcomeRibbonBtn.classList.add('is-untying');

    setTimeout(() => {
      welcomeModal.classList.add('is-dismissed');
      setTimeout(() => {
        welcomeModal.classList.add('is-hidden');
        welcomeRibbonBtn.classList.remove('is-untying');
        isDismissingWelcome = false;
      }, 500);
      if (!state.cameraManuallyTurnedOff) {
        enableCamera(false);
      }
    }, 550);
  }

  welcomeRibbonBtn.addEventListener('click', () => dismissWelcome('solo'));
  btnStartClassic.addEventListener('click', () => dismissWelcome('solo'));
  btnStartTogether.addEventListener('click', () => dismissWelcome('together'));
  btnStartRoom.addEventListener('click', () => dismissWelcome('room'));

  btnBackWelcome.addEventListener('click', () => {
    // Automatically stop hardware camera stream when returning to letter
    disableCamera(false);
    welcomeModal.classList.remove('is-hidden');
    setTimeout(() => {
      welcomeModal.classList.remove('is-dismissed');
    }, 10);
  });

  // Sound Toggle
  btnSoundToggle.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    window.photoboothAudio.isMuted = state.isMuted;
    if (state.isMuted) {
      svgSoundOn.classList.add('is-hidden');
      svgSoundOff.classList.remove('is-hidden');
    } else {
      svgSoundOn.classList.remove('is-hidden');
      svgSoundOff.classList.add('is-hidden');
      window.photoboothAudio.playCountdownTick(1);
    }
  });

  // Camera Power & Lifecycle Management
  async function enableCamera(force = false) {
    if (!force && state.cameraManuallyTurnedOff) {
      return null;
    }
    state.cameraManuallyTurnedOff = false;
    state.isCameraActive = true;

    if (cameraOffPlaceholder) cameraOffPlaceholder.classList.add('is-hidden');
    if (localVideoBox) localVideoBox.classList.remove('is-hidden');
    if (btnToggleCamPower) {
      btnToggleCamPower.classList.add('is-active-toggle');
      btnToggleCamPower.title = 'Turn Camera Off';
    }
    if (camPowerLabel) camPowerLabel.textContent = 'Cam On';
    if (btnStartSession) {
      btnStartSession.classList.remove('is-disabled');
      btnStartSession.removeAttribute('aria-disabled');
    }

    try {
      const stream = await camera.startCamera({ deviceId: camera.currentDeviceId });
      if (state.mode === 'room') {
        room.updateLocalStream(stream);
        room.broadcastCameraState(true);
        room.broadcastSyncState('shoot', true);
      }
      return stream;
    } catch (err) {
      console.warn('Could not start camera:', err);
      showToast('Camera unavailable • Check device permissions');
      return null;
    }
  }

  function disableCamera(isManual = false) {
    if (isManual) {
      state.cameraManuallyTurnedOff = true;
    }
    state.isCameraActive = false;

    // Completely stop all active hardware video tracks and clear srcObject
    camera.stopCamera();

    if (cameraOffPlaceholder) cameraOffPlaceholder.classList.remove('is-hidden');
    if (localVideoBox) localVideoBox.classList.add('is-hidden');
    if (btnToggleCamPower) {
      btnToggleCamPower.classList.remove('is-active-toggle');
      btnToggleCamPower.title = 'Turn Camera On';
    }
    if (camPowerLabel) camPowerLabel.textContent = 'Cam Off';
    if (btnStartSession) {
      btnStartSession.classList.add('is-disabled');
      btnStartSession.setAttribute('aria-disabled', 'true');
    }

    if (state.mode === 'room' && room.isConnected) {
      room.broadcastCameraState(false);
      room.broadcastSyncState(state.currentPhase, false);
    }
  }

  // Camera Initialization helper
  async function initWebcam() {
    return enableCamera(false);
  }

  // Manual Camera Power Toggle Button
  if (btnToggleCamPower) {
    btnToggleCamPower.addEventListener('click', () => {
      if (state.isCameraActive) {
        disableCamera(true);
        showToast('Camera turned off • Hardware indicator released');
      } else {
        enableCamera(true);
        showToast('Camera turned on!');
      }
    });
  }

  // Wake Button on Placeholder Card
  if (btnTurnCamOn) {
    btnTurnCamOn.addEventListener('click', () => {
      enableCamera(true);
      showToast('Camera turned on!');
    });
  }

  // Browser Tab Minimization & Mobile App Switching Visibility Listener
  async function handleAppResume() {
    await ensureCameraActive();

    const savedSession = room ? room.getSavedRoomSession() : null;
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room');
    const activeRoomId = urlRoom || (savedSession ? savedSession.roomId : null);

    if (activeRoomId && room) {
      if (state.mode !== 'room') {
        setBoothMode('room');
      }
      await room.ensureConnected(activeRoomId);
      if (camera.stream) {
        room.updateLocalStream(camera.stream);
      }
    }
  }

  async function ensureCameraActive() {
    if (state.cameraManuallyTurnedOff) return;
    if (state.currentPhase !== 'shoot') return;

    if (localVideoBox) localVideoBox.classList.remove('is-hidden');
    if (cameraOffPlaceholder) cameraOffPlaceholder.classList.add('is-hidden');

    const stream = camera.stream;
    const tracks = stream ? stream.getVideoTracks() : [];
    const isTrackDead = !tracks.length || tracks.some(t => t.readyState === 'ended' || !t.enabled);
    const isVideoElementDead = !webcamEl.srcObject || webcamEl.paused || webcamEl.readyState === 0;

    if (!stream || isTrackDead || isVideoElementDead) {
      console.log('Restoring camera feed after app switch / background...');
      try {
        const newStream = await enableCamera(false);
        if (newStream && room && room.isConnected) {
          room.updateLocalStream(newStream);
        }
      } catch (e) {
        console.warn('Failed to restore camera feed:', e);
      }
    } else if (webcamEl.paused) {
      webcamEl.play().catch(() => {});
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Do NOT release camera hardware if actively in a Together Room or waiting in a room session
      const inRoom = state.mode === 'room' || (room && room.roomId);
      if (!inRoom && camera.isStreaming) {
        camera.stopCamera();
      }
    } else {
      handleAppResume();
    }
  });

  window.addEventListener('focus', handleAppResume);
  window.addEventListener('pageshow', handleAppResume);

  btnToggleTimer.addEventListener('click', () => {
    state.timerDuration = state.timerDuration === 3 ? 5 : 3;
    timerLabel.textContent = `${state.timerDuration}s Timer`;
  });

  btnLoadDemo.addEventListener('click', () => {
    if (posesModal) {
      posesModal.classList.remove('is-hidden');
    }
  });

  function closePosesModal() {
    if (posesModal) posesModal.classList.add('is-hidden');
  }

  if (btnClosePoses) btnClosePoses.addEventListener('click', closePosesModal);
  if (btnDismissPoses) btnDismissPoses.addEventListener('click', closePosesModal);
  if (posesModal) {
    posesModal.addEventListener('click', (e) => {
      if (e.target === posesModal) closePosesModal();
    });
  }

  if (btnApplySamplePhotos) {
    btnApplySamplePhotos.addEventListener('click', () => {
      for (let i = 0; i < 4; i++) {
        state.userPhotos[i] = PhotoboothCamera.generateSamplePhoto(i, false);
        state.togetherPhotos[i] = PhotoboothCamera.generateSamplePhoto(i, true);
      }
      updateStripDOM();
      saveStripStateToSession();
      closePosesModal();
      setWorkflowPhase('decorate');
      showToast('Sample romantic photos loaded onto your strip!');
      PhotoboothAudio.playShutter();
      if (state.mode === 'room' && room.isConnected) {
        room.broadcastCustomization({ refresh: true });
        syncStripToPartner();
      }
    });
  }

  // Gallery Upload
  inputGalleryUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const uploadRes = await PhotoboothCamera.processUploadedImage(file, 960, 720);
      const photoUrl = (uploadRes && uploadRes.url) ? uploadRes.url : uploadRes;
      const photoImg = (uploadRes && uploadRes.img) ? uploadRes.img : null;
      state.userPhotos[state.activeSlotIndex] = photoUrl;
      state.decodedUserPhotos[state.activeSlotIndex] = photoImg;
      updateStripDOM();
      saveStripStateToSession();
      syncStripToPartner();
      state.activeSlotIndex = (state.activeSlotIndex + 1) % 4;
      highlightActiveSlotTile();
      showToast('Photo added to strip!');
    } catch (err) {
      showToast(err.message || 'Failed to process image');
    }
    inputGalleryUpload.value = '';
  });

  // Mode Switcher (Solo, Duo Upload, or Together Room)
  function setBoothMode(mode) {
    state.mode = mode;
    tabSolo.classList.toggle('is-active', mode === 'solo');
    tabTogether.classList.toggle('is-active', mode === 'together');
    tabRoom.classList.toggle('is-active', mode === 'room');

    if (mode === 'solo') {
      togetherGuideEl.classList.add('is-hidden');
      roomControlsBar.classList.add('is-hidden');
      viewfinderFrameEl.classList.remove('is-duo-view');
      shutterBtnText.textContent = 'Take 4 Sequential Shots';
    } else if (mode === 'together') {
      togetherGuideEl.classList.remove('is-hidden');
      roomControlsBar.classList.add('is-hidden');
      viewfinderFrameEl.classList.remove('is-duo-view');
      shutterBtnText.textContent = 'Take 4 Shots (Duo Mode)';
    } else if (mode === 'room') {
      togetherGuideEl.classList.add('is-hidden');
      roomControlsBar.classList.remove('is-hidden');
      if (room.isConnected) {
        viewfinderFrameEl.classList.add('is-duo-view');
      }
      shutterBtnText.textContent = 'Take Our Photos Together';
    }

    updateStripDOM();
  }

  tabSolo.addEventListener('click', () => setBoothMode('solo'));
  tabTogether.addEventListener('click', () => setBoothMode('together'));
  tabRoom.addEventListener('click', () => setBoothMode('room'));

  // Together Room Button Handlers
  btnCreateRoom.addEventListener('click', async () => {
    try {
      await room.createRoom();
      if (camera.stream) {
        room.updateLocalStream(camera.stream);
      }
    } catch (err) {
      showToast('Could not start multiplayer room • Check connection');
    }
  });

  btnCopyInvite.addEventListener('click', () => {
    const inviteUrl = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        showToast('Invite link copied! Send this to her');
      }).catch(() => {
        fallbackCopyInvite(inviteUrl);
      });
    } else {
      fallbackCopyInvite(inviteUrl);
    }
  });

  function fallbackCopyInvite(text) {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast('Invite link copied! Send this to her');
    } catch (e) {
      showToast('Invite link ready to share');
    }
  }

  btnLeaveRoom.addEventListener('click', () => {
    room.leaveRoom();
    viewfinderFrameEl.classList.remove('is-duo-view');
    if (remoteWebcamEl) remoteWebcamEl.srcObject = null;
    if (partnerCameraOffCard) partnerCameraOffCard.classList.add('is-hidden');
    showToast('You have left the Together Room.');
  });

  // Check URL query or sessionStorage on load: e.g. ?room=rose-4892
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const savedSession = room ? room.getSavedRoomSession() : null;
  const initialRoomId = roomParam || (savedSession ? savedSession.roomId : null);

  if (initialRoomId) {
    setBoothMode('room');
    welcomeModal.classList.add('is-hidden');
    welcomeModal.classList.add('is-dismissed');
    initWebcam().then((stream) => {
      const role = (savedSession && savedSession.roomId === initialRoomId) ? savedSession.role : (roomParam ? 'guest' : 'host');
      if (role === 'host') {
        room.createRoom(initialRoomId);
      } else {
        room.joinRoom(initialRoomId, stream || camera.stream);
      }
    });
  }

  // Update Photobooth Strip DOM Photos
  function updateStripDOM() {
    const isDuo = (state.mode === 'together' || state.mode === 'room');

    for (let i = 0; i < 4; i++) {
      const slotEl = stripEl.querySelector(`.strip-photo-slot[data-slot="${i}"]`);
      if (!slotEl) continue;

      const contentWrapper = slotEl.querySelector('.slot-content-wrapper');
      const userImg = slotEl.querySelector('.user-photo');
      const partnerWrapper = slotEl.querySelector('.duo-partner-view');
      const partnerImg = slotEl.querySelector('.partner-photo');

      if (isDuo) {
        contentWrapper.classList.remove('mode-solo-view');
        contentWrapper.classList.add('mode-together-view');
        partnerWrapper.classList.remove('is-hidden');

        const userSrc = state.userPhotos[i] || PhotoboothCamera.generatePlaceholder(i, `Pose ${i + 1}`);
        const partnerSrc = state.togetherPhotos[i] || PhotoboothCamera.generatePlaceholder(i, `Partner ${i + 1}`, true);

        if (userImg) {
          userImg.loading = 'eager';
          userImg.decoding = 'sync';
          if (userImg.getAttribute('src') !== userSrc) {
            userImg.src = userSrc;
          }
        }
        if (partnerImg) {
          partnerImg.loading = 'eager';
          partnerImg.decoding = 'sync';
          if (partnerImg.getAttribute('src') !== partnerSrc) {
            partnerImg.src = partnerSrc;
          }
        }
      } else {
        contentWrapper.classList.add('mode-solo-view');
        contentWrapper.classList.remove('mode-together-view');
        partnerWrapper.classList.add('is-hidden');

        const userSrc = state.userPhotos[i] || PhotoboothCamera.generatePlaceholder(i, `Pose ${i + 1}`);
        if (userImg) {
          userImg.loading = 'eager';
          userImg.decoding = 'sync';
          if (userImg.getAttribute('src') !== userSrc) {
            userImg.src = userSrc;
          }
        }
      }
    }
  }

  function highlightActiveSlotTile() {
    document.querySelectorAll('.slot-tile').forEach((tile, idx) => {
      if (idx === state.activeSlotIndex) {
        tile.style.borderColor = 'var(--accent-berry-red)';
        tile.style.background = '#FFEBF0';
      } else {
        tile.style.borderColor = 'var(--border-subtle)';
        tile.style.background = 'var(--bg-surface-tint)';
      }
    });
  }
  highlightActiveSlotTile();

  // Individual Slot Retakes & File Uploads
  document.querySelectorAll('.slot-tile').forEach((tile, index) => {
    const retakeBtn = tile.querySelector('.btn-retake-slot');
    const uploadInput = tile.querySelector('.slot-file-input');

    retakeBtn.addEventListener('click', async () => {
      if (!state.isCameraActive) {
        showToast("Camera is resting • Turn camera on to retake this shot!");
        if (btnTurnCamOn) btnTurnCamOn.focus();
        return;
      }
      state.activeSlotIndex = index;
      highlightActiveSlotTile();
      await captureSingleSlot(index);
    });

    uploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const uploadRes = await PhotoboothCamera.processUploadedImage(file, 960, 720);
        const photoUrl = (uploadRes && uploadRes.url) ? uploadRes.url : uploadRes;
        const photoImg = (uploadRes && uploadRes.img) ? uploadRes.img : null;

        if (state.mode === 'together' || state.mode === 'room') {
          if (!state.userPhotos[index]) {
            state.userPhotos[index] = photoUrl;
            state.decodedUserPhotos[index] = photoImg;
            showToast(`Saved photo to Slot ${index + 1} for you!`);
          } else if (!state.togetherPhotos[index]) {
            state.togetherPhotos[index] = photoUrl;
            state.decodedTogetherPhotos[index] = photoImg;
            showToast(`Saved photo to Slot ${index + 1} for partner!`);
          } else {
            state.userPhotos[index] = photoUrl;
            state.decodedUserPhotos[index] = photoImg;
            showToast(`Updated Slot ${index + 1}!`);
          }
        } else {
          state.userPhotos[index] = photoUrl;
          state.decodedUserPhotos[index] = photoImg;
          showToast(`Saved photo to Slot ${index + 1}!`);
        }
        updateStripDOM();
        saveStripStateToSession();
        syncStripToPartner();
      } catch (err) {
        showToast(err.message || 'Failed to upload photo');
      }
      uploadInput.value = '';
    });
  });

  // Countdown & Shutter Helper
  async function runCountdown(seconds) {
    countdownEl.classList.remove('is-hidden');
    for (let c = seconds; c > 0; c--) {
      countdownEl.textContent = c;
      window.photoboothAudio.playCountdownTick(c);
      await new Promise(r => setTimeout(r, 1000));
    }
    countdownEl.classList.add('is-hidden');

    flashEl.classList.add('is-flashing');
    window.photoboothAudio.playShutter();
    setTimeout(() => {
      flashEl.classList.remove('is-flashing');
    }, 120);
  }

  // Capture Single Slot
  async function captureSingleSlot(slotIndex) {
    await runCountdown(state.timerDuration);

    if (state.mode === 'room' && room.isConnected && remoteWebcamEl.videoWidth) {
      // High-res captures (960x720)
      const userRes = await camera.captureFrameBlob(960, 720);
      const partnerRes = await PhotoboothCamera.captureExternalVideoBlob(
        remoteWebcamEl,
        960,
        720,
        state.remoteTransform
      );
      state.userPhotos[slotIndex] = userRes.url || userRes.dataUrl;
      state.decodedUserPhotos[slotIndex] = userRes.img;
      state.togetherPhotos[slotIndex] = partnerRes.url || partnerRes.dataUrl;
      state.decodedTogetherPhotos[slotIndex] = partnerRes.img;

      // Broadcast photo to partner client
      room.broadcastSlotPhoto({
        slotIndex,
        role: room.isHost ? 'host' : 'guest',
        dataUrl: userRes.dataUrl
      });
    } else {
      if (camera.isStreaming) {
        const userRes = await camera.captureFrameBlob(960, 720);
        state.userPhotos[slotIndex] = userRes.url || userRes.dataUrl;
        state.decodedUserPhotos[slotIndex] = userRes.img;
      } else {
        const frameData = PhotoboothCamera.generatePlaceholder(slotIndex, `Captured Pose ${slotIndex + 1}`);
        state.userPhotos[slotIndex] = frameData;
        state.decodedUserPhotos[slotIndex] = null;
      }
    }

    updateStripDOM();
    saveStripStateToSession();
    syncStripToPartner();
  }

  // Sequential 4-Shot Session
  async function runSynchronizedSession(duration = state.timerDuration) {
    if (state.isCapturingSession) return;
    state.isCapturingSession = true;
    btnStartSession.disabled = true;

    for (let i = 0; i < 4; i++) {
      state.activeSlotIndex = i;
      highlightActiveSlotTile();
      shutterBtnText.textContent = `Taking shot ${i + 1} of 4...`;
      await captureSingleSlot(i);

      if (i < 3) {
        shutterBtnText.textContent = `Get ready for shot ${i + 2}!`;
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    shutterBtnText.textContent = state.mode === 'room' ? 'Take Our Photos Together' : 'Take 4 Sequential Shots';
    state.isCapturingSession = false;
    btnStartSession.disabled = false;

    // Smoothly advance to decoration phase after shooting
    setTimeout(() => {
      showToast('All 4 shots taken! Now style your strip.');
      setWorkflowPhase('decorate');
    }, 700);
  }

  btnStartSession.addEventListener('click', () => {
    if (!state.isCameraActive) {
      showToast("Camera is resting • Turn camera on or use Upload below!");
      if (btnTurnCamOn) btnTurnCamOn.focus();
      return;
    }
    if (state.mode === 'room' && room.isConnected) {
      room.broadcastCountdown(state.timerDuration);
    }
    runSynchronizedSession(state.timerDuration);
  });

  // 8 Border Frame Styles
  function applyFrameStyle(frame, broadcast = true) {
    state.frameStyle = frame;
    document.querySelectorAll('.frame-choice').forEach((b) => {
      b.classList.toggle('is-selected', b.dataset.frame === frame);
    });

    stripEl.className = `photobooth-strip frame-${frame}`;
    saveStripStateToSession();

    if (broadcast && state.mode === 'room' && room.isConnected) {
      room.broadcastCustomization({ frameStyle: frame });
      broadcastDecorationSync(true);
    }
  }

  document.querySelectorAll('.frame-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyFrameStyle(btn.dataset.frame, true);
    });
  });

  // Romantic Caption Pills
  document.querySelectorAll('.caption-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const text = pill.dataset.text;
      captionInput.value = text;
      stripFooterCaption.textContent = text;
      saveStripStateToSession();
      if (state.mode === 'room' && room.isConnected) {
        room.broadcastCustomization({ caption: text });
        broadcastDecorationSync(true);
      }
    });
  });

  captionInput.addEventListener('input', (e) => {
    const val = e.target.value.trim() || 'mohar & gungun forever';
    stripFooterCaption.textContent = val;
    saveStripStateToSession();
    if (state.mode === 'room' && room.isConnected) {
      room.broadcastCustomization({ caption: val });
      broadcastDecorationSync(false);
    }
  });

  dateInput.addEventListener('input', (e) => {
    const val = e.target.value.trim() || defaultDateStr;
    stripFooterDate.textContent = `• ${val} •`;
    saveStripStateToSession();
    broadcastDecorationSync(false);
  });

  // Typography Switcher
  function applyFontFamily(font, broadcast = true) {
    state.fontFamily = font;
    document.querySelectorAll('.font-choice').forEach(b => {
      b.classList.toggle('is-selected', b.dataset.font === font);
    });
    stripFooterCaption.style.fontFamily = `"${font}", cursive, sans-serif`;
    captionInput.style.fontFamily = `"${font}", cursive, sans-serif`;
    saveStripStateToSession();

    if (broadcast && state.mode === 'room' && room.isConnected) {
      room.broadcastCustomization({ fontFamily: font });
      broadcastDecorationSync(true);
    }
  }

  document.querySelectorAll('.font-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyFontFamily(btn.dataset.font, true);
    });
  });

  // Ink Color Switcher
  function applyInkColor(ink, broadcast = true) {
    state.inkColor = ink;
    document.querySelectorAll('.ink-choice').forEach(b => {
      b.classList.toggle('is-selected', b.dataset.ink === ink);
    });
    stripFooterCaption.style.color = ink;
    saveStripStateToSession();

    if (broadcast && state.mode === 'room' && room.isConnected) {
      room.broadcastCustomization({ inkColor: ink });
      broadcastDecorationSync(true);
    }
  }

  document.querySelectorAll('.ink-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyInkColor(btn.dataset.ink, true);
    });
  });

  window.addEventListener('resize', () => {
    stickers.recalculateLayout();
  });

  // Print Photobooth Strip Workflow
  let currentExportResult = null;

  async function triggerPrintWorkflow(broadcast = false) {
    if (broadcast && state.mode === 'room' && room.isConnected) {
      room.broadcastTriggerPrint();
    }

    window.photoboothAudio.playDispense();

    stripEl.classList.remove('strip-slide-dispense');
    void stripEl.offsetWidth;
    stripEl.classList.add('strip-slide-dispense');

    const photosToRender = (state.decodedUserPhotos && state.decodedUserPhotos.some(Boolean))
      ? state.decodedUserPhotos.map((img, idx) => img || state.userPhotos[idx])
      : state.userPhotos;

    const togetherPhotosToRender = (state.decodedTogetherPhotos && state.decodedTogetherPhotos.some(Boolean))
      ? state.decodedTogetherPhotos.map((img, idx) => img || state.togetherPhotos[idx])
      : state.togetherPhotos;

    const exportResult = await exporter.renderStrip({
      photos: photosToRender,
      mode: (state.mode === 'together' || state.mode === 'room') ? 'together' : 'solo',
      togetherPhotos: togetherPhotosToRender,
      frameStyle: state.frameStyle,
      stickers: stickers.stickers,
      caption: captionInput.value.trim() || 'mohar & gungun forever',
      fontFamily: state.fontFamily,
      inkColor: state.inkColor,
      dateText: dateInput.value.trim() || defaultDateStr,
      domStripRect: stripEl.getBoundingClientRect()
    });

    currentExportResult = exportResult;

    if (exportCanvas) {
      exportCanvas.width = exportResult.canvas.width;
      exportCanvas.height = exportResult.canvas.height;
      const ctx = exportCanvas.getContext('2d');
      ctx.drawImage(exportResult.canvas, 0, 0);
    }

    if (exportStripImg) {
      exportStripImg.src = exportResult.blobUrl;
    }

    if (linkDownloadPng) {
      linkDownloadPng.href = exportResult.blobUrl;
      linkDownloadPng.download = exportResult.filename;
      linkDownloadPng.classList.remove('is-hidden');
    }

    setTimeout(() => {
      exportModal.classList.remove('is-hidden');
    }, 700);
  }

  btnPrintStrip.addEventListener('click', () => {
    triggerPrintWorkflow(true);
  });

  btnCloseExport.addEventListener('click', () => {
    exportModal.classList.add('is-hidden');
  });

  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.classList.add('is-hidden');
    }
  });

  btnDownloadPng.addEventListener('click', async () => {
    if (currentExportResult) {
      await exporter.shareOrDownload(currentExportResult);
    } else {
      await exporter.shareOrDownload(exportCanvas, 'couples-photobooth-strip.png');
    }
  });

  btnShareStrip.addEventListener('click', async () => {
    if (currentExportResult) {
      await exporter.shareOrDownload(currentExportResult);
    } else {
      await exporter.shareOrDownload(exportCanvas, 'couples-photobooth-strip.png');
    }
  });
});
