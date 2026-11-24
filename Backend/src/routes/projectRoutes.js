import { Router } from 'express';
import { validateProjectId } from '../middlewares/validators.js';
import * as ctrl from '../controllers/projectController.js';

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', validateProjectId, ctrl.detail);
router.get('/:id/spaces', validateProjectId, ctrl.spaces);
router.get('/:id/cloud', validateProjectId, ctrl.cloud);

export default router;
