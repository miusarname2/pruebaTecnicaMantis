import { v4 as uuidv4 } from 'uuid';

const issues = [];

export const create = (projectId, data) => {
  const issue = {
    id: uuidv4(),
    projectId,
    title: data.title,
    level: data.level,
    spaceId: data.spaceId || null,
    createdAt: new Date().toISOString(),
  };
  issues.push(issue);
  return issue;
};

export const getAll = () => [...issues];

export const reset = () => {
  issues.length = 0;
};
