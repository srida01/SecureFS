
import dotenv from 'dotenv';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import path from 'path';
import { authRouter } from './modules/auth/auth.router';
import { fileRouter } from './modules/files/file.router';
import { folderRouter } from './modules/folders/folder.router';
import { permissionRouter } from './modules/permissions/permission.router';
import { searchRouter } from './modules/search/search.router';
import { adminRouter } from './modules/admin/admin.router';
import { auditRouter } from './modules/audit-logs/audit.router';
import { shareLinkRouter } from './modules/share-links/shareLink.router';
import { trashRouter } from './modules/trash/trash.router';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { validateEnvironment } from './utils/validateEnv';


// BigInt serialization fix
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};
dotenv.config();
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        frameAncestors: ["'self'", "http://localhost:5173"],
      },
    },
  })
);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files if using local storage
if (process.env.USE_LOCAL_STORAGE === 'true') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', fileRouter);
app.use('/api/folders', folderRouter);
app.use('/api/permissions', permissionRouter);
app.use('/api/search', searchRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/share-links', shareLinkRouter);
app.use('/api/trash', trashRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;