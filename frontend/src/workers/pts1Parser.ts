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
  | { ok: true; pointCount: number; announcedPointCount?: number; buckets: CloudLevelBucket[] }
  | { ok: false; message: string; isTruncated?: boolean };

interface NormalizedBox {
  level: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

function buildLevelContext(spaces: SpaceBoxInput[]) {
  const spaceBoxes: NormalizedBox[] = spaces.map((s) => ({
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

  return { spaceBoxes, levels, levelMids, levelIndexMap };
}

function classifyPoint(
  px: number,
  py: number,
  pz: number,
  spaceBoxes: NormalizedBox[],
  levels: string[],
  levelMids: number[],
  levelIndexMap: Map<string, number>
): number {
  for (let b = 0; b < spaceBoxes.length; b++) {
    const box = spaceBoxes[b];
    if (
      px >= box.minX && px <= box.maxX &&
      py >= box.minY && py <= box.maxY &&
      pz >= box.minZ && pz <= box.maxZ
    ) {
      return levelIndexMap.get(box.level) ?? 0;
    }
  }

  let bestDist = Infinity;
  let assignedIdx = 0;
  for (let l = 0; l < levels.length; l++) {
    const dist = Math.abs(py - levelMids[l]);
    if (dist < bestDist) {
      bestDist = dist;
      assignedIdx = l;
    }
  }
  return assignedIdx;
}

/**
 * In-place deterministic Fisher-Yates shuffle on each level bucket so that
 * prefix-based LOD (BufferGeometry.setDrawRange) renders a spatially uniform
 * sample even when the input PTS1 file is spatially ordered.
 */
export function shuffleBuckets(buckets: CloudLevelBucket[], seed = 0x9e3779b9): void {
  let state = seed >>> 0 || 1;
  const nextRand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  for (const bucket of buckets) {
    const count = Math.floor(bucket.positions.length / 3);
    if (count <= 1) continue;

    const { positions, colors } = bucket;
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      if (i === j) continue;

      const i3 = i * 3;
      const j3 = j * 3;

      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];
      positions[i3] = positions[j3];
      positions[i3 + 1] = positions[j3 + 1];
      positions[i3 + 2] = positions[j3 + 2];
      positions[j3] = px;
      positions[j3 + 1] = py;
      positions[j3 + 2] = pz;

      const r = colors[i3];
      const g = colors[i3 + 1];
      const b = colors[i3 + 2];
      colors[i3] = colors[j3];
      colors[i3 + 1] = colors[j3 + 1];
      colors[i3 + 2] = colors[j3 + 2];
      colors[j3] = r;
      colors[j3 + 1] = g;
      colors[j3 + 2] = b;
    }
  }
}

const STREAM_BLOCK_POINTS = 65536;
export const DEFAULT_MAX_RETAINED_POINTS = 4_000_000;

interface LevelBlockAccumulator {
  level: string;
  posBlocks: Float32Array[];
  colBlocks: Uint8Array[];
  currentPos: Float32Array;
  currentCol: Uint8Array;
  currentCount: number;
  totalCount: number;
}

/**
 * Incremental streaming PTS1 parser that processes network chunks directly
 * without buffering the entire raw file in memory.
 */
export class Pts1StreamParser {
  private readonly spaceBoxes: NormalizedBox[];
  private readonly levels: string[];
  private readonly levelMids: number[];
  private readonly levelIndexMap: Map<string, number>;
  private readonly maxRetainedPoints: number;
  private readonly accumulators: LevelBlockAccumulator[];

  private headerBuf = new Uint8Array(16);
  private headerBytes = 0;
  private headerParsed = false;

  private announcedCount = 0;
  private stride = 1;
  private recordsSeen = 0;
  private totalBytes = 0;

  private carryBuf = new Uint8Array(16);
  private carryView = new DataView(this.carryBuf.buffer);
  private carryLen = 0;

  constructor(spaces: SpaceBoxInput[] = [], maxRetainedPoints = DEFAULT_MAX_RETAINED_POINTS) {
    const ctx = buildLevelContext(spaces);
    this.spaceBoxes = ctx.spaceBoxes;
    this.levels = ctx.levels;
    this.levelMids = ctx.levelMids;
    this.levelIndexMap = ctx.levelIndexMap;
    this.maxRetainedPoints = Math.max(1, maxRetainedPoints);

    this.accumulators = this.levels.map((level) => ({
      level,
      posBlocks: [],
      colBlocks: [],
      currentPos: new Float32Array(STREAM_BLOCK_POINTS * 3),
      currentCol: new Uint8Array(STREAM_BLOCK_POINTS * 3),
      currentCount: 0,
      totalCount: 0,
    }));
  }

  public push(chunk: Uint8Array): { ok: false; message: string; isTruncated?: boolean } | null {
    if (chunk.byteLength === 0) return null;
    this.totalBytes += chunk.byteLength;

    let offset = 0;

    if (!this.headerParsed) {
      const needed = 16 - this.headerBytes;
      const take = Math.min(needed, chunk.byteLength);
      this.headerBuf.set(chunk.subarray(0, take), this.headerBytes);
      this.headerBytes += take;
      offset += take;

      if (this.headerBytes < 16) {
        return null;
      }

      const magic = String.fromCharCode(
        this.headerBuf[0],
        this.headerBuf[1],
        this.headerBuf[2],
        this.headerBuf[3]
      );
      if (magic !== 'PTS1') {
        return {
          ok: false,
          message: `Invalid file format: expected 'PTS1' header but received '${magic}'.`,
        };
      }

      const headerView = new DataView(this.headerBuf.buffer, 0, 16);
      this.announcedCount = headerView.getUint32(4, true);
      this.stride = this.announcedCount > this.maxRetainedPoints
        ? Math.ceil(this.announcedCount / this.maxRetainedPoints)
        : 1;
      this.headerParsed = true;
    }

    if (this.recordsSeen >= this.announcedCount) {
      return null;
    }

    if (this.carryLen > 0) {
      const needed = 16 - this.carryLen;
      const take = Math.min(needed, chunk.byteLength - offset);
      this.carryBuf.set(chunk.subarray(offset, offset + take), this.carryLen);
      this.carryLen += take;
      offset += take;

      if (this.carryLen === 16) {
        this.processRecord(this.carryView, this.carryBuf, 0);
        this.carryLen = 0;
      }
    }

    const chunkView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    while (offset + 16 <= chunk.byteLength && this.recordsSeen < this.announcedCount) {
      this.processRecord(chunkView, chunk, offset);
      offset += 16;
    }

    if (offset < chunk.byteLength && this.recordsSeen < this.announcedCount) {
      const rem = chunk.byteLength - offset;
      this.carryBuf.set(chunk.subarray(offset), 0);
      this.carryLen = rem;
    }

    return null;
  }

  private processRecord(view: DataView, bytes: Uint8Array, byteOffset: number) {
    const idx = this.recordsSeen++;
    if (idx % this.stride !== 0) return;

    const px = view.getFloat32(byteOffset, true);
    const pz = view.getFloat32(byteOffset + 4, true);
    const py = view.getFloat32(byteOffset + 8, true);

    const lIdx = classifyPoint(
      px,
      py,
      pz,
      this.spaceBoxes,
      this.levels,
      this.levelMids,
      this.levelIndexMap
    );

    const acc = this.accumulators[lIdx];
    if (acc.currentCount === STREAM_BLOCK_POINTS) {
      acc.posBlocks.push(acc.currentPos);
      acc.colBlocks.push(acc.currentCol);
      acc.currentPos = new Float32Array(STREAM_BLOCK_POINTS * 3);
      acc.currentCol = new Uint8Array(STREAM_BLOCK_POINTS * 3);
      acc.currentCount = 0;
    }

    const i3 = acc.currentCount * 3;
    acc.currentPos[i3] = px;
    acc.currentPos[i3 + 1] = py;
    acc.currentPos[i3 + 2] = pz;

    acc.currentCol[i3] = bytes[byteOffset + 12];
    acc.currentCol[i3 + 1] = bytes[byteOffset + 13];
    acc.currentCol[i3 + 2] = bytes[byteOffset + 14];

    acc.currentCount++;
    acc.totalCount++;
  }

  public finish(shuffle = true): ParsePts1Result {
    if (!this.headerParsed) {
      return {
        ok: false,
        message: 'File too small: incomplete PTS1 header. Try again.',
        isTruncated: true,
      };
    }

    if (this.recordsSeen < this.announcedCount) {
      return {
        ok: false,
        message: `Point cloud file is incomplete or truncated. Announced ${this.announcedCount.toLocaleString()} points, but only received ${this.recordsSeen.toLocaleString()} points (${((this.totalBytes / 1024) / 1024).toFixed(1)} MB). Try again.`,
        isTruncated: true,
      };
    }

    let retainedTotal = 0;
    const buckets: CloudLevelBucket[] = this.accumulators.map((acc) => {
      const total = acc.totalCount;
      retainedTotal += total;
      const positions = new Float32Array(total * 3);
      const colors = new Uint8Array(total * 3);

      let writeOffset = 0;
      for (let b = 0; b < acc.posBlocks.length; b++) {
        const pb = acc.posBlocks[b];
        const cb = acc.colBlocks[b];
        positions.set(pb, writeOffset);
        colors.set(cb, writeOffset);
        writeOffset += pb.length;
      }
      acc.posBlocks.length = 0;
      acc.colBlocks.length = 0;

      if (acc.currentCount > 0) {
        const tailLen = acc.currentCount * 3;
        positions.set(acc.currentPos.subarray(0, tailLen), writeOffset);
        colors.set(acc.currentCol.subarray(0, tailLen), writeOffset);
      }

      return { level: acc.level, positions, colors };
    });

    if (shuffle) {
      shuffleBuckets(buckets);
    }

    return {
      ok: true,
      pointCount: retainedTotal,
      announcedPointCount: this.announcedCount,
      buckets,
    };
  }
}

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
