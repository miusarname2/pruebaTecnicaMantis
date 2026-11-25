import type { CloudLevelBucket } from '../types';

export interface SpaceBoxInput {
  level: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export type ParsePts1Result =
  | { ok: true; pointCount: number; buckets: CloudLevelBucket[] }
  | { ok: false; message: string; isTruncated?: boolean };

/**
 * Parses a PTS1 binary buffer, maps Z-up coordinates to Three.js Y-up,
 * and partitions points into per-level typed array buckets.
 */
export function parsePts1Buffer(fullBuffer: Uint8Array, spaces: SpaceBoxInput[] = []): ParsePts1Result {
  const loadedBytes = fullBuffer.byteLength;

  if (loadedBytes < 16) {
    return {
      ok: false,
      message: 'File too small: incomplete PTS1 header. Try again.',
      isTruncated: true,
    };
  }

  const dataView = new DataView(fullBuffer.buffer, fullBuffer.byteOffset, fullBuffer.byteLength);

  const magic = String.fromCharCode(
    fullBuffer[0],
    fullBuffer[1],
    fullBuffer[2],
    fullBuffer[3]
  );

  if (magic !== 'PTS1') {
    return {
      ok: false,
      message: `Invalid file format: expected 'PTS1' header but received '${magic}'.`,
    };
  }

  const N = dataView.getUint32(4, true);
  const expectedBytes = 16 + N * 16;

  if (loadedBytes < expectedBytes) {
    const actualPoints = Math.floor((loadedBytes - 16) / 16);
    return {
      ok: false,
      message: `Point cloud file is incomplete or truncated. Announced ${N.toLocaleString()} points, but only received ${actualPoints.toLocaleString()} points (${((loadedBytes / 1024) / 1024).toFixed(1)} MB). Try again.`,
      isTruncated: true,
    };
  }

  const spaceBoxes = spaces.map((s) => ({
    level: s.level,
    minX: s.x - 0.08,
    maxX: s.x + s.w + 0.08,
    minY: s.z - 0.05, // In Three.js, Y is kit z (height)
    maxY: s.z + s.h + 0.05,
    minZ: s.y - 0.08, // In Three.js, Z is kit y (depth)
    maxZ: s.y + s.d + 0.08,
  }));

  const levels = Array.from(new Set(spaces.map((s) => s.level)));
  if (levels.length === 0) levels.push('Default');

  const levelMids: number[] = levels.map((lvl) => {
    const boxes = spaceBoxes.filter((b) => b.level === lvl);
    if (boxes.length === 0) return 0;
    const minY = Math.min(...boxes.map((b) => b.minY));
    const maxY = Math.max(...boxes.map((b) => b.maxY));
    return (minY + maxY) / 2;
  });

  const levelIndexMap = new Map<string, number>();
  levels.forEach((lvl, idx) => levelIndexMap.set(lvl, idx));

  const pointLevelIndices = levels.length > 255 ? new Uint16Array(N) : new Uint8Array(N);
  const levelCounts = new Int32Array(levels.length);

  // Pass 1: classify each point into its level bucket without allocating temp position/color buffers
  for (let i = 0; i < N; i++) {
    const byteOffset = 16 + i * 16;

    const px = dataView.getFloat32(byteOffset, true);
    const pz = dataView.getFloat32(byteOffset + 4, true); // In Three.js, Z is kit y (depth)
    const py = dataView.getFloat32(byteOffset + 8, true); // In Three.js, Y is kit z (height)

    let assignedIdx = -1;
    for (let b = 0; b < spaceBoxes.length; b++) {
      const box = spaceBoxes[b];
      if (
        px >= box.minX && px <= box.maxX &&
        py >= box.minY && py <= box.maxY &&
        pz >= box.minZ && pz <= box.maxZ
      ) {
        assignedIdx = levelIndexMap.get(box.level) ?? 0;
        break;
      }
    }

    if (assignedIdx === -1) {
      let bestDist = Infinity;
      assignedIdx = 0;
      for (let l = 0; l < levels.length; l++) {
        const dist = Math.abs(py - levelMids[l]);
        if (dist < bestDist) {
          bestDist = dist;
          assignedIdx = l;
        }
      }
    }

    pointLevelIndices[i] = assignedIdx;
    levelCounts[assignedIdx]++;
  }

  const buckets: CloudLevelBucket[] = levels.map((level, lIdx) => ({
    level,
    positions: new Float32Array(levelCounts[lIdx] * 3),
    colors: new Uint8Array(levelCounts[lIdx] * 3),
  }));
  const levelOffsets = new Int32Array(levels.length);

  // Pass 2: write positions and colors directly into the final per-level transferable buckets
  for (let i = 0; i < N; i++) {
    const byteOffset = 16 + i * 16;
    const lIdx = pointLevelIndices[i];
    const offset3 = levelOffsets[lIdx];
    const bucket = buckets[lIdx];

    bucket.positions[offset3] = dataView.getFloat32(byteOffset, true);
    bucket.positions[offset3 + 1] = dataView.getFloat32(byteOffset + 8, true);
    bucket.positions[offset3 + 2] = dataView.getFloat32(byteOffset + 4, true);

    bucket.colors[offset3] = fullBuffer[byteOffset + 12];
    bucket.colors[offset3 + 1] = fullBuffer[byteOffset + 13];
    bucket.colors[offset3 + 2] = fullBuffer[byteOffset + 14];

    levelOffsets[lIdx] += 3;
  }

  return { ok: true, pointCount: N, buckets };
}
