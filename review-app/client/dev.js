const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

const binName = process.platform === 'win32' ? 'vite.cmd' : 'vite';
const viteBin = path.join(__dirname, 'node_modules', '.bin', binName);

if (!fs.existsSync(viteBin)) {
  console.error('Vite binary not found at:', viteBin);
  console.error('Run: npm install');
  process.exit(1);
}

const child = spawn(viteBin, args, {
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
