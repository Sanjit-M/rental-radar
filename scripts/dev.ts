import { spawn, ChildProcess } from 'node:child_process';

console.log('='.repeat(60));
console.log(' 🚀 Starting Rental Radar Unified Dev Stack');
console.log(' 📡 1. Backend API: http://127.0.0.1:3001');
console.log(' 🖥️ 2. Frontend & Mobile Prototype: http://localhost:3000');
console.log('='.repeat(60));

const processes: ChildProcess[] = [];

// 1. Launch Backend Server
const serverProc = spawn('npx', ['tsx', 'src/server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3001' },
});
processes.push(serverProc);

// 2. Launch Vite Dev Server
const viteProc = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
});
processes.push(viteProc);

function shutdown() {
  console.log('\n🛑 Shutting down development servers...');
  for (const proc of processes) {
    if (proc && !proc.killed) {
      try {
        proc.kill('SIGTERM');
      } catch {}
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
