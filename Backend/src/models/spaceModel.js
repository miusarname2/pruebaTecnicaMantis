import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

const cache = new Map();

export const getByProjectId = (projectId) => {
  if (cache.has(projectId)) return cache.get(projectId);

  const filePath = path.join(config.dataPath, 'spaces', `${projectId}.json`);

  if (!fs.existsSync(filePath)) {
    cache.set(projectId, null);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  cache.set(projectId, data);
  return data;
};
