import express from 'express';
import path from 'node:path';
import { initDatabase } from './server/db';
import { authRouter } from './server/routes/auth';
import { dataRouter } from './server/routes/data';
import { adminRouter } from './server/routes/admin';

// Initialize production database & default super admin
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/data', dataRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // In production, serve built frontend assets from dist
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In development, integrate Vite middlewares for HMR
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(PORT),
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✓ Self Reporting Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
