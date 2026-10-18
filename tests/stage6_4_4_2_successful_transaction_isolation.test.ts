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

/**
 * Deterministic Promise Barrier for controlling async execution flow in tests.
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

async function runStage6442Tests() {
  console.log('=== [STAGE 6.4.4.2] SUCCESSFUL TRANSACTION ISOLATION TEST SUITE ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-4-2-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_4_2_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Section 1: Ordinary Write Outside Tx + Transaction Successful Commit (Disk)
    // --------------------------------------------------------------------------
    console.log('--- Section 1: Ordinary Write Outside Tx + Transaction Successful Commit (Disk) ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const barrierTxFirstMutationDone = new PromiseBarrier();
      const barrierOrdinaryWriteDone = new PromiseBarrier();

      let txCommittedSuccessfully = false;

      // Start asynchronous transaction
      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Step 1: Perform Record A creation inside transaction
        await txRepo.personalStudy.createNote({
          userId: 'student-1',
          title: 'Transaction Note A',
          content: 'This note is created inside active transaction.'
        });

        // Signal that Tx first mutation is complete
        barrierTxFirstMutationDone.signal();

        // Pause transaction until ordinary write is completed outside transaction
        await barrierOrdinaryWriteDone.wait();

        // Resume transaction work cleanly
        txCommittedSuccessfully = true;
      }, { name: 'test-successful-tx-isolation', userId: 'student-1' });

      // Wait until transaction performs its first mutation
      await barrierTxFirstMutationDone.wait();

      // Perform an ordinary, non-transactional write (Record B) while transaction is paused
      const ordinaryNote = await personalNotesStore.createNote('student-1', {
        title: 'Ordinary Note B Outside Tx',
        content: 'This ordinary note was created outside runTransaction.'
      });

      assert.ok(ordinaryNote.id, 'Ordinary note B must be created successfully');

      // Unpause transaction so it commits successfully
      barrierOrdinaryWriteDone.signal();

      // Await transaction completion
      await txPromise;
      assert.ok(txCommittedSuccessfully, 'Transaction must complete and commit successfully');

      // Verify BOTH Record A and Record B remain in the in-memory state
      const currentNotes = await personalNotesStore.getNotes('student-1');
      assert.ok(
        currentNotes.some((n) => n.title === 'Transaction Note A'),
        'Record A created inside transaction MUST exist after commit'
      );
      assert.ok(
        currentNotes.some((n) => n.title === 'Ordinary Note B Outside Tx'),
        'Record B created outside transaction MUST exist after commit'
      );

      // Flush and instantiate a fresh disk repository from the same file
      await diskRepo.flush();
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const reloadedNotes = await diskRepoReload.personalStudy.listNotes('student-1');
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Transaction Note A'),
        'Record A MUST survive cold reload on disk'
      );
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Ordinary Note B Outside Tx'),
        'Record B MUST survive cold reload on disk'
      );

      console.log('[PASS] 1.1 Both transaction Record A and ordinary Record B survive successful transaction commit on disk');
    }

    // --------------------------------------------------------------------------
    // Section 2: Deletion & Modification Resolution during Successful Tx Commit
    // --------------------------------------------------------------------------
    console.log('\n--- Section 2: Deletion & Modification Resolution during Successful Tx Commit ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Seed initial note
      const initialNote = await personalNotesStore.createNote('student-1', {
        title: 'Initial Seed Note To Be Deleted',
        content: 'Initial content'
      });

      const barrierTxStarted = new PromiseBarrier();
      const barrierOutsideMutationDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Step 1: Transaction deletes initialNote and creates Note C
        await txRepo.personalStudy.deleteNote(initialNote.id, 'student-1');
        await txRepo.personalStudy.createNote({
          userId: 'student-1',
          title: 'Transaction Note C',
          content: 'Created inside Tx C'
        });

        barrierTxStarted.signal();
        await barrierOutsideMutationDone.wait();
      }, { name: 'test-deletion-isolation', userId: 'student-1' });

      await barrierTxStarted.wait();

      // Outside mutation: create Note D
      await personalNotesStore.createNote('student-1', {
        title: 'Ordinary Note D',
        content: 'Content D'
      });

      barrierOutsideMutationDone.signal();
      await txPromise;

      // Verify: Initial note is DELETED (not resurrected), Note C is created, Note D is preserved
      await diskRepo.flush();
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const reloadedNotes = await diskRepoReload.personalStudy.listNotes('student-1');
      assert.ok(
        !reloadedNotes.some((n) => n.id === initialNote.id),
        'Deleted record MUST NOT be resurrected on commit'
      );
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Transaction Note C'),
        'Transaction Note C MUST exist on disk'
      );
      assert.ok(
        reloadedNotes.some((n) => n.title === 'Ordinary Note D'),
        'Ordinary Note D MUST exist on disk'
      );

      console.log('[PASS] 2.1 Transaction deletions are honored without resurrecting records, and concurrent additions survive');
    }

    // --------------------------------------------------------------------------
    // Section 3: MemoryJarvisDataRepository Parity for Successful Transaction Commit
    // --------------------------------------------------------------------------
    console.log('\n--- Section 3: MemoryJarvisDataRepository Parity for Successful Transaction Commit ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);

      const barrierTxFirstMutationDone = new PromiseBarrier();
      const barrierOrdinaryWriteDone = new PromiseBarrier();

      let txCommittedSuccessfully = false;

      const txPromise = memRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.createNote({
          userId: 'mem-user-2',
          title: 'Memory Tx Note A',
          content: 'Memory Tx A content'
        });

        barrierTxFirstMutationDone.signal();
        await barrierOrdinaryWriteDone.wait();

        txCommittedSuccessfully = true;
      }, { name: 'mem-test-successful-tx-isolation' });

      await barrierTxFirstMutationDone.wait();

      // Perform ordinary write outside transaction
      await personalNotesStore.createNote('mem-user-2', {
        title: 'Memory Ordinary Note B',
        content: 'Memory Ordinary B content'
      });

      barrierOrdinaryWriteDone.signal();
      await txPromise;

      assert.ok(txCommittedSuccessfully, 'Memory transaction must commit');

      const memNotes = await personalNotesStore.getNotes('mem-user-2');
      assert.ok(
        memNotes.some((n) => n.title === 'Memory Tx Note A'),
        'Memory transaction Note A MUST exist'
      );
      assert.ok(
        memNotes.some((n) => n.title === 'Memory Ordinary Note B'),
        'Memory ordinary Note B MUST exist'
      );

      console.log('[PASS] 3.1 MemoryJarvisDataRepository provides identical successful transaction isolation guarantees');
    }

  } finally {
    resetActiveRepository();
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }

  console.log('\n======================================================');
  console.log('ALL STAGE 6.4.4.2 SUCCESSFUL TRANSACTION ISOLATION TESTS PASSED!');
  console.log('======================================================\n');
}

runStage6442Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
