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
