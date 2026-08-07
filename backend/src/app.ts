import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { correlationMiddleware } from './middleware/correlationMiddleware';
import { helmetSecurity, globalRateLimiter } from './middleware/securityMiddleware';

const app = express();

// Security & Correlation Middlewares
app.use(correlationMiddleware);
app.use(helmetSecurity);
app.use(globalRateLimiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// JSON & URL-encoded Body Parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API Version 1 Router
app.use('/api/v1', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
