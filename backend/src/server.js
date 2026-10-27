import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

import db, { initDatabase } from './db/db.js';
import { JWT_SECRET } from './middleware/auth.js';
import { eventManager } from './events/eventManager.js';
import authRoutes from './routes/auth.js';
import authorRoutes from './routes/author.js';
import adminRoutes from './routes/admin.js';
import docsRoutes from './routes/docs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static mock uploads
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 as alive');
    res.json({
      status: 'ok',
      service: 'BookLeaf Portal API',
      database: rows[0]?.alive === 1 ? 'connected (MySQL)' : 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Real-Time Server-Sent Events (SSE) Route
app.get('/api/events', (req, res) => {
  const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) {
    return res.status(401).json({ error: 'Token required for real-time stream' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    eventManager.addClient(res, user);
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/author', authorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/docs', docsRoutes);

// Serve frontend production build if dist directory exists
const distPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

// SPA Catch-all for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    console.log('[BookLeaf Server] MySQL schema initialized successfully.');
    app.listen(PORT, () => {
      console.log(`[BookLeaf Server] Running on http://localhost:${PORT}`);
      console.log(`[BookLeaf Server] API documentation available at http://localhost:${PORT}/api/docs/spec`);
    });
  } catch (err) {
    console.error('[BookLeaf Server] Failed to initialize database:', err.message);
    process.exit(1);
  }
}

startServer();
