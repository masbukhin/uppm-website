import { spawn } from 'node:child_process';
import process from 'node:process';

const children = new Set();
let stopping = false;

function start(label, args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  children.add(child);
  child.on('exit', code => {
    children.delete(child);
    if (stopping) return;
    if (code !== 0) console.error(`${label} berhenti dengan kode ${code}.`);
    stop(code || 0);
  });
}

function stop(code = 0) {
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 100).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
start('Backend', ['server/index.mjs']);
start('Frontend', ['node_modules/vite/bin/vite.js', '--port=3000', '--host=0.0.0.0']);
