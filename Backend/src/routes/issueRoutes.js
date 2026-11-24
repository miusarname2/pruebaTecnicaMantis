import { Router } from 'express';
import { validateProjectId } from '../middlewares/validators.js';
import * as ctrl from '../controllers/issueController.js';

const router = Router();

router.post('/:id/issues', validateProjectId, ctrl.create);

export default router;
