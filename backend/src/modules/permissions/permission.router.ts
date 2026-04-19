import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  shareResource,
  revokePermission,
  getSharedWithMe,
  getSharedByMe,
  getResourcePermissions,
  updatePermission,
} from './permission.controller';

export const permissionRouter = Router();
permissionRouter.use(authenticate);
permissionRouter.post('/share', shareResource);
permissionRouter.get('/resource', getResourcePermissions);
permissionRouter.patch('/:id', updatePermission);
permissionRouter.delete('/:id', revokePermission);
permissionRouter.get('/shared-with-me', getSharedWithMe);
permissionRouter.get('/shared-by-me', getSharedByMe);