'use strict';
const { execSync } = require('child_process');
const PORTS = [5000];

PORTS.forEach((PORT) => {
  try {
    let pids = [];
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8' });
      pids = [...new Set(
        output.split('\n').map(l => l.trim())
          .filter(l => l.includes(`:${PORT} `))
          .map(l => l.split(/\s+/).pop())
          .filter(p => p && p !== '0' && /^\d+$/.test(p))
      )];
    } else {
      const output = execSync(`lsof -ti tcp:${PORT}`, { encoding: 'utf8' });
      pids = output.split('\n').map(p => p.trim()).filter(p => /^\d+$/.test(p));
    }
    pids.forEach(pid => {
      try {
        execSync(process.platform === 'win32' ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`, { stdio: 'ignore' });
        console.log(`[predev] Killed PID ${pid} on port ${PORT}`);
      } catch (_) {}
    });
    if (pids.length === 0) console.log(`[predev] Port ${PORT} is free.`);
  } catch (_) {
    console.log(`[predev] Port ${PORT} is free.`);
  }
});
