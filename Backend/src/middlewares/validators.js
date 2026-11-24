export const validateProjectId = (req, res, next) => {
  const { id } = req.params;

  if (!/^\d{4}-\d{5}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid project ID format' });
  }

  next();
};
