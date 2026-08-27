import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createServer, Server as HttpServer } from 'http';

import { env, apiPrefix } from './config/env';
import { prisma } from './config/db';
import routes from './routes/index';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initSocketServer } from './services/socketService';

const app = express();
const httpServer: HttpServer = createServer(app);

app.use(helmet());
// Parse CORS origins (comma-separated or single value)
const corsOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow any localhost port
      if (env.NODE_ENV === 'development' && origin.match(/^http:\/\/localhost:\d+$/)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(globalRateLimiter);
app.set('trust proxy', 1);

app.use(apiPrefix, routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SuperLink ISP CRM API',
    data: {
      version: env.API_VERSION,
      docs: `${apiPrefix}/health`,
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    // Initialize Socket.io
    initSocketServer(httpServer);

    httpServer.listen(PORT, () => {
      console.log('\nSuperLink ISP CRM API');
      console.log(`   Environment : ${env.NODE_ENV}`);
      console.log(`   Port        : ${PORT}`);
      console.log(`   API prefix  : ${apiPrefix}`);
      console.log(`   CORS origin : ${env.CORS_ORIGIN}`);
      console.log(`   Health      : http://localhost:${PORT}${apiPrefix}/health`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
