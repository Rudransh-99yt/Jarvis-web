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

async function runStage6444Tests() {
  console.log('=== [STAGE 6.4.4.4] ADVERSARIAL THREE-WAY MERGE EDGE-CASE AUDIT ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-4-4-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_4_4_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Test 1: Property deletion vs concurrent property modification on same record
    // --------------------------------------------------------------------------
    console.log('--- Test 1: Property deletion vs concurrent property modification ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Create initial note with title, content, subject
      const note = await personalNotesStore.createNote('user-1', {
        title: 'Initial Title',
        content: 'Initial Content',
        subject: 'Mathematics'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Tx deletes subject property from note by setting it to undefined / omitting
        const n = await txRepo.personalStudy.getNoteById(note.id, 'user-1');
        if (n) {
          delete (n as any).subject;
          await txRepo.personalStudy.updateNote(note.id, { subject: undefined } as any, 'user-1');
        }

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'prop-deletion-test' });

      await barrierTxDone.wait();

      // Ordinary write modifies content field
      await diskRepo.personalStudy.updateNote(note.id, {
        content: 'Updated Content By Ordinary Write'
      }, 'user-1');

      barrierOrdinaryDone.signal();
      await txPromise;

      // Verify in memory
      const fetched = await personalNotesStore.getNoteById('user-1', note.id);
      assert.ok(fetched, 'Note must exist');
      assert.strictEqual(fetched.content, 'Updated Content By Ordinary Write', 'Ordinary content write must survive');
      assert.strictEqual(fetched.subject, undefined, 'Tx deleted subject property must be deleted/undefined');

      // Reload disk
      await diskRepo.flush();
      const diskReload = new DiskJarvisDataRepository(diskPath);
      await diskReload.init();

      const diskNote = await diskReload.personalStudy.getNoteById(note.id, 'user-1');
      assert.ok(diskNote, 'Note must exist on disk');
      assert.strictEqual(diskNote.content, 'Updated Content By Ordinary Write', 'Ordinary content write must persist on disk');
      assert.strictEqual(diskNote.subject, undefined, 'Deleted subject property must remain absent on disk');

      console.log('[PASS] 1. Property deletion by Tx and property update by Ordinary write both survived');
    }

    // --------------------------------------------------------------------------
    // Test 2: Missing versus undefined property handling consistency
    // --------------------------------------------------------------------------
    console.log('\n--- Test 2: Missing versus undefined property consistency ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);

      const note = await personalNotesStore.createNote('user-2', {
        title: 'Title Undefined Test',
        content: 'Content Undefined Test'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = memRepo.runTransaction(async (txRepo) => {
        // Tx sets optional property summary to undefined
        await txRepo.personalStudy.updateNote(note.id, {
          title: 'Title Changed By Tx',
          summary: undefined
        } as any, 'user-2');

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'undefined-prop-test' });

      await barrierTxDone.wait();

      await memRepo.personalStudy.updateNote(note.id, {
        content: 'Content Changed By Ordinary Write'
      }, 'user-2');

      barrierOrdinaryDone.signal();
      await txPromise;

      const memNote = await personalNotesStore.getNoteById('user-2', note.id);
      assert.ok(memNote, 'Note must exist');
      assert.strictEqual(memNote.title, 'Title Changed By Tx');
      assert.strictEqual(memNote.content, 'Content Changed By Ordinary Write');
      // Verify keys of note object do not leak undefined properties after JSON stringify
      const jsonParsed = JSON.parse(JSON.stringify(memNote));
      assert.strictEqual('summary' in jsonParsed, false, 'Property set to undefined must not linger as JSON property');

      console.log('[PASS] 2. Missing vs undefined properties handled consistently');
    }

    // --------------------------------------------------------------------------
    // Test 3: Arrays - concurrent changes and same-field conflict (tx-wins)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 3: Array property concurrent updates (tx-wins, no plain-object merging) ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const note = await personalNotesStore.createNote('user-3', {
        title: 'Array Note',
        content: 'Array Content',
        tags: ['physics', 'mechanics']
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.updateNote(note.id, {
          tags: ['physics', 'mechanics', 'tx-tag']
        }, 'user-3');

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'array-conflict-test' });

      await barrierTxDone.wait();

      await diskRepo.personalStudy.updateNote(note.id, {
        tags: ['physics', 'mechanics', 'ord-tag']
      }, 'user-3');

      barrierOrdinaryDone.signal();
      await txPromise;

      const fetchedNote = await personalNotesStore.getNoteById('user-3', note.id);
      assert.ok(fetchedNote, 'Note must exist');
      assert.deepStrictEqual(fetchedNote.tags, ['physics', 'mechanics', 'tx-tag'], 'Tx tags must win over ordinary write tags');

      // Reload disk
      await diskRepo.flush();
      const diskReload = new DiskJarvisDataRepository(diskPath);
      await diskReload.init();
      const diskNote = await diskReload.personalStudy.getNoteById(note.id, 'user-3');
      assert.deepStrictEqual(diskNote?.tags, ['physics', 'mechanics', 'tx-tag'], 'Tx tags must persist on disk');

      console.log('[PASS] 3. Array property same-field conflict obeys transaction-wins policy without plain-object corruption');
    }

    // --------------------------------------------------------------------------
    // Test 4: Nested objects - non-conflicting field updates + same-field conflict
    // --------------------------------------------------------------------------
    console.log('\n--- Test 4: Nested objects field-level merge + same-field conflict ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Seed a concept in knowledge state
      await diskRepo.personalKnowledge.recordConceptMastery('user-4', {
        conceptId: 'c-1',
        conceptName: 'Calculus',
        subject: 'Math',
        masteryLevel: 0.2,
        status: 'struggling',
        evidenceCount: 1,
        lastPracticed: '2026-10-01'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Tx updates masteryLevel (Field 1) and status (Field 2)
        await txRepo.personalKnowledge.recordConceptMastery('user-4', {
          conceptId: 'c-1',
          conceptName: 'Calculus',
          subject: 'Math',
          masteryLevel: 0.8,
          status: 'tx-mastered',
          evidenceCount: 1,
          lastPracticed: '2026-10-01'
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'nested-conflict-test' });

      await barrierTxDone.wait();

      // Ordinary write updates evidenceCount (Field 3) and status (Field 2 conflict!)
      await diskRepo.personalKnowledge.recordConceptMastery('user-4', {
        conceptId: 'c-1',
        conceptName: 'Calculus',
        subject: 'Math',
        masteryLevel: 0.2,
        status: 'ord-reviewing',
        evidenceCount: 10,
        lastPracticed: '2026-10-09'
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const kState = await diskRepo.personalKnowledge.getState('user-4');
      assert.ok(kState && kState.concepts && kState.concepts['c-1'], 'Concept c-1 must exist');
      const c1 = kState.concepts['c-1'];

      assert.strictEqual(c1.masteryLevel, 0.8, 'Tx masteryLevel update must survive');
      assert.strictEqual(c1.evidenceCount, 10, 'Ordinary evidenceCount write must survive');
      assert.strictEqual(c1.status, 'tx-mastered', 'Conflicting status field must give precedence to transaction');

      // Reload disk
      await diskRepo.flush();
      const diskReload = new DiskJarvisDataRepository(diskPath);
      await diskReload.init();
      const reloadedKState = await diskReload.personalKnowledge.getState('user-4');
      const reloadedC1 = reloadedKState.concepts['c-1'];
      assert.strictEqual(reloadedC1.masteryLevel, 0.8);
      assert.strictEqual(reloadedC1.evidenceCount, 10);
      assert.strictEqual(reloadedC1.status, 'tx-mastered');

      console.log('[PASS] 4. Nested object non-conflicting fields merged; same-field conflict resolved to Tx');
    }

    // --------------------------------------------------------------------------
    // Test 5: Record deletion vs modification conflict policy
    // --------------------------------------------------------------------------
    console.log('\n--- Test 5: Record deletion vs concurrent modification conflict policy ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const note1 = await personalNotesStore.createNote('user-5', { title: 'Note 1 To Delete', content: 'Content 1' });
      const note2 = await personalNotesStore.createNote('user-5', { title: 'Note 2 To Keep', content: 'Content 2' });

      // Scenario 5A: Tx deletes Note 1, Ordinary write modifies Note 1
      const barrierTxDoneA = new PromiseBarrier();
      const barrierOrdinaryDoneA = new PromiseBarrier();

      const txPromiseA = diskRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.deleteNote(note1.id, 'user-5');

        barrierTxDoneA.signal();
        await barrierOrdinaryDoneA.wait();
      }, { name: 'rec-del-test-A' });

      await barrierTxDoneA.wait();

      await diskRepo.personalStudy.updateNote(note1.id, {
        content: 'Modified Content By Ordinary Write'
      }, 'user-5');

      barrierOrdinaryDoneA.signal();
      await txPromiseA;

      const note1Check = await personalNotesStore.getNoteById('user-5', note1.id);
      assert.strictEqual(note1Check, null, 'Note 1 must remain deleted (Tx deletion wins over ordinary modification)');

      // Scenario 5B: Ordinary write deletes Note 2, Tx modifies Note 2
      const barrierTxDoneB = new PromiseBarrier();
      const barrierOrdinaryDoneB = new PromiseBarrier();

      const txPromiseB = diskRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.updateNote(note2.id, {
          title: 'Title Updated By Tx'
        }, 'user-5');

        barrierTxDoneB.signal();
        await barrierOrdinaryDoneB.wait();
      }, { name: 'rec-del-test-B' });

      await barrierTxDoneB.wait();

      await diskRepo.personalStudy.deleteNote(note2.id, 'user-5');

      barrierOrdinaryDoneB.signal();
      await txPromiseB;

      const note2Check = await personalNotesStore.getNoteById('user-5', note2.id);
      assert.ok(note2Check, 'Note 2 must survive (Tx modification wins over ordinary deletion)');
      assert.strictEqual(note2Check.title, 'Title Updated By Tx');

      // Reload disk
      await diskRepo.flush();
      const diskReload = new DiskJarvisDataRepository(diskPath);
      await diskReload.init();

      const allNotes = await diskReload.personalStudy.listNotes('user-5');
      assert.strictEqual(allNotes.some(n => n.id === note1.id), false, 'Note 1 must remain deleted on disk');
      assert.strictEqual(allNotes.some(n => n.id === note2.id), true, 'Note 2 must survive on disk with Tx title');

      console.log('[PASS] 5. Explicit conflict policy for record deletion vs modification verified (Tx wins)');
    }

    // --------------------------------------------------------------------------
    // Test 6: Concurrent additions and key deduplication
    // --------------------------------------------------------------------------
    console.log('\n--- Test 6: Concurrent additions and key deduplication ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = memRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.createNote({
          id: 'note-add-tx',
          userId: 'user-6',
          title: 'Tx Created Note',
          content: 'Tx Content'
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'concurrent-add-test' });

      await barrierTxDone.wait();

      await memRepo.personalStudy.createNote({
        id: 'note-add-ord',
        userId: 'user-6',
        title: 'Ordinary Created Note',
        content: 'Ordinary Content'
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      const notes = await memRepo.personalStudy.listNotes('user-6');
      assert.strictEqual(notes.length, 2, 'Both concurrent additions must exist');
      assert.ok(notes.some(n => n.id === 'note-add-tx'));
      assert.ok(notes.some(n => n.id === 'note-add-ord'));

      // Check no duplicate IDs exist
      const ids = notes.map(n => n.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'No duplicate keys allowed');

      console.log('[PASS] 6. Concurrent additions survive and no duplicate keys are created');
    }

    // --------------------------------------------------------------------------
    // Test 7: Rollback isolation - failed tx must not leak changes or erase ordinary writes
    // --------------------------------------------------------------------------
    console.log('\n--- Test 7: Transaction Rollback isolation ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const note = await personalNotesStore.createNote('user-7', {
        title: 'Baseline Title',
        content: 'Baseline Content'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      let txErrorCaught = false;

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Tx updates title and creates a new note
        await txRepo.personalStudy.updateNote(note.id, {
          title: 'Leaked Tx Title'
        }, 'user-7');

        await txRepo.personalStudy.createNote({
          id: 'leaked-note-id',
          userId: 'user-7',
          title: 'Leaked Tx Note',
          content: 'Leaked Content'
        });

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();

        // Intentionally throw error to force rollback
        throw new Error('Simulated transaction failure');
      }, { name: 'rollback-test' }).catch((err) => {
        txErrorCaught = true;
      });

      await barrierTxDone.wait();

      // Concurrent ordinary write creates Note B and updates note content
      await diskRepo.personalStudy.createNote({
        id: 'ordinary-note-id',
        userId: 'user-7',
        title: 'Surviving Ordinary Note',
        content: 'Ordinary Content'
      });

      await diskRepo.personalStudy.updateNote(note.id, {
        content: 'Updated Baseline Content By Ordinary Write'
      }, 'user-7');

      barrierOrdinaryDone.signal();
      await txPromise;

      assert.ok(txErrorCaught, 'Transaction failure must be caught');

      const baselineNote = await personalNotesStore.getNoteById('user-7', note.id);
      assert.ok(baselineNote, 'Baseline note must exist');
      assert.strictEqual(baselineNote.title, 'Baseline Title', 'Rolled-back Tx title modification MUST NOT leak');
      assert.strictEqual(baselineNote.content, 'Updated Baseline Content By Ordinary Write', 'Ordinary content write MUST survive');

      const leakedNote = await personalNotesStore.getNoteById('user-7', 'leaked-note-id');
      assert.strictEqual(leakedNote, null, 'Rolled-back Tx note creation MUST NOT leak');

      const ordinaryNote = await personalNotesStore.getNoteById('user-7', 'ordinary-note-id');
      assert.ok(ordinaryNote, 'Ordinary note created during failed transaction MUST survive');

      // Reload disk
      await diskRepo.flush();
      const diskReload = new DiskJarvisDataRepository(diskPath);
      await diskReload.init();

      const diskBaseline = await diskReload.personalStudy.getNoteById(note.id, 'user-7');
      assert.strictEqual(diskBaseline?.title, 'Baseline Title');
      assert.strictEqual(diskBaseline?.content, 'Updated Baseline Content By Ordinary Write');

      const diskLeaked = await diskReload.personalStudy.getNoteById('leaked-note-id', 'user-7');
      assert.strictEqual(diskLeaked, null);

      const diskOrdinary = await diskReload.personalStudy.getNoteById('ordinary-note-id', 'user-7');
      assert.ok(diskOrdinary);

      console.log('[PASS] 7. Failed transaction rolled back cleanly without leaking changes or erasing ordinary writes');
    }

    // --------------------------------------------------------------------------
    // Test 8: Cold reload disk durability across complex multi-store changes
    // --------------------------------------------------------------------------
    console.log('\n--- Test 8: Cold reload disk durability across multi-store concurrent updates ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Seed user notes and flashcards
      const note = await personalNotesStore.createNote('user-8', {
        title: 'Durability Note Title',
        content: 'Durability Note Content'
      });

      const card1 = await diskRepo.personalStudy.createFlashcard({
        id: 'card-1',
        userId: 'user-8',
        front: 'Front 1',
        back: 'Back 1'
      });

      const barrierTxDone = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (txRepo) => {
        // Tx updates note title and updates flashcard back
        await txRepo.personalStudy.updateNote(note.id, {
          title: 'Durability Title By Tx'
        }, 'user-8');

        await txRepo.personalStudy.updateFlashcard('card-1', {
          back: 'Updated Back 1 By Tx'
        }, 'user-8');

        barrierTxDone.signal();
        await barrierOrdinaryDone.wait();
      }, { name: 'durability-test' });

      await barrierTxDone.wait();

      // Ordinary write updates note content and adds new flashcard
      await diskRepo.personalStudy.updateNote(note.id, {
        content: 'Durability Content By Ordinary Write'
      }, 'user-8');

      await diskRepo.personalStudy.createFlashcard({
        id: 'card-2',
        userId: 'user-8',
        front: 'Front 2',
        back: 'Back 2'
      });

      barrierOrdinaryDone.signal();
      await txPromise;

      await diskRepo.flush();

      // Instantiate fresh disk repository from the same file
      const diskReload = new DiskJarvisDataRepository(diskPath);
      await diskReload.init();

      const reloadedNote = await diskReload.personalStudy.getNoteById(note.id, 'user-8');
      assert.ok(reloadedNote, 'Note must exist after cold reload');
      assert.strictEqual(reloadedNote.title, 'Durability Title By Tx', 'Tx title change must persist on cold reload');
      assert.strictEqual(reloadedNote.content, 'Durability Content By Ordinary Write', 'Ordinary content change must persist on cold reload');

      const reloadedCards = await diskReload.personalStudy.listFlashcards('user-8');
      assert.strictEqual(reloadedCards.length, 2, 'Two flashcards must exist after cold reload');
      const reloadedCard1 = reloadedCards.find((c: any) => c.id === 'card-1');
      const reloadedCard2 = reloadedCards.find((c: any) => c.id === 'card-2');

      assert.ok(reloadedCard1, 'Card 1 must exist');
      assert.strictEqual(reloadedCard1.back, 'Updated Back 1 By Tx', 'Tx updated back on Card 1 must persist');

      assert.ok(reloadedCard2, 'Card 2 must exist');
      assert.strictEqual(reloadedCard2.front, 'Front 2', 'Ordinary added Card 2 must persist');

      console.log('[PASS] 8. Cold disk reload verified across multi-store concurrent updates');
    }

  } finally {
    resetActiveRepository();
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }

  console.log('\n======================================================');
  console.log('ALL STAGE 6.4.4.4 ADVERSARIAL MERGE EDGE-CASE TESTS PASSED!');
  console.log('======================================================\n');
}

runStage6444Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
