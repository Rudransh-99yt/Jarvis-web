import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { personalNotesStore } from '../server/personal/tools/personalNotesStore.ts';
import { personalIdentityStore } from '../server/personal/identityStore.ts';

/**
 * Deterministic Promise Barrier for controlling async execution flow in tests
 * without relying on arbitrary sleep durations.
 */
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

async function runStage6441Tests() {
  console.log('=== [STAGE 6.4.4.1] TRANSACTION ISOLATION & FLUSH HARDENING TEST SUITE ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-4-1-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_4_1_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Section 1: Transaction Isolation (Ordinary Writes During Paused Transactions)
    // --------------------------------------------------------------------------
    console.log('--- Section 1: Transaction Isolation for Concurrent Ordinary Writes ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const barrierTxFirstMutationDone = new PromiseBarrier();
      const barrierOrdinaryWriteDone = new PromiseBarrier();

      let txErrorCaught = false;

      // Start asynchronous transaction
      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Step 1: Perform mutation inside transaction
        await txRepo.personalStudy.createNote({
          userId: 'student-1',
          title: 'Transaction Note 1',
          content: 'This note is created inside active transaction.'
        });

        // Signal that Tx first mutation is complete
        barrierTxFirstMutationDone.signal();

        // Pause transaction until ordinary write is completed
        await barrierOrdinaryWriteDone.wait();

        // Step 2: Force transaction to fail
        throw new Error('FORCED_TRANSACTION_FAILURE_STAGE_6_4_4_1');
      }, { name: 'test-isolation-tx', userId: 'student-1' }).catch((err) => {
        if (err.message === 'FORCED_TRANSACTION_FAILURE_STAGE_6_4_4_1') {
          txErrorCaught = true;
        }
      });

      // Wait until transaction performs its first mutation
      await barrierTxFirstMutationDone.wait();

      // Perform an ordinary, non-transactional write while transaction is paused
      const ordinaryNote = await personalNotesStore.createNote('student-1', {
        title: 'Ordinary Unrelated Note Outside Tx',
        content: 'This ordinary note was created outside runTransaction.'
      });

      assert.ok(ordinaryNote.id, 'Ordinary note must be created successfully');

      // Unpause transaction so it fails
      barrierOrdinaryWriteDone.signal();

      // Await transaction completion (rejection)
      await txPromise;
      assert.ok(txErrorCaught, 'Transaction must fail as intended');

      // Verify that ordinary write is NOT rolled back or lost
      const currentNotes = await personalNotesStore.getNotes('student-1');
      assert.ok(
        currentNotes.some((n) => n.title === 'Ordinary Unrelated Note Outside Tx'),
        'Ordinary note created outside transaction MUST be preserved'
      );
      assert.ok(
        !currentNotes.some((n) => n.title === 'Transaction Note 1'),
        'Transaction note MUST be discarded upon rollback'
      );

      // Reload disk repository from file to verify persistence
      await diskRepo.flush();
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const reloadedNotes = await diskRepoReload.personalStudy.listNotes('student-1');
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Ordinary Unrelated Note Outside Tx'),
        'Ordinary note MUST exist on disk after cold reload'
      );
      assert.ok(
        !reloadedNotes.some((n) => n.title === 'Transaction Note 1'),
        'Rolled-back transaction note MUST NOT exist on disk'
      );

      console.log('[PASS] 1.1 Ordinary writes outside transaction remain isolated and are preserved on rollback');
    }

    // --------------------------------------------------------------------------
    // Section 2: Flush Pipeline Re-entrancy & Concurrent Mutations During Flush
    // --------------------------------------------------------------------------
    console.log('\n--- Section 2: Flush Pipeline Re-entrancy & Concurrent Mutations During Flush ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Perform mutation 1
      await personalNotesStore.createNote('student-1', {
        title: 'Flush Mutation A',
        content: 'Content A'
      });

      const writeBarrier = new PromiseBarrier();
      const originalWriteFile = fs.promises.writeFile;

      let writeFileIntercepted = false;

      // Intercept fs.promises.writeFile to pause mid-flush
      fs.promises.writeFile = async (path: any, data: any, options: any) => {
        if (typeof path === 'string' && path.includes('.tmp')) {
          writeFileIntercepted = true;
          await writeBarrier.wait();
        }
        return originalWriteFile.call(fs.promises, path, data, options);
      };

      try {
        // Trigger Flush 1
        const flush1Promise = diskRepo.flush();

        // While Flush 1 is paused in writeFile, perform Mutation B
        const mutationBPromise = personalNotesStore.createNote('student-1', {
          title: 'Flush Mutation B During Active Flush',
          content: 'Content B'
        });

        // Trigger Flush 2 (which occurs while Flush 1 is saving)
        const flush2Promise = diskRepo.flush();

        // Signal writeBarrier so Flush 1 finishes and queued flushes execute
        writeBarrier.signal();

        await Promise.all([flush1Promise, mutationBPromise, flush2Promise]);

        assert.ok(writeFileIntercepted, 'writeFile must have been intercepted during test');
      } finally {
        fs.promises.writeFile = originalWriteFile;
      }

      // Verify that Mutation B is present on disk on cold reload
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const reloadedNotes = await diskRepoReload.personalStudy.listNotes('student-1');
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Flush Mutation A'),
        'Mutation A must exist on disk'
      );
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Flush Mutation B During Active Flush'),
        'Mutation B made during active flush MUST exist on disk'
      );

      console.log('[PASS] 2.1 Mutations occurring during active disk flushes are reliably queued and persisted');
    }

    // --------------------------------------------------------------------------
    // Section 3: Multiple Consecutive Rapid Mutations & Flush Requests
    // --------------------------------------------------------------------------
    console.log('\n--- Section 3: Multiple Consecutive Rapid Mutations & Flush Requests ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Perform 6 rapid, non-awaited mutations and flush calls
      const operations: Promise<any>[] = [];
      for (let i = 1; i <= 6; i++) {
        operations.push(
          personalNotesStore.createNote('student-1', {
            title: `Rapid Note ${i}`,
            content: `Rapid content ${i}`
          })
        );
        operations.push(diskRepo.flush());
      }

      await Promise.all(operations);

      // Reload disk repository and verify all 6 notes survived
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const reloadedNotes = await diskRepoReload.personalStudy.listNotes('student-1');
      for (let i = 1; i <= 6; i++) {
        assert.ok(
          reloadedNotes.some((n) => n.title === `Rapid Note ${i}`),
          `Rapid Note ${i} must be persisted on disk`
        );
      }

      console.log('[PASS] 3.1 Multiple rapid consecutive mutations and flushes resolve without data loss');
    }

    // --------------------------------------------------------------------------
    // Section 4: Fault Injection & Retry (Failed Write/Rename & Cleanup)
    // --------------------------------------------------------------------------
    console.log('\n--- Section 4: Fault Injection & Retry (Failed Write/Rename & Cleanup) ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Add a note
      await personalNotesStore.createNote('student-1', {
        title: 'Fault Retry Note',
        content: 'Content for fault retry test'
      });

      const originalRename = fs.promises.rename;
      let renameFaultInjected = false;

      // Intercept rename to throw error on first call
      fs.promises.rename = async (oldPath: any, newPath: any) => {
        if (!renameFaultInjected && typeof oldPath === 'string' && oldPath.includes('.tmp')) {
          renameFaultInjected = true;
          throw new Error('SIMULATED_RENAME_PERMISSION_ERROR');
        }
        return originalRename.call(fs.promises, oldPath, newPath);
      };

      try {
        let flushErrorCaught = false;
        try {
          await diskRepo.flush();
        } catch (err: any) {
          if (err.message === 'SIMULATED_RENAME_PERMISSION_ERROR') {
            flushErrorCaught = true;
          }
        }

        assert.ok(flushErrorCaught, 'First flush must fail due to injected rename fault');

        // Verify no temporary .tmp files remain in data directory after failure
        const tmpFiles = fs.readdirSync(testTempDir).filter((f) => f.endsWith('.tmp'));
        assert.strictEqual(tmpFiles.length, 0, 'Temporary file MUST be unlinked/cleaned up on failure');
      } finally {
        fs.promises.rename = originalRename;
      }

      // Retry flush after restoring rename
      await diskRepo.flush();

      // Cold reload disk repository
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const reloadedNotes = await diskRepoReload.personalStudy.listNotes('student-1');
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Fault Retry Note'),
        'Fault Retry Note must be saved after successful flush retry'
      );

      console.log('[PASS] 4.1 Failed disk write cleans up temporary files and retries successfully');
    }

    // --------------------------------------------------------------------------
    // Section 5: MemoryJarvisDataRepository Isolation Parity
    // --------------------------------------------------------------------------
    console.log('\n--- Section 5: MemoryJarvisDataRepository Isolation Parity ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);

      const barrierTxFirstMutationDone = new PromiseBarrier();
      const barrierOrdinaryWriteDone = new PromiseBarrier();

      let txErrorCaught = false;

      const txPromise = memRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.createNote({
          userId: 'mem-user-1',
          title: 'Memory Tx Note 1',
          content: 'Memory tx content'
        });

        barrierTxFirstMutationDone.signal();
        await barrierOrdinaryWriteDone.wait();

        throw new Error('FORCED_MEM_TX_FAILURE');
      }, { name: 'mem-test-isolation' }).catch((err) => {
        if (err.message === 'FORCED_MEM_TX_FAILURE') {
          txErrorCaught = true;
        }
      });

      await barrierTxFirstMutationDone.wait();

      // Perform ordinary write outside transaction
      await personalNotesStore.createNote('mem-user-1', {
        title: 'Ordinary Memory Note',
        content: 'Ordinary content in memory'
      });

      barrierOrdinaryWriteDone.signal();
      await txPromise;

      assert.ok(txErrorCaught, 'Memory transaction must fail');

      const memNotes = await personalNotesStore.getNotes('mem-user-1');
      assert.ok(
        memNotes.some((n) => n.title === 'Ordinary Memory Note'),
        'Ordinary memory note MUST be preserved'
      );
      assert.ok(
        !memNotes.some((n) => n.title === 'Memory Tx Note 1'),
        'Memory transaction note MUST be discarded'
      );

      console.log('[PASS] 5.1 MemoryJarvisDataRepository provides identical transaction isolation guarantees');
    }

  } finally {
    resetActiveRepository();
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }

  console.log('\n======================================================');
  console.log('ALL STAGE 6.4.4.1 ISOLATION & FLUSH HARDENING TESTS PASSED!');
  console.log('======================================================\n');
}

runStage6441Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
