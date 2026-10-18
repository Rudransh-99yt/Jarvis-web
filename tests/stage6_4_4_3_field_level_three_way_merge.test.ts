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

async function runStage6443Tests() {
  console.log('=== [STAGE 6.4.4.3] FIELD-LEVEL THREE-WAY MERGE TEST SUITE ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-4-3-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_4_3_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Test A: Disk repository, concurrent non-conflicting field updates on same record
    // --------------------------------------------------------------------------
    console.log('--- Test A: Disk repository, concurrent non-conflicting field updates on same record ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Seed initial note
      const note = await personalNotesStore.createNote('student-1', {
        title: 'Original Title',
        content: 'Original Content',
        subject: 'Physics'
      });

      const barrierTxFirstMutationDone = new PromiseBarrier();
      const barrierOrdinaryWriteDone = new PromiseBarrier();

      let txCommitted = false;

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Transaction updates title (Field A)
        await txRepo.personalStudy.updateNote(note.id, {
          title: 'Updated Title By Tx'
        }, 'student-1');

        barrierTxFirstMutationDone.signal();
        await barrierOrdinaryWriteDone.wait();

        txCommitted = true;
      }, { name: 'test-field-level-merge-disk', userId: 'student-1' });

      await barrierTxFirstMutationDone.wait();

      // Ordinary write updates content (Field B) on the same record
      await diskRepo.personalStudy.updateNote(note.id, {
        content: 'Updated Content By Ordinary Write'
      }, 'student-1');

      barrierOrdinaryWriteDone.signal();
      await txPromise;

      assert.ok(txCommitted, 'Transaction must commit');

      // Verify BOTH field updates survived in memory
      const fetchedNote = await personalNotesStore.getNoteById('student-1', note.id);
      assert.ok(fetchedNote, 'Note must exist');
      assert.strictEqual(fetchedNote.title, 'Updated Title By Tx', 'Tx title update must be preserved');
      assert.strictEqual(fetchedNote.content, 'Updated Content By Ordinary Write', 'Ordinary write content update must be preserved');

      // Cold disk reload verification
      await diskRepo.flush();
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const reloadedNote = await diskRepoReload.personalStudy.getNoteById(note.id, 'student-1');
      assert.ok(reloadedNote, 'Note must exist on disk after cold reload');
      assert.strictEqual(reloadedNote.title, 'Updated Title By Tx', 'Tx title update must persist on disk');
      assert.strictEqual(reloadedNote.content, 'Updated Content By Ordinary Write', 'Ordinary write content update must persist on disk');

      console.log('[PASS] A.1 Both field updates (Tx title & Ordinary content) survive on disk and in memory');
    }

    // --------------------------------------------------------------------------
    // Test B: Memory repository, different fields on same record
    // --------------------------------------------------------------------------
    console.log('\n--- Test B: Memory repository, concurrent non-conflicting field updates ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);

      const note = await personalNotesStore.createNote('mem-user-1', {
        title: 'Memory Original Title',
        content: 'Memory Original Content'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = memRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.updateNote(note.id, {
          title: 'Memory Tx Title'
        }, 'mem-user-1');

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'mem-field-level-test' });

      await barrierTxDone.wait();

      await memRepo.personalStudy.updateNote(note.id, {
        content: 'Memory Ordinary Content'
      }, 'mem-user-1');

      barrierOrdinaryDone.signal();
      await txPromise;

      const memNote = await personalNotesStore.getNoteById('mem-user-1', note.id);
      assert.ok(memNote, 'Memory note must exist');
      assert.strictEqual(memNote.title, 'Memory Tx Title', 'Tx title must survive in memory repo');
      assert.strictEqual(memNote.content, 'Memory Ordinary Content', 'Ordinary content must survive in memory repo');

      console.log('[PASS] B.1 MemoryJarvisDataRepository parity for field-level 3-way merge verified');
    }

    // --------------------------------------------------------------------------
    // Test C: Same-field conflict (Transaction-wins policy)
    // --------------------------------------------------------------------------
    console.log('\n--- Test C: Same-field conflict resolution (Transaction-wins policy) ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const note = await personalNotesStore.createNote('student-1', {
        title: 'Conflict Baseline Title',
        content: 'Conflict Baseline Content'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Tx updates title
        await txRepo.personalStudy.updateNote(note.id, {
          title: 'Title Changed By Transaction'
        }, 'student-1');

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'conflict-test' });

      await barrierTxDone.wait();

      // Ordinary write ALSO updates title (same field conflict)
      await diskRepo.personalStudy.updateNote(note.id, {
        title: 'Title Changed By Ordinary Write'
      }, 'student-1');

      barrierOrdinaryDone.signal();
      await txPromise;

      // Verify transaction-wins policy for same-field conflict
      const conflictNote = await personalNotesStore.getNoteById('student-1', note.id);
      assert.ok(conflictNote, 'Note must exist');
      assert.strictEqual(conflictNote.title, 'Title Changed By Transaction', 'Transaction value MUST win on same-field conflict');

      console.log('[PASS] C.1 Same-field conflict deterministically resolves to transaction value (transaction-wins)');
    }

    // --------------------------------------------------------------------------
    // Test D: Nested object merging (Concept Mastery map)
    // --------------------------------------------------------------------------
    console.log('\n--- Test D: Nested object field-level merging (Concept map) ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Seed initial concept in user state
      await diskRepo.personalKnowledge.recordConceptMastery('student-1', {
        conceptId: 'concept-kinematics',
        conceptName: 'Kinematics',
        subject: 'Physics',
        masteryLevel: 0.5,
        status: 'review_needed',
        evidenceCount: 1,
        lastPracticed: '2026-10-01'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Tx updates concept-kinematics score
        await txRepo.personalKnowledge.recordConceptMastery('student-1', {
          conceptId: 'concept-kinematics',
          conceptName: 'Kinematics',
          subject: 'Physics',
          masteryLevel: 0.95,
          status: 'mastered',
          evidenceCount: 5,
          lastPracticed: '2026-10-09'
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'nested-concepts-test' });

      await barrierTxDone.wait();

      // Ordinary write adds new concept 'concept-dynamics' concurrently
      await diskRepo.personalKnowledge.recordConceptMastery('student-1', {
        conceptId: 'concept-dynamics',
        conceptName: 'Dynamics',
        subject: 'Physics',
        masteryLevel: 0.7,
        status: 'developing',
        evidenceCount: 2,
        lastPracticed: '2026-10-09'
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      // Verify nested concept object merging: BOTH concepts exist in user state
      const kState = await diskRepo.personalKnowledge.getState('student-1');
      assert.ok(kState && kState.concepts, 'User knowledge state must exist');

      const kinematics = kState.concepts['concept-kinematics'];
      const dynamics = kState.concepts['concept-dynamics'];

      assert.ok(kinematics, 'Kinematics concept state must exist');
      assert.strictEqual(kinematics.masteryLevel, 0.95, 'Tx kinematics update must be preserved');

      assert.ok(dynamics, 'Dynamics concept state must exist');
      assert.strictEqual(dynamics.masteryLevel, 0.7, 'Ordinary write dynamics addition must be preserved');

      console.log('[PASS] D.1 Nested concept objects merge cleanly without losing concurrent entries');
    }

    // --------------------------------------------------------------------------
    // Test E: Deletion and addition regressions
    // --------------------------------------------------------------------------
    console.log('\n--- Test E: Deletion and addition regressions ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const note1 = await personalNotesStore.createNote('student-1', { title: 'Note 1 To Delete', content: 'Content 1' });
      const note2 = await personalNotesStore.createNote('student-1', { title: 'Note 2 To Keep', content: 'Content 2' });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Tx deletes Note 1
        await txRepo.personalStudy.deleteNote(note1.id, 'student-1');

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'delete-regression-test' });

      await barrierTxDone.wait();

      // Ordinary write creates Note 3
      const note3 = await personalNotesStore.createNote('student-1', { title: 'Ordinary Note 3', content: 'Content 3' });

      barrierOrdinaryDone.signal();
      await txPromise;

      await diskRepo.flush();
      const diskRepoReload = new DiskJarvisDataRepository(diskPath);
      await diskRepoReload.init();

      const allNotes = await diskRepoReload.personalStudy.listNotes('student-1');
      assert.ok(!allNotes.some((n) => n.id === note1.id), 'Deleted Note 1 MUST NOT be resurrected');
      assert.ok(allNotes.some((n) => n.id === note2.id), 'Existing Note 2 MUST be retained');
      assert.ok(allNotes.some((n) => n.id === note3.id), 'Ordinary Note 3 MUST survive');

      console.log('[PASS] E.1 Deletions remain deleted, existing records retained, and concurrent additions survive');
    }

  } finally {
    resetActiveRepository();
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }

  console.log('\n======================================================');
  console.log('ALL STAGE 6.4.4.3 FIELD-LEVEL MERGE TESTS PASSED!');
  console.log('======================================================\n');
}

runStage6443Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
