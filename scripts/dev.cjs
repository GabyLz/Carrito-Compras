const { spawn } = require('child_process');

const nodeExec = process.execPath;
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('No se encontro npm_execpath en el entorno.');
  process.exit(1);
}

function start(name, args) {
  const child = spawn(nodeExec, [npmCli, ...args], { stdio: 'inherit' });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] finalizo con codigo ${code}`);
      process.exitCode = code;
    }
  });

  child.on('error', (err) => {
    console.error(`[${name}] error al iniciar:`, err);
    process.exitCode = 1;
  });

  return child;
}

const backend = start('backend', ['run', 'dev', '--workspace=backend']);
const frontend = start('frontend', ['run', 'dev', '--workspace=frontend']);

function shutdown() {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
