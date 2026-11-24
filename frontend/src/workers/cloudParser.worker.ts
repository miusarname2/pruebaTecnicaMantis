// Web Worker for downloading, parsing, and level-partitioning PTS1 binary point cloud files
// Runs on a background thread so the 3D scene and UI remain completely fluid (60+ FPS)

interface SpaceBoxInput {
  level: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

self.onmessage = async (e: MessageEvent<{ url: string; token: string; spaces?: SpaceBoxInput[] }>) => {
  const { url, token, spaces = [] } = e.data;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        self.postMessage({
          type: 'error',
          message: 'No point cloud available for this project.',
        });
        return;
      }
      if (response.status === 401) {
        self.postMessage({
          type: 'error',
          message: 'Authentication error. Please re-select a valid token.',
        });
        return;
      }
      self.postMessage({
        type: 'error',
        message: `Failed to load point cloud (HTTP ${response.status}). Try again.`,
      });
      return;
    }

    if (!response.body) {
      self.postMessage({
        type: 'error',
        message: 'Empty response body from point cloud endpoint. Try again.',
      });
      return;
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;
    let lastProgressTime = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        loadedBytes += value.byteLength;

        // Throttle progress updates to ~20fps to avoid message overhead
        const now = performance.now();
        if (now - lastProgressTime > 50 || loadedBytes === totalBytes) {
          lastProgressTime = now;
          const percent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;
          self.postMessage({
            type: 'progress',
            loadedBytes,
            totalBytes: totalBytes || loadedBytes,
            percent,
          });
        }
      }
    }

    // Combine all chunks into one continuous Uint8Array
    const fullBuffer = new Uint8Array(loadedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    // ── PTS1 Validation ──────────────────────────────────────────────
    if (loadedBytes < 16) {
      self.postMessage({
        type: 'error',
        message: 'File too small: incomplete PTS1 header. Try again.',
        isTruncated: true,
      });
      return;
    }

    const dataView = new DataView(fullBuffer.buffer, fullBuffer.byteOffset, fullBuffer.byteLength);

    // Bytes 0..3: ASCII "PTS1"
    const magic = String.fromCharCode(
      fullBuffer[0],
      fullBuffer[1],
      fullBuffer[2],
      fullBuffer[3]
    );

    if (magic !== 'PTS1') {
      self.postMessage({
        type: 'error',
        message: `Invalid file format: expected 'PTS1' header but received '${magic}'.`,
      });
      return;
    }

    // Bytes 4..7: uint32 point count N
    const N = dataView.getUint32(4, true);

    const expectedBytes = 16 + N * 16;
    if (loadedBytes < expectedBytes) {
      const actualPoints = Math.floor((loadedBytes - 16) / 16);
      self.postMessage({
        type: 'error',
        message: `Point cloud file is incomplete or truncated. Announced ${N.toLocaleString()} points, but only received ${actualPoints.toLocaleString()} points (${((loadedBytes / 1024) / 1024).toFixed(1)} MB). Try again.`,
        isTruncated: true,
      });
      return;
    }

    // ── Level classification setup (runs off the main thread) ────────
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

    // Pass 1: parse coordinates, classify into level index, and count per level
    const tempPositions = new Float32Array(N * 3);
    const tempColors = new Uint8Array(N * 3);
    const pointLevelIndices = new Uint8Array(N);
    const levelCounts = new Int32Array(levels.length);

    for (let i = 0; i < N; i++) {
      const byteOffset = 16 + i * 16;

      const x = dataView.getFloat32(byteOffset, true);
      const y = dataView.getFloat32(byteOffset + 4, true);
      const z = dataView.getFloat32(byteOffset + 8, true);

      // Coordinate mapping to Three.js:
      // In kit: x = x, y = depth, z = height (Z up)
      // In Three.js: X = x, Y = z (up), Z = y (depth)
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

    // Pass 2: pack into per-level typed arrays for zero-copy transfer
    const buckets = levels.map((level, lIdx) => ({
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

    const transferables: Transferable[] = [];
    for (const b of buckets) {
      transferables.push(b.positions.buffer, b.colors.buffer);
    }

    // Zero-copy transfer of partitioned typed array memory to main thread
    (self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
      {
        type: 'done',
        pointCount: N,
        buckets,
      },
      transferables
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      return;
    }
    self.postMessage({
      type: 'error',
      message: error.message?.includes('Failed to fetch')
        ? 'Network error. Could not connect to the API server. Try again.'
        : `Error loading point cloud: ${error.message || 'Unknown error'}. Try again.`,
    });
  }
};
