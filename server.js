const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
const port = Number(process.env.PORT) || 3000;
const httpsKeyPath = process.env.HTTPS_KEY_PATH;
const httpsCertPath = process.env.HTTPS_CERT_PATH;
const useHttps = Boolean(httpsKeyPath && httpsCertPath);

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (useHttps) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/contact', (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const company = typeof req.body.company === 'string' ? req.body.company.trim() : '';
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !emailPattern.test(email) || !message) {
    return res.status(400).json({ error: 'Please provide a name, valid email, and project details.' });
  }

  console.log(`New enquiry from ${name} <${email}>${company ? ` at ${company}` : ''}`);
  console.log(`Project details: ${message}`);

  return res.status(201).json({
    message: 'Thanks. Your project details are in, and we will be in touch shortly.'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(currentPort) {
  let server;
  if (useHttps) {
    if (!fs.existsSync(httpsKeyPath) || !fs.existsSync(httpsCertPath)) {
      throw new Error('HTTPS_KEY_PATH and HTTPS_CERT_PATH must point to existing certificate files.');
    }
    server = https.createServer({
      key: fs.readFileSync(httpsKeyPath),
      cert: fs.readFileSync(httpsCertPath)
    }, app).listen(currentPort, onStarted);
  } else {
    server = http.createServer(app).listen(currentPort, onStarted);
  }

  function onStarted() {
    const protocol = useHttps ? 'https' : 'http';
    const url = `${protocol}://localhost:${currentPort}`;
    console.log(`Pryvexa Technologies running at ${url}`);

    if (process.platform === 'win32') {
      exec(`start "" "${url}"`);
    }
  }

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${currentPort} is busy. Trying port ${currentPort + 1}...`);
      startServer(currentPort + 1);
      return;
    }

    throw error;
  });
}

startServer(Number(port));
