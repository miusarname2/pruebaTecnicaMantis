import * as userModel from '../models/userModel.js';

export default (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = userModel.findByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  res.set('Vary', 'Authorization');
  next();
};
