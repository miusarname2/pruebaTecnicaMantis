import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

const projectsFile = path.join(config.dataPath, 'projects.json');
const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));

export const getAll = (user) => {
  if (user.role === 'staff') return projects;
  return projects.filter((p) => p.account === user.account);
};

export const getById = (id, user) => {
  const project = projects.find((p) => p.id === id);
  if (!project) return null;
  if (user.role === 'client' && project.account !== user.account) return null;
  return project;
};
