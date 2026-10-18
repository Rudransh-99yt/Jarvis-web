import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';

class PromiseBarrier {
  private promise: Promise<void>;
  private resolveFn!: () => void;

  constructor() {
    this.promise = new Promise<void>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  wait(): Promise<void> {
    return this.promise;
  }

  signal(): void {
    this.resolveFn();
  }
}

async function runStage6445Tests() {
  console.log('=== [STAGE 6.4.4.5] TRANSACTION-SAFE METADATA MERGE TESTS ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-4-5-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_4_5_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Test 1: Non-conflicting metadata property changes (Disk Repository)
    // --------------------------------------------------------------------------
    {
      console.log('Test 1: Non-conflicting metadata property changes survive concurrent transaction & ordinary write...');
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Seed initial metadata
      diskRepo.mutate((state) => {
        state.meta = {
          version: 2,
          systemMode: 'normal',
          backupStatus: 'idle'
        } as any;
      });
      await diskRepo.flush();

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async () => {
        diskRepo.mutate((state) => {
          (state.meta as any).systemMode = 'maintenance';
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      });

      await barrierTxDone.wait();

      // Concurrent ordinary write outside transaction
      diskRepo.mutate((state) => {
        (state.meta as any).backupStatus = 'running';
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const memoryMeta = diskRepo.getState().meta as any;
      assert.equal(memoryMeta.systemMode, 'maintenance', 'Transaction metadata change must survive');
      assert.equal(memoryMeta.backupStatus, 'running', 'Ordinary write metadata change must survive');

      await diskRepo.flush();

      // Cold reload from disk
      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldMeta = coldRepo.getState().meta as any;
      assert.equal(coldMeta.systemMode, 'maintenance', 'Transaction metadata change must survive cold reload');
      assert.equal(coldMeta.backupStatus, 'running', 'Ordinary write metadata change must survive cold reload');

      resetActiveRepository();
      console.log('  -> PASS');
    }

    // --------------------------------------------------------------------------
    // Test 2: Same-field metadata conflict resolution policy (Transaction-wins)
    // --------------------------------------------------------------------------
    {
      console.log('\nTest 2: Same-field metadata conflict policy (Transaction-wins)...');
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      diskRepo.mutate((state) => {
        state.meta = {
          version: 2,
          status: 'ready'
        } as any;
      });
      await diskRepo.flush();

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async () => {
        diskRepo.mutate((state) => {
          (state.meta as any).status = 'busy';
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      });

      await barrierTxDone.wait();

      // Concurrent ordinary write changes same field
      diskRepo.mutate((state) => {
        (state.meta as any).status = 'standby';
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const memoryMeta = diskRepo.getState().meta as any;
      assert.equal(memoryMeta.status, 'busy', 'Transaction must win same-field metadata conflict');

      await diskRepo.flush();

      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldMeta = coldRepo.getState().meta as any;
      assert.equal(coldMeta.status, 'busy', 'Transaction win must persist across cold reload');

      resetActiveRepository();
      console.log('  -> PASS');
    }

    // --------------------------------------------------------------------------
    // Test 3: Nested metadata objects receive non-conflicting updates
    // --------------------------------------------------------------------------
    {
      console.log('\nTest 3: Nested metadata objects non-conflicting field updates...');
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      diskRepo.mutate((state) => {
        state.meta = {
          version: 2,
          config: {
            theme: 'dark',
            language: 'en',
            notifications: true
          }
        } as any;
      });
      await diskRepo.flush();

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async () => {
        diskRepo.mutate((state) => {
          (state.meta as any).config.theme = 'light';
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      });

      await barrierTxDone.wait();

      // Concurrent ordinary write changes different nested field
      diskRepo.mutate((state) => {
        (state.meta as any).config.language = 'es';
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const memoryMeta = diskRepo.getState().meta as any;
      assert.equal(memoryMeta.config.theme, 'light', 'Nested tx change must survive');
      assert.equal(memoryMeta.config.language, 'es', 'Nested ordinary write must survive');
      assert.equal(memoryMeta.config.notifications, true, 'Unchanged nested property must survive');

      await diskRepo.flush();

      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldMeta = coldRepo.getState().meta as any;
      assert.equal(coldMeta.config.theme, 'light', 'Nested tx change must survive cold reload');
      assert.equal(coldMeta.config.language, 'es', 'Nested ordinary write must survive cold reload');

      resetActiveRepository();
      console.log('  -> PASS');
    }

    // --------------------------------------------------------------------------
    // Test 4: Metadata property deletion vs concurrent update & missing/undefined
    // --------------------------------------------------------------------------
    {
      console.log('\nTest 4: Metadata deletion and missing/undefined handling...');
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      diskRepo.mutate((state) => {
        state.meta = {
          version: 2,
          deprecatedFlag: 'true',
          activeRegion: 'us-east-1'
        } as any;
      });
      await diskRepo.flush();

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async () => {
        diskRepo.mutate((state) => {
          delete (state.meta as any).deprecatedFlag;
          (state.meta as any).tier = 'premium';
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      });

      await barrierTxDone.wait();

      diskRepo.mutate((state) => {
        (state.meta as any).activeRegion = 'us-west-2';
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const memoryMeta = diskRepo.getState().meta as any;
      assert.equal('deprecatedFlag' in memoryMeta, false, 'Deleted metadata prop must be absent');
      assert.equal(memoryMeta.tier, 'premium', 'Added tx prop must be present');
      assert.equal(memoryMeta.activeRegion, 'us-west-2', 'Ordinary write prop must survive');

      await diskRepo.flush();

      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldMeta = coldRepo.getState().meta as any;
      assert.equal('deprecatedFlag' in coldMeta, false, 'Deleted metadata prop must be absent in cold reload');
      assert.equal(coldMeta.tier, 'premium', 'Added tx prop must be present in cold reload');
      assert.equal(coldMeta.activeRegion, 'us-west-2', 'Ordinary write prop must survive in cold reload');

      resetActiveRepository();
      console.log('  -> PASS');
    }

    // --------------------------------------------------------------------------
    // Test 5: Metadata rollback safety
    // --------------------------------------------------------------------------
    {
      console.log('\nTest 5: Rollback safety for metadata...');
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      diskRepo.mutate((state) => {
        state.meta = {
          version: 2,
          systemMode: 'normal'
        } as any;
      });
      await diskRepo.flush();

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async () => {
        diskRepo.mutate((state) => {
          (state.meta as any).systemMode = 'broken';
          (state.meta as any).tempFlag = true;
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
        throw new Error('Simulated transaction failure');
      }).catch(() => {
        // Expected rollback
      });

      await barrierTxDone.wait();

      diskRepo.mutate((state) => {
        (state.meta as any).lastBackupAt = '2026-10-09T22:00:00Z';
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const memoryMeta = diskRepo.getState().meta as any;
      assert.equal(memoryMeta.systemMode, 'normal', 'Rolled back metadata change must not persist');
      assert.equal('tempFlag' in memoryMeta, false, 'Rolled back metadata property addition must not leak');
      assert.equal(memoryMeta.lastBackupAt, '2026-10-09T22:00:00Z', 'Ordinary metadata write during failed tx must survive');

      await diskRepo.flush();

      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldMeta = coldRepo.getState().meta as any;
      assert.equal(coldMeta.systemMode, 'normal', 'Cold reload must confirm rolled back state');
      assert.equal(coldMeta.lastBackupAt, '2026-10-09T22:00:00Z', 'Cold reload must preserve ordinary write');

      resetActiveRepository();
      console.log('  -> PASS');
    }

    // --------------------------------------------------------------------------
    // Test 6: Memory Repository parity for metadata merging
    // --------------------------------------------------------------------------
    {
      console.log('\nTest 6: Memory repository metadata merging parity...');
      const memRepo = new MemoryJarvisDataRepository();
      await memRepo.init();
      setActiveRepository(memRepo);

      memRepo.mutate((state) => {
        state.meta = {
          version: 2,
          systemMode: 'normal',
          backupStatus: 'idle'
        } as any;
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = memRepo.runTransaction(async () => {
        memRepo.mutate((state) => {
          (state.meta as any).systemMode = 'maintenance';
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      });

      await barrierTxDone.wait();

      memRepo.mutate((state) => {
        (state.meta as any).backupStatus = 'running';
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const memoryMeta = memRepo.getState().meta as any;
      assert.equal(memoryMeta.systemMode, 'maintenance', 'Transaction metadata update must survive in memory repo');
      assert.equal(memoryMeta.backupStatus, 'running', 'Ordinary metadata update must survive in memory repo');

      resetActiveRepository();
      console.log('  -> PASS');
    }

    console.log('\n=== ALL STAGE 6.4.4.5 TESTS PASSED SUCCESSFULLY ===');
  } finally {
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }
}

runStage6445Tests().catch((err) => {
  console.error('STAGE 6.4.4.5 TEST FAILURE:', err);
  process.exit(1);
});
