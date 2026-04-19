import { logger } from './logger';

export const validateEnvironment = () => {
  const requiredVars = [
    'CLERK_SECRET_KEY',
    'DATABASE_URL',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables', {
      missing,
      hint: 'Copy .env.example to .env and fill in the values',
    });
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  logger.info('Environment validation passed', {
    clerkConfigured: !!process.env.CLERK_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
};
