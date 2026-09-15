const { execSync } = require('child_process');

function freePort(port) {
  if (!port) return;
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = output.split('\n').filter(Boolean);
      const pids = new Set();
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const localAddr = parts[1];
          const pid = parts[parts.length - 1];
          if (
            (localAddr.endsWith(`:${port}`) || localAddr.includes(`:${port}`)) &&
            pid &&
            pid !== '0' &&
            !isNaN(Number(pid))
          ) {
            pids.add(pid);
          }
        }
      });
      pids.forEach((pid) => {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[FreePort] Đã giải phóng PID ${pid} đang chiếm port ${port}`);
        } catch (e) {
          // Process already closed or permission denied
        }
      });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`[FreePort] Đã giải phóng port ${port}`);
    }
  } catch (e) {
    // Port is free or netstat returned nothing
  }
}

const ports = process.argv.slice(2).map((p) => parseInt(p, 10)).filter((p) => !isNaN(p));
if (ports.length === 0) {
  ports.push(3001, 5173);
}
ports.forEach(freePort);
