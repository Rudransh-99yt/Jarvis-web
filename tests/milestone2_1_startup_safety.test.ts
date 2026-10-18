import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import type { Server } from 'node:http';
import {
  jarvisData,
  getActiveRepository,
  setActiveRepository,
  resetActiveRepository,
  DiskJarvisDataRepository,
  createRepository
} from '../server/data/index.ts';
import { app, startServer } from '../server.ts';

async function runStartupSafetyTests() {
  console.log('\n=== [JARVIS] MILESTONE 2.1 SERVER STARTUP SAFETY TEST SUITE ===');

  const defaultDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const dbBeforeStat = fs.existsSync(defaultDbPath) ? fs.statSync(defaultDbPath) : null;
  const dbBeforeContent = fs.existsSync(defaultDbPath) ? fs.readFileSync(defaultDbPath, 'utf8') : null;

  // Set up isolated scratch directory in tmp/
  const tmpDir = path.resolve(process.cwd(), 'tmp', `startup-safety-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const isolatedDbPath = path.join(tmpDir, 'jarvis-db.json');

  if (fs.existsSync(defaultDbPath)) {
    fs.copyFileSync(defaultDbPath, isolatedDbPath);
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Persistence initialization failure aborts startup and prevents app.listen()
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Persistence initialization failure prevents app.listen() ---');
    {
      const simulatedError = new Error('SIMULATED_PERSISTENCE_HARD_FAILURE');

      // Create a mock repository that fails upon init()
      const failingRepo = {
        storagePath: '/mock/fail/path',
        init: async () => {
          throw simulatedError;
        },
        seed: async () => {},
        flush: async () => {},
        getStoragePath: () => '/mock/fail/path'
      } as any;

      setActiveRepository(failingRepo);

      // Track whether app.listen or process.exit are called
      let listenCalled = false;
      const originalListen = app.listen;
      app.listen = ((...args: any[]) => {
        listenCalled = true;
        return originalListen.apply(app, args as any);
      }) as any;

      let exitCalled = false;
      const originalExit = process.exit;
      (process as any).exit = ((code?: number) => {
        exitCalled = true;
        throw new Error(`process.exit(${code}) called unexpectedly`);
      }) as any;

      let caughtError: any = null;
      try {
        await startServer(0, '127.0.0.1');
      } catch (err) {
        caughtError = err;
      } finally {
        app.listen = originalListen;
        process.exit = originalExit;
      }

      assert.ok(caughtError, 'startServer() must throw or reject when persistence initialization fails');
      assert.equal(caughtError, simulatedError, 'The exact initialization error must be propagated to caller');
      assert.equal(listenCalled, false, 'app.listen() must NEVER be called if persistence initialization fails');
      assert.equal(exitCalled, false, 'process.exit() must NOT be called inside reusable startServer() function');
      console.log('✔ Passed: Initialization failure halted startup without calling app.listen() or process.exit()');
    }

    // -------------------------------------------------------------------------
    // TEST 2: Real application entry-point executes fatal handler upon persistence failure
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Real application entry-point executes fatal handler upon persistence failure ---');
    {
      const test2Dir = path.resolve(process.cwd(), 'tmp', `startup-entrypoint-fail-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
      fs.mkdirSync(test2Dir, { recursive: true });

      try {
        // Create a regular file to serve as a blocker path (cannot be traversed as a directory)
        const blockerFile = path.join(test2Dir, 'blocker.txt');
        fs.writeFileSync(blockerFile, 'blocking file - not a directory', 'utf8');

        // Target an invalid DB path nested inside the regular file to trigger deterministic ENOTDIR
        const invalidDbPath = path.join(blockerFile, 'nested', 'jarvis-db.json');

        const tsxBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'tsx');
        const serverFile = path.resolve(process.cwd(), 'server.ts');

        const child = spawn(tsxBin, [serverFile], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            PATH: `${path.dirname(process.execPath)}:${process.env.PATH || ''}`,
            JARVIS_DB_PATH: invalidDbPath
          }
        });

        let timedOut = false;
        const timeoutHandle = setTimeout(() => {
          timedOut = true;
          child.kill('SIGKILL');
        }, 15000);

        let stderr = '';
        let stdout = '';
        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });

        const exitCode = await new Promise<number | null>((resolve) => {
          child.on('close', (code) => {
            clearTimeout(timeoutHandle);
            resolve(code);
          });
        });

        assert.equal(timedOut, false, 'The child process must terminate within a reasonable timeout (15s)');
        assert.equal(exitCode, 1, 'Child-process exit status must be exactly 1');
        assert.ok(
          stderr.includes('[Web Jarvis] Core persistence initialization failed:'),
          `Standard error must contain '[Web Jarvis] Core persistence initialization failed:'. Got:\n${stderr}`
        );
        assert.ok(
          stderr.includes('[Web Jarvis] Failed to start server:'),
          `Standard error must contain '[Web Jarvis] Failed to start server:'. Got:\n${stderr}`
        );
        assert.ok(
          stderr.includes('ENOTDIR'),
          `Standard error must contain 'ENOTDIR'. Got:\n${stderr}`
        );
        console.log('✔ Passed: Real entry point terminated with code 1, ENOTDIR, and proper fatal error logs');
      } finally {
        if (fs.existsSync(test2Dir)) {
          try {
            fs.rmSync(test2Dir, { recursive: true, force: true });
          } catch {}
        }
      }
    }

    // -------------------------------------------------------------------------
    // TEST 3: Normal startup still works with healthy persistence
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Normal server startup still functions properly ---');
    {
      // Ensure isolated test repository is active
      const isolatedRepo = new DiskJarvisDataRepository(isolatedDbPath);
      setActiveRepository(isolatedRepo);

      // Start on ephemeral port with local loopback binding
      let server: Server | null = null;
      try {
        server = await startServer(0, '127.0.0.1');
        assert.ok(server, 'startServer() must return the listening Server instance');
        assert.equal(server.listening, true, 'Server must be actively listening');

        const address = server.address();
        assert.ok(address && typeof address !== 'string', 'Server address must be an AddressInfo object');
        const ephemeralPort = (address as any).port;
        assert.ok(ephemeralPort > 0, `Ephemeral port must be > 0 (got ${ephemeralPort})`);

        // Test HTTP health check against ephemeral port
        const res = await fetch(`http://127.0.0.1:${ephemeralPort}/api/health`);
        assert.ok(res.status === 200 || res.status === 503, `Health endpoint must respond (got ${res.status})`);
        const json = await res.json();
        assert.ok(json.timestamp, 'Health response must contain timestamp');
        console.log(`✔ Server successfully bound to port ${ephemeralPort} and responded to health check`);
      } finally {
        if (server) {
          await new Promise<void>((resolve, reject) => {
            server!.close((err) => (err ? reject(err) : resolve()));
          });
          assert.equal(server.listening, false, 'Server must be stopped after close()');
          console.log('✔ Server cleanly closed');
        }
      }
    }

    // -------------------------------------------------------------------------
    // TEST 4: Integrity check on real project database
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Real database integrity verification ---');
    if (dbBeforeStat && dbBeforeContent) {
      const dbAfterStat = fs.statSync(defaultDbPath);
      const dbAfterContent = fs.readFileSync(defaultDbPath, 'utf8');
      assert.equal(
        dbAfterContent,
        dbBeforeContent,
        'data/jarvis-db.json content must not have been modified by test run'
      );
      console.log('✔ Verified: data/jarvis-db.json remained completely untouched');
    }

    console.log('\n=== ALL MILESTONE 2.1 STARTUP SAFETY TESTS PASSED ===\n');
  } finally {
    resetActiveRepository();
    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

runStartupSafetyTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ STARTUP SAFETY TEST SUITE FAILED:', err);
    process.exit(1);
  });
