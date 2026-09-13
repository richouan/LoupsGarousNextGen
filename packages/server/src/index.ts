import path from 'path';
import dotenv from 'dotenv';

// Load .env file only in local development (Heroku uses Config Vars natively)
try { dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); } catch {}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import guildsRoutes from './routes/guilds.routes';
import cardsRoutes from './routes/cards.routes';
import botRoutes from './routes/bot.routes';
import uploadRoutes from './routes/upload.routes';
import livePartieRoutes from './routes/livePartie.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind Heroku load balancer
app.set('trust proxy', 1);

// SEC-06 FIX: Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Canonical redirect: www.loupgarou.online -> loupgarou.online
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.loupgarou.online')) {
    return res.redirect(301, `https://loupgarou.online${req.originalUrl}`);
  }
  next();
});

// Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://loupsgarous-nextgen-1b6fe20f22bd.herokuapp.com',
  'https://loupgarou.online',
  'https://www.loupgarou.online'
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no origin header, e.g. same-host frontend or internal requests) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Blocked by CORS policy: Origin ${origin} is not allowed`));
  },
  credentials: true
}));

// SEC-04 FIX: Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Veuillez patienter avant de réessayer.' }
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: '1mb' }));

// Serve uploads directory statically so frontend and Discord can access images
app.use('/uploads', express.static(path.resolve(__dirname, '../../../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildsRoutes);
app.use('/api/guilds', livePartieRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/upload', uploadRoutes);

// Serve the dashboard statically in production
const dashboardPath = path.resolve(__dirname, '../../../../packages/dashboard/dist');
app.use(express.static(dashboardPath));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Loup-Garou Engine Backend API',
    timestamp: new Date().toISOString()
  });
});

// Fallback for React Router (must be after API routes and static files)
app.get('*', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🐺 [Loup-Garou Engine Server] API running on http://localhost:${PORT}`);
  console.log(`✨ Ready to serve bot and management dashboard`);
});
