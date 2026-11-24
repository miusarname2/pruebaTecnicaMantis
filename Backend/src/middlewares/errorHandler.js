export default (err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  const isClientError = err.status >= 400 && err.status < 500;
  if (isClientError) {
    return res.status(err.status).json({ error: err.message || 'Bad request' });
  }

  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
};