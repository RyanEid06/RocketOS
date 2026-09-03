// scripts/dev-native-core.ts
// Local one-command development runner: launches Rocket Core Host + Vite UI
// Usage: npm run dev:native-core

import { spawn } from 'child_process';
import http from 'http';
import crypto from 'crypto';
import { createRocketCoreHost } from '../rocket/core-host/server';

async function main() {
  const host = '127.0.0.1';
  const port = 5180;
  const token = `rocket_dev_${crypto.randomBytes(16).toString('hex')}`;

  console.log('==================================================');
  console.log('🚀 RocketOS — Starting Localhost Rocket Core Mode');
  console.log('Core Host: http://127.0.0.1:5180');
  console.log(`Session Token: ${token.substring(0, 15)}...`);
  console.log('==================================================');

  // 1. Launch Rocket Core Host
  let coreInstance: Awaited<ReturnType<typeof createRocketCoreHost>>;
  try {
    coreInstance = await createRocketCoreHost({
      host,
      port,
      authToken: token,
      silent: false,
    });
  } catch (err) {
    console.error('Failed to start Rocket Core Host:', err);
    process.exit(1);
  }

  // 2. Poll /core/v1/ping to verify health
  await new Promise<void>((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get(
        `http://${host}:${port}/core/v1/ping`,
        { headers: { 'X-Rocket-Token': token } },
        (res) => {
          if (res.statusCode === 200) {
            clearInterval(interval);
            console.log('✓ Rocket Core Host is ready and verified.');
            resolve();
          }
        }
      );
      req.on('error', () => {
        if (attempts > 30) {
          clearInterval(interval);
          reject(new Error('Rocket Core Host health check timed out'));
        }
      });
    }, 100);
  });

  // 3. Launch Vite UI with environment variables
  console.log('Starting Vite development server with Native Rocket Core...');
  const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_ROCKET_CORE_URL: `http://${host}:${port}`,
      VITE_ROCKET_CORE_TOKEN: token,
    },
  });

  const cleanup = async () => {
    console.log('\nShutting down RocketOS development host...');
    try {
      viteProcess.kill('SIGTERM');
      await coreInstance.stop();
    } catch {
      // ignore errors on exit
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  viteProcess.on('exit', cleanup);
}

main().catch((err) => {
  console.error('Dev Native Core failed:', err);
  process.exit(1);
});
