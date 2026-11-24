import { execSync } from 'child_process';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async () => {
  const cloudsDir = resolve(__dirname, '..', '..', 'kit', 'data', 'clouds');
  const makeCloud = resolve(__dirname, '..', '..', 'kit', 'tools', 'make-cloud.js');

  const cloud1 = join(cloudsDir, '1201-30001.pts');
  const cloud2 = join(cloudsDir, '1201-30002.pts');

  if (!existsSync(cloud1)) {
    execSync(`node "${makeCloud}" 1201-30001 1000`, { stdio: 'inherit' });
  }
  if (!existsSync(cloud2)) {
    execSync(`node "${makeCloud}" 1201-30002 1000`, { stdio: 'inherit' });
  }
};
