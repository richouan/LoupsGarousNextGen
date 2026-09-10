import path from 'path';
import dotenv from 'dotenv';

// Configure dotenv immediately before importing route modules that read process.env at evaluation time
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import guildsRoutes from './routes/guilds.routes';
import cardsRoutes from './routes/cards.routes';
import botRoutes from './routes/bot.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Serve uploads directory statically so frontend and Discord can access images
app.use('/uploads', express.static(path.resolve(__dirname, '../../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Loup-Garou Engine Backend API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🐺 [Loup-Garou Engine Server] API running on http://localhost:${PORT}`);
  console.log(`✨ Ready to serve bot and management dashboard`);
});
