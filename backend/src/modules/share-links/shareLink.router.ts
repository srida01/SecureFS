import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { createShareLink, getShareLink, downloadSharedFile, claimSharedAccess, getSharedFolderContents } from './shareLink.controller';

export const shareLinkRouter = Router();
shareLinkRouter.post('/', authenticate, createShareLink);
shareLinkRouter.get('/:token', getShareLink);
shareLinkRouter.get('/:token/download', downloadSharedFile);
shareLinkRouter.get('/:token/contents', getSharedFolderContents);
shareLinkRouter.post('/:token/claim', authenticate, claimSharedAccess);
