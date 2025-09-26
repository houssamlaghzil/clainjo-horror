import { describe, it, expect, vi } from 'vitest';
import { toggleTorchOnTrack } from './torch.js';

function makeTrack({ supportsTorch = true }) {
  const applied = [];
  return {
    applyConstraints: vi.fn(async (c) => { applied.push(c); }),
    getCapabilities: supportsTorch ? (() => ({ torch: true })) : (() => ({})),
    _applied: applied,
  };
}

describe('toggleTorchOnTrack', () => {
  it('enables torch when supported', async () => {
    const track = makeTrack({ supportsTorch: true });
    const ok = await toggleTorchOnTrack(track, true);
    expect(ok).toBe(true);
    expect(track.applyConstraints).toHaveBeenCalled();
    const arg = track._applied[0];
    expect(arg).toHaveProperty('advanced');
    expect(arg.advanced[0]).toHaveProperty('torch', true);
  });

  it('returns false when not supported', async () => {
    const track = makeTrack({ supportsTorch: false });
    const ok = await toggleTorchOnTrack(track, true);
    expect(ok).toBe(false);
  });
});
