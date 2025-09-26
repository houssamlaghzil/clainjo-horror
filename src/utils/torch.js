// Utility to toggle torch on a given MediaStreamTrack (video)
// Returns a Promise<boolean> that resolves to true on success, false if unsupported or failed.
export async function toggleTorchOnTrack(track, on) {
  try {
    if (!track || typeof track.applyConstraints !== 'function') {
      console.warn('[torch] No valid video track');
      return false;
    }
    const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
    if (caps && 'torch' in caps) {
      await track.applyConstraints({ advanced: [{ torch: !!on }] });
      console.log(`[torch] torch => ${on}`);
      return true;
    }
    // Fallback: try ImageCapture if present
    try {
      if (typeof self !== 'undefined' && self.ImageCapture) {
        const ic = new self.ImageCapture(track);
        const pc = await ic.getPhotoCapabilities();
        if (pc && pc.torch) {
          await track.applyConstraints({ advanced: [{ torch: !!on }] });
          console.log(`[torch] (IC) torch => ${on}`);
          return true;
        }
      }
    } catch (e) {
      // ignore fallback failure; proceed to unsupported
    }
    console.warn('[torch] Torch not supported by capabilities');
    return false;
  } catch (err) {
    console.error('[torch] toggle failed', err);
    return false;
  }
}

// Quick check whether the current track claims to support torch
export async function isTorchSupportedOnTrack(track) {
  try {
    if (!track) return false;
    const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
    if (caps && 'torch' in caps) return true;
    if (typeof self !== 'undefined' && self.ImageCapture) {
      try {
        const ic = new self.ImageCapture(track);
        const pc = await ic.getPhotoCapabilities();
        return !!(pc && pc.torch);
      } catch (_) {
        return false;
      }
    }
    return false;
  } catch (_) {
    return false;
  }
}

// Ensure a media stream is attached to a playable hidden <video> to fully activate pipeline on mobile
// Returns the video element used (creates if not provided)
export async function playStreamInHiddenVideo(stream, existingEl) {
  const video = existingEl || document.createElement('video');
  try {
    if (!existingEl) {
      Object.assign(video, { playsInline: true, muted: true, autoplay: true });
      Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', bottom: '0', right: '0' });
      document.body.appendChild(video);
    }
    if (video.srcObject !== stream) video.srcObject = stream;
    if (video.paused) {
      try { await video.play(); } catch (e) { /* ignore */ }
    }
    return video;
  } catch (e) {
    console.warn('[torch] failed to attach video', e);
    return video;
  }
}
