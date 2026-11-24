import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

const usersFile = path.join(config.dataPath, 'users.json');
const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

export const findByToken = (token) => {
  return users.find((u) => u.token === token) || null;
};

export const getAll = () => [...users];
