/**
 * High-Resolution HTML5 Canvas Photobooth Strip Exporter
 * Renders 8 Handcrafted Border Styles, Duo Split Frames with Transforms,
 * 16 SVG Stickers, Typography & Ink Switchers, and Mobile Web Share API.
 */

class PhotoboothExporter {
  constructor() {
    this.svgImageCache = new Map();
  }

  async loadSvgImage(svgString) {
    if (this.svgImageCache.has(svgString)) {
      return this.svgImageCache.get(svgString);
    }

    return new Promise((resolve, reject) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        this.svgImageCache.set(svgString, img);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG into image'));
      };
      img.src = url;
    });
  }

  /**
   * Render the complete photobooth strip to high-DPI canvas
   */
  async renderStrip({
    photos,             // Array of 4 user photo dataURLs or blob URLs
    mode,               // 'solo' or 'together'
    togetherPhotos,     // Array of 4 partner photo dataURLs or blob URLs
    frameStyle = 'classic',
    stickers = [],
    caption = 'you & me always',
    fontFamily = 'Caveat',
    inkColor = '#5A3E42',
    dateText = '',
    domStripRect = null
  }) {
    // 1. Single Source of Truth Geometry: Canonical 800 x 2200, exported at 2x Retina 1600 x 4400
    const CANONICAL_W = 800;
    const CANONICAL_H = 2200;
    const RETINA_SCALE = 2;

    const canvas = document.createElement('canvas');
    canvas.width = CANONICAL_W * RETINA_SCALE;   // 1600
    canvas.height = CANONICAL_H * RETINA_SCALE; // 4400
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Scale drawing context to Retina resolution so all drawing uses 800 x 2200 coordinates
    ctx.scale(RETINA_SCALE, RETINA_SCALE);

    const W = CANONICAL_W;
    const H = CANONICAL_H;

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // 1. Draw One of 8 Border Frame Designs
    this.drawFrameBackground(ctx, W, H, frameStyle);

    // 2. Strict Mathematical Geometry for 4 Photo Slots
    // W=800, marginSide=48, slotW=704 (48 + 704 + 48 = 800)
    // H=2200, marginTop=56, slotH=440, gap=28 -> 4*440 + 3*28 + 56 = 1900, footer=300
    const marginSide = 48;
    const marginTop = 56;
    const slotGap = 28;
    const slotW = 704;
    const slotH = 440;
    const photoRadius = 14;

    // 3. Draw Photos
    for (let i = 0; i < 4; i++) {
      const slotY = marginTop + i * (slotH + slotGap);

      if (mode === 'together') {
        const gap = 14;
        const halfW = (slotW - gap) / 2; // 345

        // User Photo (Left)
        const userImgData = photos && photos[i];
        if (userImgData) {
          const userImg = await this.loadImage(userImgData);
          this.drawRoundedImage(ctx, userImg, marginSide, slotY, halfW, slotH, photoRadius);
        } else {
          this.drawSlotEmptyState(ctx, marginSide, slotY, halfW, slotH, photoRadius, `Pose ${i + 1}`);
        }

        // Partner Photo (Right)
        const partnerImgData = togetherPhotos && togetherPhotos[i];
        if (partnerImgData) {
          const partnerImg = await this.loadImage(partnerImgData);
          this.drawRoundedImage(ctx, partnerImg, marginSide + halfW + gap, slotY, halfW, slotH, photoRadius);
        } else {
          this.drawSlotEmptyState(ctx, marginSide + halfW + gap, slotY, halfW, slotH, photoRadius, 'Partner');
        }

        // Center seam (at exact x=400)
        ctx.save();
        ctx.strokeStyle = '#E8BDC4';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        const seamX = marginSide + halfW + gap / 2;
        ctx.beginPath();
        ctx.moveTo(seamX, slotY + 10);
        ctx.lineTo(seamX, slotY + slotH - 10);
        ctx.stroke();
        ctx.restore();

      } else {
        // Classic Solo Full Slot
        const imgData = photos && photos[i];
        if (imgData) {
          const img = await this.loadImage(imgData);
          this.drawRoundedImage(ctx, img, marginSide, slotY, slotW, slotH, photoRadius);
        } else {
          this.drawSlotEmptyState(ctx, marginSide, slotY, slotW, slotH, photoRadius, `Pose ${i + 1}`);
        }
      }

      // Slot border line
      ctx.save();
      ctx.strokeStyle = frameStyle === 'film' ? '#FFF5F8' : '#D9AAB3';
      ctx.lineWidth = 2.5;
      this.roundedRectPath(ctx, marginSide, slotY, slotW, slotH, photoRadius);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Footer (Typography & Ink)
    const footerY = 1900;
    this.drawFooter(ctx, W, H, footerY, caption, dateText, fontFamily, inkColor, frameStyle);

    // 5. Draw Stickers with 1:1 DOM scale and rotation mapping
    if (stickers && stickers.length > 0) {
      const domW = domStripRect ? domStripRect.width : 340;
      const scaleFactor = W / domW;

      for (const sticker of stickers) {
        try {
          const img = await this.loadSvgImage(sticker.svg);
          const stickerScale = sticker.scale || 1;
          const stickerCanvasW = sticker.width * scaleFactor * stickerScale;
          const stickerCanvasH = sticker.height * scaleFactor * stickerScale;

          const stickerCanvasX = (sticker.xPercent * W) + (stickerCanvasW / 2);
          const stickerCanvasY = (sticker.yPercent * H) + (stickerCanvasH / 2);

          ctx.save();
          ctx.translate(stickerCanvasX, stickerCanvasY);
          ctx.rotate(((sticker.rotation || 0) * Math.PI) / 180);
          ctx.drawImage(
            img,
            -stickerCanvasW / 2,
            -stickerCanvasH / 2,
            stickerCanvasW,
            stickerCanvasH
          );
          ctx.restore();
        } catch (e) {
          console.warn('Could not draw sticker on canvas', sticker.name, e);
        }
      }
    }

    // Convert to Blob, File, and Object URL
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    const blobUrl = blob ? URL.createObjectURL(blob) : '';
    const safeCaption = (caption || 'our-photobooth').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = `${safeCaption || 'couples'}-photobooth-strip.png`;
    const file = blob ? new File([blob], filename, { type: 'image/png' }) : null;

    return {
      canvas,
      blob,
      blobUrl,
      file,
      filename
    };
  }

  /**
   * Draw 8 Bespoke Border Frame Designs
   */
  drawFrameBackground(ctx, W, H, frameStyle) {
    switch (frameStyle) {
      case 'gingham':
        // 2. Baby Pink Gingham
        ctx.fillStyle = '#FFF5F8';
        ctx.fillRect(0, 0, W, H);
        const cellSize = 44;
        ctx.fillStyle = 'rgba(255, 209, 220, 0.55)';
        for (let y = 0; y < H; y += cellSize) {
          for (let x = 0; x < W; x += cellSize) {
            if ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0) {
              ctx.fillRect(x, y, cellSize, cellSize);
            }
          }
        }
        ctx.fillStyle = 'rgba(248, 187, 208, 0.4)';
        for (let y = 0; y < H; y += cellSize * 2) {
          ctx.fillRect(0, y, W, cellSize);
        }
        for (let x = 0; x < W; x += cellSize * 2) {
          ctx.fillRect(x, 0, cellSize, H);
        }
        ctx.strokeStyle = '#5A3E42';
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, W - 20, H - 20);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeRect(18, 18, W - 36, H - 36);
        break;

      case 'polkadot':
        // 3. Soft Berry Polka Dot
        ctx.fillStyle = '#FFFDFE';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFFFFF';
        this.roundedRectPath(ctx, 35, 35, W - 70, H - 70, 16);
        ctx.fill();

        ctx.fillStyle = '#D85A67';
        const dotSpacing = 48;
        // Border perimeter dots
        for (let x = 20; x < W; x += dotSpacing) {
          this.drawOrganicDot(ctx, x, 18, 5);
          this.drawOrganicDot(ctx, x, H - 18, 5);
        }
        for (let y = 20; y < H; y += dotSpacing) {
          this.drawOrganicDot(ctx, 18, y, 5);
          this.drawOrganicDot(ctx, W - 18, y, 5);
        }
        ctx.strokeStyle = '#5A3E42';
        ctx.lineWidth = 3;
        ctx.strokeRect(34, 34, W - 68, H - 68);
        break;

      case 'lace':
        // 4. Coquette Scalloped Lace
        ctx.fillStyle = '#FFF0F4';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFFFFF';
        this.roundedRectPath(ctx, 40, 40, W - 80, H - 80, 20);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E8BDC4';
        ctx.lineWidth = 2;
        const scallopR = 12;

        for (let x = 40; x < W - 40; x += scallopR * 2) {
          ctx.beginPath();
          ctx.arc(x + scallopR, 40, scallopR, Math.PI, 0);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x + scallopR, H - 40, scallopR, 0, Math.PI);
          ctx.fill();
          ctx.stroke();
        }
        for (let y = 40; y < H - 40; y += scallopR * 2) {
          ctx.beginPath();
          ctx.arc(40, y + scallopR, scallopR, Math.PI * 0.5, Math.PI * 1.5);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(W - 40, y + scallopR, scallopR, Math.PI * 1.5, Math.PI * 0.5);
          ctx.fill();
          ctx.stroke();
        }

        ctx.strokeStyle = '#5A3E42';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        this.roundedRectPath(ctx, 48, 48, W - 96, H - 96, 12);
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'ribbon':
        // 5. Satin Ribbon Weave
        ctx.fillStyle = '#FFF7FA';
        ctx.fillRect(0, 0, W, H);

        // Left & right woven ribbon strips
        ctx.fillStyle = '#FFD1DC';
        ctx.fillRect(10, 0, 26, H);
        ctx.fillRect(W - 36, 0, 26, H);

        ctx.strokeStyle = '#5A3E42';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 0, 26, H);
        ctx.strokeRect(W - 36, 0, 26, H);

        // Ribbon stitches
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(23, 0); ctx.lineTo(23, H);
        ctx.moveTo(W - 23, 0); ctx.lineTo(W - 23, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner frame
        ctx.strokeStyle = '#5A3E42';
        ctx.lineWidth = 2.5;
        this.roundedRectPath(ctx, 42, 20, W - 84, H - 40, 10);
        ctx.stroke();
        break;

      case 'airmail':
        // 6. Vintage Air-Mail Love Letter
        ctx.fillStyle = '#FFFDF8';
        ctx.fillRect(0, 0, W, H);

        // Diagonal alternating red & baby pink stripes border
        const stripeW = 20;
        const stripeH = 36;
        ctx.save();
        for (let i = -100; i < W + H; i += stripeW * 2) {
          ctx.fillStyle = '#D85A67';
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + stripeW, 0);
          ctx.lineTo(i - stripeH + stripeW, stripeH);
          ctx.lineTo(i - stripeH, stripeH);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#FFD1DC';
          ctx.beginPath();
          ctx.moveTo(i + stripeW, 0);
          ctx.lineTo(i + stripeW * 2, 0);
          ctx.lineTo(i - stripeH + stripeW * 2, stripeH);
          ctx.lineTo(i - stripeH + stripeW, stripeH);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Inner clean paper card
        ctx.fillStyle = '#FFFFFF';
        this.roundedRectPath(ctx, 24, 24, W - 48, H - 48, 8);
        ctx.fill();

        ctx.strokeStyle = '#5A3E42';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(24, 24, W - 48, H - 48);
        break;

      case 'watercolor':
        // 7. Blush Watercolor Wash
        const washGrad = ctx.createLinearGradient(0, 0, W, H);
        washGrad.addColorStop(0, '#FFF5F8');
        washGrad.addColorStop(0.3, '#FFE4EB');
        washGrad.addColorStop(0.7, '#FFD4DE');
        washGrad.addColorStop(1, '#FFF0F5');
        ctx.fillStyle = washGrad;
        ctx.fillRect(0, 0, W, H);

        // Soft cloud overlay
        const washRad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W);
        washRad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        washRad.addColorStop(0.8, 'rgba(255, 230, 238, 0.4)');
        washRad.addColorStop(1, 'rgba(216, 90, 103, 0.15)');
        ctx.fillStyle = washRad;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#D85A67';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        this.roundedRectPath(ctx, 22, 22, W - 44, H - 44, 16);
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'film':
        // 8. Warm Cocoa Film Strip
        ctx.fillStyle = '#5A3E42';
        ctx.fillRect(0, 0, W, H);

        // Sprocket holes down left and right
        ctx.fillStyle = '#FFF9FB';
        const sprockH = 24;
        const sprockW = 16;
        const sprockGap = 42;
        for (let y = 30; y < H - 30; y += sprockGap) {
          this.roundedRectPath(ctx, 16, y, sprockW, sprockH, 4);
          ctx.fill();
          this.roundedRectPath(ctx, W - 32, y, sprockW, sprockH, 4);
          ctx.fill();
        }

        // Inner warm cream panel
        ctx.fillStyle = '#FFF8FA';
        this.roundedRectPath(ctx, 46, 26, W - 92, H - 52, 10);
        ctx.fill();
        break;

      case 'classic':
      default:
        // 1. Milky Cream Classic
        ctx.fillStyle = '#FFFDFE';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#5A3E42';
        ctx.lineWidth = 3;
        this.roundedRectPath(ctx, 18, 18, W - 36, H - 36, 12);
        ctx.stroke();

        ctx.strokeStyle = '#FFD1DC';
        ctx.lineWidth = 2;
        this.roundedRectPath(ctx, 26, 26, W - 52, H - 52, 8);
        ctx.stroke();
        break;
    }
  }

  drawOrganicDot(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFooter(ctx, W, H, footerY, caption, dateText, fontFamily = 'Caveat', inkColor = '#5A3E42', frameStyle = 'classic') {
    const cx = W / 2;

    // Divider bar
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    const divW = 180;
    ctx.beginPath();
    ctx.moveTo(cx - divW, footerY + 30);
    ctx.bezierCurveTo(cx - divW * 0.5, footerY + 25, cx - divW * 0.2, footerY + 35, cx - 25, footerY + 30);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 25, footerY + 30);
    ctx.bezierCurveTo(cx + divW * 0.2, footerY + 35, cx + divW * 0.5, footerY + 25, cx + divW, footerY + 30);
    ctx.stroke();

    // Center White Rose on divider
    this.drawMiniWhiteRose(ctx, cx, footerY + 30, 14);
    ctx.restore();

    // Editable Caption with selected font & ink
    ctx.save();
    ctx.fillStyle = inkColor;
    const fontName = fontFamily || 'Caveat';
    ctx.font = `bold 56px "${fontName}", cursive, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = caption || 'mohar & gungun forever';
    ctx.fillText(text, cx, footerY + 110);

    // Date stamp
    ctx.font = '24px Nunito, sans-serif';
    ctx.fillStyle = inkColor === '#5A3E42' ? '#8A686D' : inkColor;
    ctx.letterSpacing = '2px';
    const date = dateText || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.fillText(`• ${date} •`, cx, footerY + 175);

    ctx.font = '16px Nunito, sans-serif';
    ctx.fillStyle = '#BCA3A7';
    ctx.fillText('made by mohar with love for gungun <3', cx, footerY + 230);
    ctx.restore();
  }

  drawMiniWhiteRose(ctx, cx, cy, size = 12) {
    ctx.save();
    ctx.translate(cx, cy);
    // Sage sepal
    ctx.fillStyle = '#B8C9B0';
    ctx.strokeStyle = '#5A3E42';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.4, size * 0.9, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Outer white petals
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mid ivory layer
    ctx.fillStyle = '#FFFDF7';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner blush center & swirl
    ctx.fillStyle = '#F7E6EA';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.15, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  drawMiniHeart(ctx, cx, cy, size) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size * 0.6, -size * 0.4, -size, size * 0.1, 0, size);
    ctx.bezierCurveTo(size, size * 0.1, size * 0.6, -size * 0.4, 0, size * 0.3);
    ctx.fill();
    ctx.restore();
  }

  drawRoundedImage(ctx, img, dx, dy, dw, dh, r) {
    ctx.save();
    this.roundedRectPath(ctx, dx, dy, dw, dh, r);
    ctx.clip();

    const crop = PhotoboothCamera.calculateCrop(img.width, img.height, dw, dh);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sWidth, crop.sHeight, dx, dy, dw, dh);
    ctx.restore();
  }

  drawSlotEmptyState(ctx, dx, dy, dw, dh, r, label) {
    ctx.save();
    this.roundedRectPath(ctx, dx, dy, dw, dh, r);
    ctx.clip();

    ctx.fillStyle = '#FFF5F7';
    ctx.fillRect(dx, dy, dw, dh);

    ctx.strokeStyle = '#E2B8BF';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(dx + 10, dy + 10, dw - 20, dh - 20);
    ctx.setLineDash([]);

    ctx.fillStyle = '#5A3E42';
    ctx.font = '32px Caveat, cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, dx + dw / 2, dy + dh / 2);
    ctx.restore();
  }

  roundedRectPath(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  loadImage(src) {
    if (src instanceof HTMLImageElement && src.complete && src.naturalWidth > 0) {
      return Promise.resolve(src);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image for canvas export'));
      img.src = typeof src === 'string' ? src : (src && src.src ? src.src : src);
    });
  }

  async shareOrDownload(param, filename = 'couples-photobooth-strip.png') {
    // Supports either an export result object { file, blob, blobUrl, filename } or a canvas element
    let file = null;
    let blob = null;
    let blobUrl = '';
    let name = filename;

    if (param && param.canvas) {
      file = param.file;
      blob = param.blob;
      blobUrl = param.blobUrl;
      name = param.filename || filename;
    } else if (param instanceof HTMLCanvasElement) {
      blob = await new Promise(res => param.toBlob(res, 'image/png', 1.0));
      if (blob) {
        file = new File([blob], filename, { type: 'image/png' });
        blobUrl = URL.createObjectURL(blob);
      }
    } else if (param && param.blob) {
      blob = param.blob;
      file = param.file || new File([blob], filename, { type: 'image/png' });
      blobUrl = param.blobUrl || URL.createObjectURL(blob);
    }

    if (!blob && !blobUrl && !file) return false;

    // 1. On Mobile Devices: Use Native Web Share API with File
    if (navigator.canShare && file) {
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Our Couples Photobooth Strip',
            text: 'made by mohar with love for gungun <3'
          });
          return true;
        } catch (err) {
          if (err.name === 'AbortError') return false;
          console.warn('Web Share failed, falling back to download:', err);
        }
      }
    }

    // 2. Direct Blob URL Download fallback
    const downloadUrl = blobUrl || URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
}

window.PhotoboothExporter = PhotoboothExporter;
