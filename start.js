#!/usr/bin/env node

// Startup script for Cloud Run with Next.js standalone
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`🚀 Starting Holitime app on ${hostname}:${port}...`);
console.log(`Environment: ${process.env.NODE_ENV}`);

// For production, use the standalone server
if (!dev) {
  // In standalone mode, Next.js creates a server.js file
  try {
    require('./server.js');
  } catch (error) {
    console.error('❌ Failed to start standalone server:', error);
    console.log('Falling back to Next.js server...');
    
    // Fallback to regular Next.js server
    const app = next({ dev, hostname, port });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Error occurred handling', req.url, err);
          res.statusCode = 500;
          res.end('internal server error');
        }
      }).listen(port, hostname, (err) => {
        if (err) throw err;
        console.log(`✅ Ready on http://${hostname}:${port}`);
      });
    });
  }
} else {
  // Development mode
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`✅ Ready on http://${hostname}:${port}`);
    });
  });
}