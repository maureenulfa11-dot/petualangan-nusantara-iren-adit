import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function waitUntil(read, message, timeout = 5500) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = read();
    if (value) return value;
    await delay(35);
  }
  throw new Error('Timed out: ' + message);
}

export async function startWorker(t) {
  if (process.env.NUSANTARA_URL) return process.env.NUSANTARA_URL;
  const storage = await mkdtemp(join(tmpdir(), 'nusantara-worker-'));
  const worker = await launchWorker(t, storage);
  t.after(() => rm(storage, { recursive: true, force: true }));
  return worker.url;
}

export async function launchWorker(t, storage) {
  const processWorker = spawn(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js', 'dev', '--ip', '127.0.0.1', '--port', '0', '--persist-to', storage,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  let log = '';
  processWorker.stdout.on('data', chunk => { log += chunk; });
  processWorker.stderr.on('data', chunk => { log += chunk; });
  const stop = async () => {
    if (processWorker.exitCode === null && processWorker.signalCode === null) {
      processWorker.kill('SIGTERM');
      await Promise.race([once(processWorker, 'exit'), delay(1200)]);
      if (processWorker.exitCode === null && processWorker.signalCode === null) processWorker.kill('SIGKILL');
    }
  };
  t.after(stop);
  try {
    const url = await waitUntil(() => /Ready on (http:\/\/127\.0\.0\.1:\d+)/.exec(log)?.[1], 'Wrangler startup', 32_000);
    return { url, stop };
  } catch (error) {
    throw new Error(error.message + '\n' + log.slice(-2600));
  }
}
