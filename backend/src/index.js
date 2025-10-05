import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import http from 'http';
import { connectDB } from './config/database.js';
import { initializeKubernetes } from './config/kubernetes.js';
import { initializeWebSocket } from './services/websocketService.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import resourcesRoutes from './routes/resources.js';
import userRoutes from './routes/user.js';
import dashboardRoutes from './routes/dashboard.js';
import resourceManagerRoutes from './routes/resource-manager.js';
import monitoringRoutes from './routes/monitoring.js';
import workloadsRoutes from './routes/workloads.js';
import securityRoutes from './routes/security.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy headers (configured for Kubernetes environment)
app.set('trust proxy', 1);

// Rate limiting - Skip WebSocket paths to prevent blocking WebSocket connections
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for WebSocket endpoints
  skip: (req) => {
    return req.path.startsWith('/ws') || req.headers.upgrade === 'websocket';
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://dashboard.grepmind.com',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// General middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resource-manager', resourceManagerRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/workloads', workloadsRoutes);
app.use('/api/security', securityRoutes);

// WebSocket endpoint handler - Allow WebSocket upgrade requests to pass through
app.get('/ws/monitoring', (req, res) => {
  // This route allows the WebSocket upgrade to be handled by the WebSocket server
  // If this is not a WebSocket upgrade request, return an informational message
  if (req.headers.upgrade !== 'websocket') {
    res.status(426).json({
      error: 'Upgrade Required',
      message: 'This endpoint requires WebSocket connection. Use ws://dashboard.grepmind.com/ws/monitoring',
      upgradeRequired: true
    });
  } else {
    // This should not be reached as the WebSocket server should handle upgrade requests
    res.status(500).json({
      error: 'WebSocket upgrade failed',
      message: 'WebSocket server should handle this request'
    });
  }
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist.`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected successfully');

    // Initialize Kubernetes API client
    await initializeKubernetes();
    logger.info('Kubernetes API client initialized successfully');

    // Create HTTP server for both Express and WebSocket
    const server = http.createServer(app);

    // Initialize WebSocket server
    initializeWebSocket(server);
    logger.info('WebSocket server initialized successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 GrepMind-Dashboard Backend Server running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
      logger.info(`📊 Health check: http://dashboard.grepmind.com/api/health`);
      logger.info(`☸️  Kubernetes monitoring API ready`);
      logger.info(`🔌 WebSocket monitoring available at ws://dashboard.grepmind.com/ws/monitoring`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;
