import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { createShareLink, getShareLink } from './shareLink.controller';

export const shareLinkRouter = Router();
shareLinkRouter.post('/', authenticate, createShareLink);
shareLinkRouter.get('/:token', getShareLink);
