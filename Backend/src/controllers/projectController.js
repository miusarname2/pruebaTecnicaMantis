import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream';
import * as projectModel from '../models/projectModel.js';
import * as spaceModel from '../models/spaceModel.js';
import { formatProjectList, formatProjectDetail } from '../utils/sanitize.js';
import { generateETag, matchesIfNoneMatch } from '../utils/etag.js';
import config from '../config/index.js';

const notFound = (res, error) => res.status(404).json({ error });

const rangeNotSatisfiable = (res, fileSize) =>
  res.status(416).set('Content-Range', `bytes */${fileSize}`).end();

const parseRange = (header, fileSize) => {
  if (fileSize <= 0 || typeof header !== 'string') return null;

  const trimmed = header.trim();

  const suffixMatch = /^bytes=-(\d+)$/.exec(trimmed);
  if (suffixMatch) {
    const suffixLength = Number(suffixMatch[1]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    const start = Math.max(0, fileSize - suffixLength);
    return { start, end: fileSize - 1 };
  }

  const rangeMatch = /^bytes=(\d+)-(\d*)$/.exec(trimmed);
  if (!rangeMatch) return null;

  const start = Number(rangeMatch[1]);
  if (!Number.isSafeInteger(start) || start >= fileSize) return null;

  let end = fileSize - 1;
  if (rangeMatch[2]) {
    const parsedEnd = Number(rangeMatch[2]);
    if (!Number.isSafeInteger(parsedEnd)) return null;
    end = Math.min(parsedEnd, fileSize - 1);
  }

  if (start > end) return null;
  return { start, end };
};

// GET /api/projects
export const list = (req, res) => {
  res.json(projectModel.getAll(req.user).map(formatProjectList));
};

// GET /api/projects/:id
export const detail = (req, res) => {
  const project = projectModel.getById(req.params.id, req.user);
  if (!project) {
    return notFound(res, 'Project not found');
  }

  const result = formatProjectDetail(project, req.user.role);

  const etag = generateETag(result);
  res.set({
    ETag: etag,
    'Cache-Control': 'private, no-cache',
    Vary: 'Authorization',
  });

  if (matchesIfNoneMatch(req.headers['if-none-match'], etag)) {
    return res.status(304).end();
  }

  res.json(result);
};

// GET /api/projects/:id/spaces
export const spaces = (req, res) => {
  const project = projectModel.getById(req.params.id, req.user);
  if (!project) {
    return notFound(res, 'Project not found');
  }

  const projectSpaces = spaceModel.getByProjectId(project.id);
  if (!projectSpaces) {
    return notFound(res, 'Spaces not found for this project');
  }

  res.json(projectSpaces);
};

// GET /api/projects/:id/cloud
export const cloud = (req, res) => {
  const project = projectModel.getById(req.params.id, req.user);
  if (!project) {
    return notFound(res, 'Project not found');
  }

  if (!project.cloud) {
    return notFound(res, 'Point cloud not available for this project');
  }

  const filePath = path.join(config.dataPath, 'clouds', project.cloud);
  if (!fs.existsSync(filePath)) {
    return notFound(res, 'Point cloud file not found on disk');
  }

  const { size } = fs.statSync(filePath);

  res.set({
    'Accept-Ranges': 'bytes',
    'Content-Type': 'application/octet-stream',
  });

  const rangeHeader = req.headers.range;
  let readStream;

  if (!rangeHeader) {
    res.set('Content-Length', size);
    readStream = fs.createReadStream(filePath);
  } else {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      return rangeNotSatisfiable(res, size);
    }

    const { start, end } = range;
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    readStream = fs.createReadStream(filePath, { start, end });
  }

  pipeline(readStream, res, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      console.error('[CLOUD STREAM ERROR]', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming point cloud' });
      }
    }
  });
};