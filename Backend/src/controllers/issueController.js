import * as projectModel from '../models/projectModel.js';
import * as spaceModel from '../models/spaceModel.js';
import * as issueModel from '../models/issueModel.js';

const MAX_TITLE_LENGTH = 120;

const badRequest = (res, error) => res.status(400).json({ error });

// POST /api/projects/:id/issues
export const create = (req, res) => {
  const project = projectModel.getById(req.params.id, req.user);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!req.body || typeof req.body !== 'object') {
    return badRequest(res, 'Request body must be a JSON object');
  }

  const { title, level, spaceId } = req.body;

  if (typeof title !== 'string') {
    return badRequest(res, 'Title is required and must be a string');
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0 || trimmedTitle.length > MAX_TITLE_LENGTH) {
    return badRequest(res, `Title must be between 1 and ${MAX_TITLE_LENGTH} characters`);
  }

  if (typeof level !== 'string' || !level) {
    return badRequest(res, 'Level is required and must be a string');
  }
  if (!project.levels.includes(level)) {
    return badRequest(
      res,
      `Level '${level}' does not exist in this project. Valid levels: ${project.levels.join(', ')}`,
    );
  }

  if (spaceId != null) {
    if (typeof spaceId !== 'string') {
      return badRequest(res, 'spaceId must be a string');
    }
    const spaces = spaceModel.getByProjectId(project.id);
    if (!spaces?.some((space) => space.id === spaceId)) {
      return badRequest(res, `Space '${spaceId}' does not exist in this project`);
    }
  }

  const issue = issueModel.create(project.id, {
    title: trimmedTitle,
    level,
    spaceId: spaceId || null,
  });

  res.status(201).json({ id: issue.id });
};