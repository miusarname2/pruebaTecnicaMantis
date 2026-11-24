import fs from 'node:fs';
import path from 'node:path';
import * as projectModel from '../models/projectModel.js';
import * as spaceModel from '../models/spaceModel.js';
import { formatProjectList, formatProjectDetail } from '../utils/sanitize.js';
import { generateETag } from '../utils/etag.js';
import config from '../config/index.js';

const notFound = (res, error) => res.status(404).json({ error });

const rangeNotSatisfiable = (res, fileSize) =>
  res.status(416).set('Content-Range', `bytes */${fileSize}`).end();

// Devuelve { start, end } o null si el header no es válido para este archivo
const parseRange = (header, fileSize) => {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header);
  if (!match) return null;

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : fileSize - 1;

  if (start > end || end >= fileSize) return null;
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
  res.set({ ETag: etag, 'Cache-Control': 'private, no-cache' });

  if (req.headers['if-none-match'] === etag) {
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
  if (!rangeHeader) {
    res.set('Content-Length', size);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const range = parseRange(rangeHeader, size);
  if (!range) {
    return rangeNotSatisfiable(res, size);
  }

  const { start, end } = range;
  res.status(206).set({
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': end - start + 1,
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
};