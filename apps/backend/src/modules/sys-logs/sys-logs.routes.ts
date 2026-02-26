import fs from 'node:fs';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';

export const sysLogsRoutes: FastifyPluginAsync = async (app) => {
    app.addHook('preHandler', async (req, reply) => {
        const { secret } = req.query as { secret?: string };
        if (!secret || secret !== app.ctx.env.LOG_VIEWER_SECRET) {
            return reply.code(403).send({ ok: false, message: 'Forbidden: Invalid or missing secret' });
        }
    });

    app.get('/', async (_req, reply) => {
        reply.header('Content-Type', 'text/html');
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Real-time Logs Viewer</title>
  <style>
    body { background: #1e1e1e; color: #d4d4d4; font-family: monospace; font-size: 13px; padding: 10px; margin: 0; }
    .log-line { margin: 2px 0; white-space: pre-wrap; word-wrap: break-word; }
    .error { color: #f44747; }
    .warn { color: #d7ba7d; }
    .info { color: #4ec9b0; }
    .debug { color: #9cdcfe; }
  </style>
</head>
<body>
  <div id="logs"></div>
  <script>
    const logsEl = document.getElementById('logs');
    const secret = new URLSearchParams(window.location.search).get('secret');
    const evtSource = new EventSource('/api/sys-logs/stream?secret=' + secret);
    
    evtSource.onmessage = function(event) {
      const div = document.createElement('div');
      div.className = 'log-line';
      try {
        const data = JSON.parse(event.data);
        let levelClass = 'info';
        let levelStr = 'INFO';
        if (data.level >= 50) { levelClass = 'error'; levelStr = 'ERROR'; }
        else if (data.level >= 40) { levelClass = 'warn'; levelStr = 'WARN'; }
        else if (data.level < 30) { levelClass = 'debug'; levelStr = 'DEBUG'; }
        
        const time = new Date(data.time).toLocaleTimeString();
        let text = '[' + time + '] ' + levelStr + ': ' + (data.msg || '');
        if (data.err) {
            text += '\\n  Error: ' + data.err.message;
            if (data.err.sql) text += '\\n  SQL: ' + data.err.sql;
            if (data.err.stack) text += '\\n' + data.err.stack;
        }

        // Print core request details directly as text if available
        if (data.req) {
            text += '\\n  --> ' + data.req.method + ' ' + data.req.url;
            if (data.req.query && Object.keys(data.req.query).length > 0) text += '\\n      Query: ' + JSON.stringify(data.req.query);
            if (data.req.params && Object.keys(data.req.params).length > 0) text += '\\n      Params: ' + JSON.stringify(data.req.params);
        }
        if (data.res && data.res.statusCode) {
            text += '\\n  <-- HTTP ' + data.res.statusCode;
            if (data.responseTime) text += ' (' + data.responseTime.toFixed(2) + 'ms)';
        }

        // Display additional payloads like 'body' or 'response'
        const ignoreKeys = ['level', 'time', 'pid', 'hostname', 'msg', 'err', 'req', 'res', 'v'];
        const extras = {};
        for (const k in data) {
            if (!ignoreKeys.includes(k)) {
               extras[k] = data[k];
            }
        }
        if (Object.keys(extras).length > 0) {
            text += '\\n  Payload Details:\\n' + JSON.stringify(extras, null, 2).split('\\n').map(l => '    ' + l).join('\\n');
        }

        div.textContent = text;
        div.classList.add(levelClass);
      } catch (e) {
        div.textContent = event.data;
      }
      logsEl.appendChild(div);
      window.scrollTo(0, document.body.scrollHeight);
    };
    
    evtSource.onerror = function() {
       const div = document.createElement('div');
       div.textContent = 'Connection error. Retrying...';
       div.className = 'log-line error';
       logsEl.appendChild(div);
    };
  </script>
</body>
</html>`;
    });

    app.get('/stream', (req, reply) => {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');

        // Initial connected message to keep connection alive immediately
        reply.raw.write(': connected\n\n');

        let activeLogFile = '';
        let currentSize = 0;

        const findActiveLogFile = () => {
            const logDir = path.join(process.cwd(), 'logs');
            try {
                const files = fs.readdirSync(logDir).filter(f => f.startsWith('app') && !f.endsWith('.gitignore'));
                if (files.length === 0) return '';
                files.sort((a, b) => fs.statSync(path.join(logDir, b)).mtimeMs - fs.statSync(path.join(logDir, a)).mtimeMs);

                const latest = files[0];
                if (!latest) return '';
                return path.join(logDir, latest);
            } catch (err) {
                return '';
            }
        };

        activeLogFile = findActiveLogFile();
        if (activeLogFile) {
            try {
                // Start from the current end of the file
                currentSize = fs.statSync(activeLogFile).size;
            } catch (err) { }
        }

        const interval = setInterval(() => {
            const latestFile = findActiveLogFile();

            if (!latestFile) return;

            if (latestFile !== activeLogFile) {
                // File rotated
                activeLogFile = latestFile;
                currentSize = 0;
            }

            try {
                const stat = fs.statSync(activeLogFile);
                if (stat.size > currentSize) { // New data appended
                    const stream = fs.createReadStream(activeLogFile, { start: currentSize, end: stat.size });
                    stream.on('data', chunk => {
                        const lines = chunk.toString().split('\n').filter(Boolean);
                        for (const l of lines) {
                            reply.raw.write(`data: ${l}\n\n`);
                        }
                    });
                    currentSize = stat.size;
                } else if (stat.size < currentSize) {
                    // File was truncated or rolled but kept the same name
                    currentSize = stat.size;
                }
            } catch (err) {
                // Ignore stats reading errors
            }
        }, 1000); // Check every second

        req.raw.on('close', () => {
            clearInterval(interval);
            reply.raw.end();
        });
    });
};
