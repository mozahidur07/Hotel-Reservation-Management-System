import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './database.js';
import apiRouter from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

async function startServer() {
  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', apiRouter);

  if (isProd && hasDist) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: rootDir
    });
    app.use(vite.middlewares);
  }

  app.use((err, req, res, next) => {
    console.error('API Error:', err.message);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  const server = app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(` Hotel Reservation & Management System Server is running`);
    console.log(` Local URL : http://localhost:${port}`);
    console.log(` Mode      : ${isProd && hasDist ? 'Production (Static Dist)' : 'Development (Vite HMR)'}`);
    console.log(` Database  : SQLite (db/hotel.db)`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[FATAL ERROR] Port ${port} is already in use by another process.`);
      console.error(`Please terminate the process on port ${port} or free it before launching the server.\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
