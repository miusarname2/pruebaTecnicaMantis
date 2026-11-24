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

  const tempPositions = new Float32Array(N * 3);
  const tempColors = new Uint8Array(N * 3);
  const pointLevelIndices = new Uint8Array(N);
  const levelCounts = new Int32Array(levels.length);

  for (let i = 0; i < N; i++) {
    const byteOffset = 16 + i * 16;

    const x = dataView.getFloat32(byteOffset, true);
    const y = dataView.getFloat32(byteOffset + 4, true);
    const z = dataView.getFloat32(byteOffset + 8, true);

    const px = x;
    const py = z;
    const pz = y;

    const idx3 = i * 3;
    tempPositions[idx3] = px;
    tempPositions[idx3 + 1] = py;
    tempPositions[idx3 + 2] = pz;

    tempColors[idx3] = fullBuffer[byteOffset + 12];
    tempColors[idx3 + 1] = fullBuffer[byteOffset + 13];
    tempColors[idx3 + 2] = fullBuffer[byteOffset + 14];

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

  for (let i = 0; i < N; i++) {
    const lIdx = pointLevelIndices[i];
    const offset3 = levelOffsets[lIdx];
    const pIdx = i * 3;
    const bucket = buckets[lIdx];

    bucket.positions[offset3] = tempPositions[pIdx];
    bucket.positions[offset3 + 1] = tempPositions[pIdx + 1];
    bucket.positions[offset3 + 2] = tempPositions[pIdx + 2];

    bucket.colors[offset3] = tempColors[pIdx];
    bucket.colors[offset3 + 1] = tempColors[pIdx + 1];
    bucket.colors[offset3 + 2] = tempColors[pIdx + 2];

    levelOffsets[lIdx] += 3;
  }

  return { ok: true, pointCount: N, buckets };
}
