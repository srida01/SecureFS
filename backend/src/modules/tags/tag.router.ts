import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { addTag, getFileTags, updateTag, removeTag } from './tag.controller';

export const tagRouter = Router();

tagRouter.use(authenticate);
tagRouter.post('/files/:fileId/tags', addTag);
tagRouter.get('/files/:fileId/tags', getFileTags);
tagRouter.patch('/files/:fileId/tags/:tagId', updateTag);
tagRouter.delete('/files/:fileId/tags/:tagId', removeTag);
