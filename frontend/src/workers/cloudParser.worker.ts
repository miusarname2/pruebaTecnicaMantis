// Web Worker for downloading, parsing, and level-partitioning PTS1 binary point cloud files
// Runs on a background thread so the 3D scene and UI remain completely fluid
import { parsePts1Buffer, type SpaceBoxInput } from './pts1Parser';

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

    const fullBuffer = new Uint8Array(loadedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const result = parsePts1Buffer(fullBuffer, spaces);
    if (!result.ok) {
      self.postMessage({
        type: 'error',
        message: result.message,
        isTruncated: result.isTruncated,
      });
      return;
    }

    const transferables: Transferable[] = [];
    for (const b of result.buckets) {
      transferables.push(b.positions.buffer, b.colors.buffer);
    }

    (self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
      {
        type: 'done',
        pointCount: result.pointCount,
        buckets: result.buckets,
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
