// Web Worker for downloading and parsing PTS1 binary point cloud files
// Runs on a background thread so the 3D scene and UI remain completely fluid (60+ FPS)

self.onmessage = async (e: MessageEvent<{ url: string; token: string }>) => {
  const { url, token } = e.data;

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

    // Bytes 8..11: float32 point spacing in metres
    // Bytes 12..15: uint32 reserved

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

    // ── Body parsing into typed arrays ───────────────────────────────
    // Allocate positions (3 floats per point) and colors (3 uint8 per point)
    const positions = new Float32Array(N * 3);
    const colors = new Uint8Array(N * 3);

    for (let i = 0; i < N; i++) {
      const byteOffset = 16 + i * 16;

      const x = dataView.getFloat32(byteOffset, true);
      const y = dataView.getFloat32(byteOffset + 4, true);
      const z = dataView.getFloat32(byteOffset + 8, true);

      const r = fullBuffer[byteOffset + 12];
      const g = fullBuffer[byteOffset + 13];
      const b = fullBuffer[byteOffset + 14];

      // Coordinate mapping to Three.js:
      // In kit: x = x, y = depth, z = height (Z up)
      // In Three.js: X = x, Y = z (up), Z = y (depth)
      const pIndex = i * 3;
      positions[pIndex] = x;
      positions[pIndex + 1] = z;
      positions[pIndex + 2] = y;

      const cIndex = i * 3;
      colors[cIndex] = r;
      colors[cIndex + 1] = g;
      colors[cIndex + 2] = b;
    }

    // Zero-copy transfer of typed array memory to main thread
    (self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
      {
        type: 'done',
        pointCount: N,
        positions,
        colors,
      },
      [positions.buffer, colors.buffer]
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      // Aborted by user - don't send error
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
