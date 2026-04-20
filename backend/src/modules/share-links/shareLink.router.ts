import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { createShareLink, getShareLink, downloadSharedFile, claimSharedAccess } from './shareLink.controller';

export const shareLinkRouter = Router();
shareLinkRouter.post('/', authenticate, createShareLink);
shareLinkRouter.get('/:token', getShareLink);
shareLinkRouter.get('/:token/download', downloadSharedFile);
shareLinkRouter.post('/:token/claim', authenticate, claimSharedAccess);
