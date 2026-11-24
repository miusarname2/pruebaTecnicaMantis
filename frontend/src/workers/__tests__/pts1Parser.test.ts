import { describe, it, expect } from 'vitest';
import { parsePts1Buffer, type SpaceBoxInput } from '../pts1Parser';

function buildPts1(
  points: Array<{ x: number; y: number; z: number; r: number; g: number; b: number; intensity?: number }>,
  magic = 'PTS1',
  declaredCount = points.length
): Uint8Array {
  const buf = new Uint8Array(16 + points.length * 16);
  const view = new DataView(buf.buffer);

  for (let i = 0; i < 4; i++) {
    buf[i] = magic.charCodeAt(i);
  }
  view.setUint32(4, declaredCount, true);
  view.setFloat32(8, 0.02, true);
  view.setUint32(12, 0, true);

  points.forEach((p, idx) => {
    const o = 16 + idx * 16;
    view.setFloat32(o, p.x, true);
    view.setFloat32(o + 4, p.y, true);
    view.setFloat32(o + 8, p.z, true);
    buf[o + 12] = p.r;
    buf[o + 13] = p.g;
    buf[o + 14] = p.b;
    buf[o + 15] = p.intensity ?? 255;
  });

  return buf;
}

describe('parsePts1Buffer', () => {
  it('parses valid PTS1 data, converts Z-up to Y-up, and partitions by level', () => {
    const spaces: SpaceBoxInput[] = [
      { level: 'Level 1', x: 0, y: 0, z: 0, w: 10, d: 10, h: 3 },
      { level: 'Level 2', x: 0, y: 0, z: 3.5, w: 10, d: 10, h: 3 },
    ];

    const buffer = buildPts1([
      { x: 2, y: 5, z: 1, r: 255, g: 10, b: 20 },   // Level 1
      { x: 4, y: 6, z: 4.5, r: 30, g: 40, b: 200 }, // Level 2
    ]);

    const res = parsePts1Buffer(buffer, spaces);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.pointCount).toBe(2);
    expect(res.buckets).toHaveLength(2);

    const l1 = res.buckets.find((b) => b.level === 'Level 1')!;
    expect(Array.from(l1.positions)).toEqual([2, 1, 5]); // x=2, y=z(1), z=y(5)
    expect(Array.from(l1.colors)).toEqual([255, 10, 20]);

    const l2 = res.buckets.find((b) => b.level === 'Level 2')!;
    expect(Array.from(l2.positions)).toEqual([4, 4.5, 6]);
    expect(Array.from(l2.colors)).toEqual([30, 40, 200]);
  });

  it('handles N = 0 points cleanly', () => {
    const buffer = buildPts1([]);
    const res = parsePts1Buffer(buffer);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.pointCount).toBe(0);
    expect(res.buckets[0].positions.length).toBe(0);
  });

  it('detects incomplete header (< 16 bytes) as truncated', () => {
    const res = parsePts1Buffer(new Uint8Array(8));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.isTruncated).toBe(true);
    expect(res.message).toContain('Try again');
  });

  it('detects invalid magic header', () => {
    const buffer = buildPts1([], 'BAD1');
    const res = parsePts1Buffer(buffer);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.message).toContain("expected 'PTS1'");
  });

  it('detects truncated point cloud body', () => {
    const buffer = buildPts1(
      [{ x: 1, y: 1, z: 1, r: 10, g: 20, b: 30 }],
      'PTS1',
      5 // announces 5 points, only 1 present
    );
    const res = parsePts1Buffer(buffer);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.isTruncated).toBe(true);
    expect(res.message).toContain('Announced 5 points');
    expect(res.message).toContain('received 1 points');
  });
});
