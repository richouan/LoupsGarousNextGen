import path from 'path';
import dotenv from 'dotenv';

// Load .env file only in local development (Heroku uses Config Vars natively)
try { dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); } catch {}

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import guildsRoutes from './routes/guilds.routes';
import cardsRoutes from './routes/cards.routes';
import botRoutes from './routes/bot.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();
const PORT = process.env.PORT || 3001;

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
    // Allow same-origin requests (no origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // permissive in production for now
    }
  },
  credentials: true
}));
app.use(express.json());

// Serve uploads directory statically so frontend and Discord can access images
app.use('/uploads', express.static(path.resolve(__dirname, '../../../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildsRoutes);
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
