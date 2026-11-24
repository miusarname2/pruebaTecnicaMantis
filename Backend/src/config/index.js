import { fileURLToPath } from 'node:url';

export default {
  port: process.env.PORT || 3000,
  dataPath: fileURLToPath(new URL('../../../kit/data', import.meta.url)),
};