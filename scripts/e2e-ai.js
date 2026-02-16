#!/usr/bin/env node
/**
 * Starts AI bots after setup completes. Run as part of e2e flow.
 * Waits a few seconds for the game to be created, then spawns AI bots.
 */
const { spawn } = require('child_process');
const path = require('path');

setTimeout(() => {
  const aiDir = path.join(__dirname, '..', 'ai');
  const child = spawn('npx', ['ts-node', 'index.ts', '8', '7'], {
    stdio: 'inherit',
    cwd: aiDir,
    shell: true,
  });
  child.on('error', (err) => {
    console.error('Failed to start AI bots:', err);
    process.exit(1);
  });
}, 3000);
