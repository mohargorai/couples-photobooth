/**
 * Advanced Camera Hardware, Device Enumeration & Multi-Axis Orientation Manager
 * Handles device selection, horizontal mirror, vertical flip, 90-degree step rotation,
 * and exact mathematical Canvas matrix synchronization.
 */

class PhotoboothCamera {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.currentDeviceId = null;
    this.currentFacingMode = 'user'; // 'user' or 'environment'
    this.isStreaming = false;

    // Orientation & Zoom state
    this.mirrorH = true;   // Horizontal flip (scaleX(-1))
    this.flipV = false;    // Vertical flip (scaleY(-1))
    this.rotation = 0;     // 0, 90, 180, 270 degrees
    this.zoom = 1.0;       // 0.6x to 1.5x zoom
    this.fitMode = 'cover'; // 'cover' (fill) or 'contain' (wide uncropped)

    // Available devices list
    this.videoDevices = [];

    // Change listener
    this.onTransformChange = null;
    this.onDevicesUpdated = null;
  }

  /**
   * Enumerate connected video input devices
   */
  async enumerateVideoDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.videoDevices = devices.filter(d => d.kind === 'videoinput');

      // Auto-label fallback if permission not yet granted
      this.videoDevices = this.videoDevices.map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${idx + 1} (${d.deviceId ? d.deviceId.slice(0, 6) : 'Default'})`
      }));

      if (this.onDevicesUpdated) {
        this.onDevicesUpdated(this.videoDevices);
      }
      return this.videoDevices;
    } catch (err) {
      console.warn('Could not enumerate video devices:', err);
      return [];
    }
  }

  /**
   * Start or restart camera stream
   */
  async startCamera(options = {}) {
    this.stopCamera();

    if (options.deviceId) {
      this.currentDeviceId = options.deviceId;
    }
    if (options.facingMode) {
      this.currentFacingMode = options.facingMode;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Webcam API is not supported in this browser.');
    }

    // Ultra-low-latency real-time video constraints (avoids 1080p buffer bloat over WebRTC)
    const videoConstraints = {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 30, max: 30 }
    };

    if (this.currentDeviceId) {
      videoConstraints.deviceId = { exact: this.currentDeviceId };
    } else {
      videoConstraints.facingMode = { ideal: this.currentFacingMode };
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      } catch (deviceErr) {
        if (this.currentDeviceId) {
          console.warn('Exact deviceId request failed, falling back to default camera:', deviceErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: { ideal: this.currentFacingMode }
            },
            audio: false
          });
        } else {
          throw deviceErr;
        }
      }

      this.stream = stream;
      this.video.srcObject = stream;
      this.video.setAttribute('playsinline', 'true');
      this.video.setAttribute('autoplay', 'true');
      this.video.setAttribute('muted', 'true');

      await new Promise((resolve) => {
        if (this.video.readyState >= 2) {
          resolve();
        } else {
          this.video.onloadedmetadata = () => resolve();
        }
      });

      await this.video.play().catch(() => {});
      this.isStreaming = true;

      // Update orientation styling
      this.applyViewfinderTransform();

      // Refresh device labels now that permission has been granted
      await this.enumerateVideoDevices();

      return stream;
    } catch (err) {
      this.isStreaming = false;
      throw err;
    }
  }

  /**
   * Switch to a specific camera device ID
   */
  async selectDevice(deviceId) {
    return this.startCamera({ deviceId });
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getVideoTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.isStreaming = false;
  }

  // --- Orientation & Transform Controls ---

  toggleMirrorH() {
    this.mirrorH = !this.mirrorH;
    this.applyViewfinderTransform();
    if (this.onTransformChange) this.onTransformChange(this.getTransformState());
  }

  toggleFlipV() {
    this.flipV = !this.flipV;
    this.applyViewfinderTransform();
    if (this.onTransformChange) this.onTransformChange(this.getTransformState());
  }

  stepRotate() {
    this.rotation = (this.rotation + 90) % 360;
    this.applyViewfinderTransform();
    if (this.onTransformChange) this.onTransformChange(this.getTransformState());
  }

  setZoom(level) {
    this.zoom = Math.max(0.5, Math.min(2.0, parseFloat(level) || 1.0));
    this.applyViewfinderTransform();
    if (this.onTransformChange) this.onTransformChange(this.getTransformState());
  }

  toggleFitMode() {
    this.fitMode = this.fitMode === 'cover' ? 'contain' : 'cover';
    if (this.video) {
      this.video.style.objectFit = this.fitMode;
    }
    if (this.onTransformChange) this.onTransformChange(this.getTransformState());
    return this.fitMode;
  }

  setTransformState({ mirrorH, flipV, rotation, zoom, fitMode }) {
    if (typeof mirrorH === 'boolean') this.mirrorH = mirrorH;
    if (typeof flipV === 'boolean') this.flipV = flipV;
    if (typeof rotation === 'number') this.rotation = rotation % 360;
    if (typeof zoom === 'number') this.zoom = zoom;
    if (fitMode) {
      this.fitMode = fitMode;
      if (this.video) this.video.style.objectFit = fitMode;
    }
    this.applyViewfinderTransform();
  }

  getTransformState() {
    return {
      mirrorH: this.mirrorH,
      flipV: this.flipV,
      rotation: this.rotation,
      zoom: this.zoom,
      fitMode: this.fitMode
    };
  }

  /**
   * Apply CSS transform to live video viewfinder
   */
  applyViewfinderTransform(targetVideo = this.video, state = this) {
    if (!targetVideo) return;
    const zoom = state.zoom || 1.0;
    const scaleX = (state.mirrorH ? -1 : 1) * zoom;
    const scaleY = (state.flipV ? -1 : 1) * zoom;
    targetVideo.style.transform = `rotate(${state.rotation}deg) scale(${scaleX}, ${scaleY})`;
    if (state.fitMode) {
      targetVideo.style.objectFit = state.fitMode;
    }
  }

  /**
   * Mathematical center-crop calculation (object-fit: cover equivalent)
   */
  static calculateCrop(srcW, srcH, destW, destH) {
    if (!srcW || !srcH || !destW || !destH) {
      return { sx: 0, sy: 0, sWidth: srcW || 1, sHeight: srcH || 1, dx: 0, dy: 0, dWidth: destW || 1, dHeight: destH || 1 };
    }
    const srcAspect = srcW / srcH;
    const destAspect = destW / destH;
    let sx = 0;
    let sy = 0;
    let sWidth = srcW;
    let sHeight = srcH;

    if (srcAspect > destAspect) {
      sHeight = srcH;
      sWidth = srcH * destAspect;
      sx = (srcW - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = srcW;
      sHeight = srcW / destAspect;
      sx = 0;
      sy = (srcH - sHeight) / 2;
    }

    return {
      sx,
      sy,
      sWidth,
      sHeight,
      dx: 0,
      dy: 0,
      dWidth: destW,
      dHeight: destH
    };
  }

  /**
   * Draw video or image onto a target Canvas context with 100% orientation & crop synchronization
   */
  static drawTransformedImage(ctx, source, dx, dy, destW, destH, transformState = {}) {
    const srcW = source.videoWidth || source.naturalWidth || source.width;
    const srcH = source.videoHeight || source.naturalHeight || source.height;
    if (!srcW || !srcH) return;

    const rotation = transformState.rotation || 0;
    const mirrorH = !!transformState.mirrorH;
    const flipV = !!transformState.flipV;
    const zoom = transformState.zoom || 1.0;

    ctx.save();
    // Move to center of destination slot
    ctx.translate(dx + destW / 2, dy + destH / 2);
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    // Apply scaling (mirror, flip, and zoom)
    const scaleX = (mirrorH ? -1 : 1) * zoom;
    const scaleY = (flipV ? -1 : 1) * zoom;
    ctx.scale(scaleX, scaleY);

    if (rotation === 90 || rotation === 270) {
      // Rotated sideways: effective aspect ratio in destination is inverted
      const crop = PhotoboothCamera.calculateCrop(srcW, srcH, destH, destW);
      ctx.drawImage(
        source,
        crop.sx, crop.sy, crop.sWidth, crop.sHeight,
        -destH / 2, -destW / 2, destH, destW
      );
    } else {
      // 0 or 180 degrees
      const crop = PhotoboothCamera.calculateCrop(srcW, srcH, destW, destH);
      ctx.drawImage(
        source,
        crop.sx, crop.sy, crop.sWidth, crop.sHeight,
        -destW / 2, -destH / 2, destW, destH
      );
    }

    ctx.restore();
  }

  /**
   * Capture a single frame from video into a high-res JPEG dataURL
   */
  captureFrame(targetWidth = 960, targetHeight = 720, customTransform = null) {
    if (!this.isStreaming || !this.video.videoWidth) {
      throw new Error('Camera stream is not active');
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const transform = customTransform || this.getTransformState();
    PhotoboothCamera.drawTransformedImage(ctx, this.video, 0, 0, targetWidth, targetHeight, transform);

    return canvas.toDataURL('image/jpeg', 0.95);
  }

  /**
   * Capture a single frame from video into a high-res Blob and Object URL (Zero-Flicker Pre-decoded)
   */
  async captureFrameBlob(targetWidth = 960, targetHeight = 720, customTransform = null) {
    if (!this.isStreaming || !this.video.videoWidth) {
      throw new Error('Camera stream is not active');
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const transform = customTransform || this.getTransformState();
    PhotoboothCamera.drawTransformedImage(ctx, this.video, 0, 0, targetWidth, targetHeight, transform);

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        if (!blob) {
          return resolve({ url: dataUrl, blob: null, img: null, dataUrl });
        }
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        try {
          await img.decode();
        } catch (e) {}
        resolve({ url, blob, img, dataUrl });
      }, 'image/jpeg', 0.95);
    });
  }

  /**
   * Capture from any external HTML5 video element (e.g. Remote Partner Video)
   */
  static captureExternalVideo(videoEl, targetWidth = 960, targetHeight = 720, transform = {}) {
    if (!videoEl || !videoEl.videoWidth) {
      throw new Error('Video element not active');
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    PhotoboothCamera.drawTransformedImage(ctx, videoEl, 0, 0, targetWidth, targetHeight, transform);
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  /**
   * Capture from external video into high-res Blob and Object URL
   */
  static async captureExternalVideoBlob(videoEl, targetWidth = 960, targetHeight = 720, transform = {}) {
    if (!videoEl || !videoEl.videoWidth) {
      throw new Error('Video element not active');
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    PhotoboothCamera.drawTransformedImage(ctx, videoEl, 0, 0, targetWidth, targetHeight, transform);

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        if (!blob) {
          return resolve({ url: dataUrl, blob: null, img: null, dataUrl });
        }
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        try {
          await img.decode();
        } catch (e) {}
        resolve({ url, blob, img, dataUrl });
      }, 'image/jpeg', 0.95);
    });
  }

  /**
   * Process a gallery-uploaded image file
   */
  static processUploadedImage(file, targetWidth = 960, targetHeight = 720) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Please select an image file.'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const crop = PhotoboothCamera.calculateCrop(img.width, img.height, targetWidth, targetHeight);
          ctx.drawImage(img, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(async (blob) => {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            if (!blob) {
              return resolve({ url: dataUrl, blob: null, img, dataUrl });
            }
            const url = URL.createObjectURL(blob);
            const decodedImg = new Image();
            decodedImg.src = url;
            try {
              await decodedImg.decode();
            } catch (err) {}
            resolve({ url, blob, img: decodedImg, dataUrl });
          }, 'image/jpeg', 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate sweet illustrated placeholder poses
   */
  static generatePlaceholder(slotIndex = 0, label = 'Pose', isPartner = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createLinearGradient(0, 0, 600, 450);
    if (isPartner) {
      bgGradient.addColorStop(0, '#FFE8ED');
      bgGradient.addColorStop(1, '#FFD1DC');
    } else {
      bgGradient.addColorStop(0, '#FFF2F5');
      bgGradient.addColorStop(1, '#FFEBF0');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 600, 450);

    ctx.strokeStyle = '#E2B8BF';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(16, 16, 568, 418);
    ctx.setLineDash([]);

    ctx.strokeStyle = '#5A3E42';
    ctx.fillStyle = '#D85A67';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = 300;
    const cy = 200;

    ctx.beginPath();
    ctx.moveTo(cx, cy + 25);
    ctx.bezierCurveTo(cx - 35, cy - 20, cx - 70, cy + 10, cx, cy + 65);
    ctx.bezierCurveTo(cx + 70, cy + 10, cx + 35, cy - 20, cx, cy + 25);
    ctx.fillStyle = 'rgba(216, 90, 103, 0.25)';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    const cx2 = cx + 45;
    const cy2 = cy - 25;
    ctx.moveTo(cx2, cy2 + 10);
    ctx.bezierCurveTo(cx2 - 15, cy2 - 10, cx2 - 30, cy2 + 5, cx2, cy2 + 30);
    ctx.bezierCurveTo(cx2 + 30, cy2 + 5, cx2 + 15, cy2 - 10, cx2, cy2 + 10);
    ctx.fillStyle = '#FFD1DC';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5A3E42';
    ctx.font = '30px Caveat, cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 300, 310);

    ctx.font = '16px Nunito, sans-serif';
    ctx.fillStyle = '#8A686D';
    const sub = isPartner ? 'Partner Frame' : `Shot ${slotIndex + 1} of 4`;
    ctx.fillText(sub, 300, 350);

    return canvas.toDataURL('image/jpeg', 0.92);
  }

  /**
   * Generate romantic illustrated sample photos for the strip
   */
  static generateSamplePhoto(slotIndex = 0, isPartner = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Soft watercolor pastel background gradients
    const gradients = [
      ['#FFF5F7', '#FFDCE4'], // Cut 0: Peach Blush
      ['#FFF8F2', '#FFE5DC'], // Cut 1: Warm Rose Peach
      ['#FFF2F8', '#FFDBEB'], // Cut 2: Dainty Floral Pink
      ['#FFF5EE', '#FFE3E6']  // Cut 3: Cozy Cream Rose
    ];
    const gradPair = gradients[slotIndex % 4];
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 450);
    bgGrad.addColorStop(0, gradPair[0]);
    bgGrad.addColorStop(1, gradPair[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 450);

    // Decorative sketchy inner frame
    ctx.strokeStyle = '#E8BDC5';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(18, 18, 564, 414);
    ctx.setLineDash([]);

    // Corner coquette loops
    ctx.strokeStyle = '#D85A67';
    ctx.lineWidth = 2;
    [
      [36, 36], [564, 36], [36, 414], [564, 414]
    ].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.stroke();
    });

    const cx = 300;
    const cy = 180;

    // Draw Pose-specific Hand-drawn Illustration
    ctx.strokeStyle = '#5A3E42';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (slotIndex === 0) {
      // Cut 1: Cheek Heart Pose
      ctx.fillStyle = '#FFFDFE';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, 75, 85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Soft rosy blush
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
      ctx.beginPath();
      ctx.ellipse(cx - 45, cy + 20, 16, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 45, cy + 20, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Smiling curved eyes
      ctx.beginPath();
      ctx.arc(cx - 30, cy, 14, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 30, cy, 14, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Sweet smile
      ctx.beginPath();
      ctx.arc(cx, cy + 26, 12, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Cheek Heart Hand (curving on cheek)
      ctx.fillStyle = '#FFD1DC';
      ctx.beginPath();
      ctx.moveTo(cx + 65, cy + 10);
      ctx.bezierCurveTo(cx + 90, cy - 20, cx + 120, cy + 10, cx + 75, cy + 50);
      ctx.bezierCurveTo(cx + 65, cy + 35, cx + 55, cy + 25, cx + 65, cy + 10);
      ctx.fill();
      ctx.stroke();

      // Dainty coquette bow on head
      ctx.fillStyle = '#D85A67';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 75, 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 20, cy - 75, 14, 8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 20, cy - 75, 14, 8, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFB6C1';
      ctx.fill();
      ctx.stroke();
    } else if (slotIndex === 1) {
      // Cut 2: Wink & Peace Pose
      ctx.fillStyle = '#FFFDFE';
      ctx.beginPath();
      ctx.ellipse(cx - 10, cy + 10, 75, 85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blush
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
      ctx.beginPath();
      ctx.ellipse(cx - 55, cy + 20, 16, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 35, cy + 20, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Left eye winking (straight bar with lashes)
      ctx.beginPath();
      ctx.moveTo(cx - 45, cy);
      ctx.lineTo(cx - 15, cy);
      ctx.stroke();
      // Right eye open happy dot
      ctx.fillStyle = '#5A3E42';
      ctx.beginPath();
      ctx.arc(cx + 20, cy - 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // Open smile
      ctx.beginPath();
      ctx.arc(cx - 10, cy + 26, 15, 0.1, Math.PI - 0.1);
      ctx.stroke();

      // V-sign Peace fingers
      ctx.fillStyle = '#FFD1DC';
      ctx.beginPath();
      ctx.ellipse(cx + 70, cy + 30, 20, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 65, cy + 15);
      ctx.lineTo(cx + 60, cy - 40);
      ctx.moveTo(cx + 78, cy + 18);
      ctx.lineTo(cx + 88, cy - 35);
      ctx.stroke();
    } else if (slotIndex === 2) {
      // Cut 3: Flower Blossom (cupping chin)
      ctx.fillStyle = '#FFFDFE';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blush
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
      ctx.beginPath();
      ctx.ellipse(cx - 40, cy + 12, 15, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 40, cy + 12, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Happy curved eyes
      ctx.beginPath();
      ctx.arc(cx - 26, cy - 8, 12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 26, cy - 8, 12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Smile
      ctx.beginPath();
      ctx.arc(cx, cy + 16, 11, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Cupping flower hands
      ctx.fillStyle = '#FFD1DC';
      ctx.beginPath();
      ctx.moveTo(cx - 65, cy + 35);
      ctx.bezierCurveTo(cx - 85, cy + 5, cx - 45, cy + 55, cx - 20, cy + 70);
      ctx.bezierCurveTo(cx, cy + 75, cx + 20, cy + 70, cx + 45, cy + 55);
      ctx.bezierCurveTo(cx + 85, cy + 5, cx + 65, cy + 35, cx + 40, cy + 65);
      ctx.bezierCurveTo(cx + 20, cy + 85, cx - 20, cy + 85, cx - 40, cy + 65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Cut 4: You & Me Always (Cozy Lean)
      ctx.fillStyle = '#FFFDFE';
      ctx.beginPath();
      ctx.ellipse(cx - 45, cy + 10, 60, 70, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx + 45, cy + 10, 60, 70, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blushes
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
      ctx.beginPath();
      ctx.ellipse(cx - 75, cy + 20, 12, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 75, cy + 20, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Smiling curved eyes
      ctx.beginPath();
      ctx.arc(cx - 50, cy + 2, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 50, cy + 2, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Smiles
      ctx.beginPath();
      ctx.arc(cx - 45, cy + 24, 9, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 45, cy + 24, 9, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Entwined sweet twin hearts above
      ctx.fillStyle = '#D85A67';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 50);
      ctx.bezierCurveTo(cx - 20, cy - 75, cx - 35, cy - 50, cx, cy - 25);
      ctx.bezierCurveTo(cx + 35, cy - 50, cx + 20, cy - 75, cx, cy - 50);
      ctx.fill();
      ctx.stroke();
    }

    // Floating sparkles around
    const sparkles = [[100, 90], [500, 100], [120, 310], [480, 290]];
    ctx.strokeStyle = '#D85A67';
    ctx.lineWidth = 1.8;
    sparkles.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx, sy + 8);
      ctx.moveTo(sx - 8, sy);
      ctx.lineTo(sx + 8, sy);
      ctx.stroke();
    });

    // Handwritten Pose Titles & Personalized Subtitles
    const titles = [
      'Shot 1: Cheek Heart',
      'Shot 2: Wink & Peace',
      'Shot 3: Flower Blossom',
      'Shot 4: You & Me Always'
    ];
    ctx.fillStyle = '#5A3E42';
    ctx.font = '32px Caveat, cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titles[slotIndex % 4], 300, 345);

    ctx.font = '17px Nunito, sans-serif';
    ctx.fillStyle = '#8A686D';
    const subText = isPartner ? 'Gungun (Partner Frame)' : 'Mohar & Gungun <3';
    ctx.fillText(subText, 300, 385);

    return canvas.toDataURL('image/jpeg', 0.94);
  }
}

window.PhotoboothCamera = PhotoboothCamera;
