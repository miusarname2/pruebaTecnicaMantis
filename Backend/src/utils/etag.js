import crypto from 'crypto';

export const generateETag = (data) => {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
};
