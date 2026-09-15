const { execFileSync, spawn } = require('child_process');
const { randomUUID } = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
try {
  require('dotenv').config({ path: path.join(projectRoot, '.env') });
} catch {
  // Ignore if dotenv not loaded
}
const lockPath = path.join(projectRoot, '.dev-server.pid');
const marker = 'thaco-agri-backend-dev';
const port = 3001;
const instanceId = randomUUID();
let child;

function isRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function commandLine(pid) {
  try {
    if (process.platform === 'win32') {
      return execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue).CommandLine`],
        { encoding: 'utf8', windowsHide: true },
      ).trim();
    }
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function processInfo(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    if (process.platform === 'win32') {
      const output = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command',
          `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue; ` +
          'if ($process) { $process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress }'],
        { encoding: 'utf8', windowsHide: true },
      ).trim();
      return output ? JSON.parse(output) : null;
    }
    const output = execFileSync(
      'ps',
      ['-p', String(pid), '-o', 'pid=,ppid=,command='],
      { encoding: 'utf8' },
    ).trim();
    const match = output.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/s);
    return match ? {
      ProcessId: Number(match[1]),
      ParentProcessId: Number(match[2]),
      CommandLine: match[3],
    } : null;
  } catch {
    return null;
  }
}

function portOwnerPid() {
  try {
    if (process.platform === 'win32') {
      const output = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command',
          `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ` +
          'Select-Object -First 1 -ExpandProperty OwningProcess)'],
        { encoding: 'utf8', windowsHide: true },
      ).trim();
      const pid = Number(output);
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    }
    const output = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    }).trim().split(/\s+/)[0];
    const pid = Number(output);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function findProjectWatcher(pid) {
  const normalizedRoot = projectRoot.toLowerCase();
  const visited = new Set();
  let currentPid = pid;

  for (let depth = 0; depth < 8 && currentPid && !visited.has(currentPid); depth += 1) {
    visited.add(currentPid);
    const info = processInfo(currentPid);
    if (!info) return null;
    const command = String(info.CommandLine || '').toLowerCase();
    const isNestWatcher = command.includes('nest.js') &&
      command.includes('start') && command.includes('--watch');
    if (isNestWatcher && command.includes(normalizedRoot)) {
      return Number(info.ProcessId);
    }
    currentPid = Number(info.ParentProcessId);
  }
  return null;
}

function terminateTree(pid) {
  if (!isRunning(pid)) return;
  if (process.platform === 'win32') {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  process.kill(pid, 'SIGTERM');
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

function removeLockIfOwned() {
  const lock = readLock();
  if (lock?.instanceId === instanceId) {
    try { fs.unlinkSync(lockPath); } catch {}
  }
}

function portIsBusy() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPortToClose() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await portIsBusy())) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function stopPreviousRunner() {
  const lock = readLock();
  if (!lock?.pid || lock.pid === process.pid || !isRunning(lock.pid)) return;
  const previousCommand = commandLine(lock.pid);
  if (!previousCommand.includes(marker)) {
    console.warn(`[DevServer] Bỏ qua PID ${lock.pid}: lock cũ không thuộc backend này.`);
    return;
  }
  console.log(`[DevServer] Dừng watcher cũ PID ${lock.pid} và toàn bộ process con...`);
  terminateTree(lock.pid);
  if (!(await waitForPortToClose())) {
    throw new Error(`Watcher cũ đã dừng nhưng cổng ${port} chưa được giải phóng.`);
  }
}

async function stopOrphanedProjectWatcher() {
  const ownerPid = portOwnerPid();
  if (!ownerPid) return false;
  const watcherPid = findProjectWatcher(ownerPid);
  if (!watcherPid) return false;

  console.log(`[DevServer] Phat hien watcher cu PID ${watcherPid} bi mat lock; dang dung cay process...`);
  terminateTree(watcherPid);
  if (!(await waitForPortToClose())) {
    throw new Error(`Watcher cu da dung nhung cong ${port} chua duoc giai phong.`);
  }
  return true;
}

async function main() {
  await stopPreviousRunner();
  if (await portIsBusy()) await stopOrphanedProjectWatcher();
  if (await portIsBusy()) {
    throw new Error(
      `Cổng ${port} đang do một chương trình khác sử dụng. ` +
      'Không tự động tắt vì process đó không được xác nhận là watcher của backend này.',
    );
  }

  fs.writeFileSync(lockPath, JSON.stringify({
    pid: process.pid,
    instanceId,
    marker,
    projectRoot,
    startedAt: new Date().toISOString(),
  }, null, 2));

  const nestCli = require.resolve('@nestjs/cli/bin/nest.js');
  const args = [nestCli, 'start', '--watch'];
  if (process.argv.includes('--debug')) args.push('--debug');
  child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });

  child.once('exit', (code, signal) => {
    removeLockIfOwned();
    if (signal) console.log(`[DevServer] Nest watcher đã dừng bởi ${signal}.`);
    process.exitCode = code ?? 0;
  });
  child.once('error', (error) => {
    removeLockIfOwned();
    console.error('[DevServer] Không thể khởi động Nest watcher:', error.message);
    process.exitCode = 1;
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    if (child && !child.killed) child.kill(signal);
    removeLockIfOwned();
  });
}
process.once('exit', removeLockIfOwned);

main().catch((error) => {
  removeLockIfOwned();
  console.error(`[DevServer] ${error.message}`);
  process.exitCode = 1;
});
