const { spawnSync } = require('child_process');
const path = require('path');
const express = require('express');

const port = process.env.PORT || '3000';
const projectRoot = path.resolve(__dirname, '..');

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

runCommand('npm', ['run', 'build:prod']);

const app = express();

app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (req.path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  }
  next();
});

app.use(express.static(path.join(projectRoot, 'dist/makertags/browser')));

app.get('*', (req, res) => {
  res.sendFile(path.join(projectRoot, 'dist/makertags/browser/index.html'));
});

app.listen(port, () => {
  console.log(`Static server running on http://localhost:${port}`);
});
