import { describe, it, expect } from 'vitest';
import { parsePts1Buffer, Pts1StreamParser, shuffleBuckets, type SpaceBoxInput } from '../pts1Parser';

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

describe('Pts1StreamParser & shuffleBuckets', () => {
  it('parses chunked streams split across header and record boundaries', () => {
    const spaces: SpaceBoxInput[] = [
      { level: 'Level 1', x: 0, y: 0, z: 0, w: 10, d: 10, h: 3 },
      { level: 'Level 2', x: 0, y: 0, z: 3.5, w: 10, d: 10, h: 3 },
    ];
    const buffer = buildPts1([
      { x: 1, y: 2, z: 1, r: 10, g: 20, b: 30 },
      { x: 3, y: 4, z: 4.5, r: 40, g: 50, b: 60 },
      { x: 5, y: 6, z: 1.5, r: 70, g: 80, b: 90 },
    ]);

    const parser = new Pts1StreamParser(spaces);
    // Feed in 7-byte chunks so header (16B) and records (16B) are split
    for (let i = 0; i < buffer.length; i += 7) {
      const err = parser.push(buffer.subarray(i, Math.min(i + 7, buffer.length)));
      expect(err).toBeNull();
    }

    const res = parser.finish(false);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.pointCount).toBe(3);
    const l1 = res.buckets.find((b) => b.level === 'Level 1')!;
    const l2 = res.buckets.find((b) => b.level === 'Level 2')!;
    expect(l1.positions.length).toBe(6);
    expect(l2.positions.length).toBe(3);
  });

  it('fails fast on invalid magic header during streaming', () => {
    const buffer = buildPts1([], 'BAD1');
    const parser = new Pts1StreamParser();
    const err = parser.push(buffer);
    expect(err).not.toBeNull();
    expect(err?.ok).toBe(false);
    expect(err?.message).toContain("expected 'PTS1'");
  });

  it('subsamples uniformly when announced points exceed maxRetainedPoints', () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      x: i,
      y: i,
      z: 1,
      r: i * 10,
      g: 0,
      b: 0,
    }));
    const buffer = buildPts1(points);
    const parser = new Pts1StreamParser([], 4); // stride = ceil(10 / 4) = 3 -> indices 0, 3, 6, 9
    expect(parser.push(buffer)).toBeNull();

    const res = parser.finish(false);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.announcedPointCount).toBe(10);
    expect(res.pointCount).toBe(4);
    expect(res.buckets[0].positions.length).toBe(12);
  });

  it('shuffles buckets deterministically while keeping position-color pairing', () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      x: i,
      y: i * 2,
      z: 1,
      r: i,
      g: i + 1,
      b: i + 2,
    }));
    const res = parsePts1Buffer(buildPts1(points));
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    shuffleBuckets(res.buckets);
    const { positions, colors } = res.buckets[0];
    expect(positions.length).toBe(60);
    for (let i = 0; i < 20; i++) {
      const x = positions[i * 3];
      expect(colors[i * 3]).toBe(x);
      expect(colors[i * 3 + 1]).toBe(x + 1);
      expect(colors[i * 3 + 2]).toBe(x + 2);
    }
  });
});
