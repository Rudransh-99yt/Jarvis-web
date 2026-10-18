import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository,
  TransactionTimeoutError
} from '../server/data/index.ts';

class PromiseBarrier {
  public promise: Promise<void>;
  private resolveFunc!: () => void;

  constructor() {
    this.promise = new Promise<void>((resolve) => {
      this.resolveFunc = resolve;
    });
  }

  signal(): void {
    this.resolveFunc();
  }

  wait(): Promise<void> {
    return this.promise;
  }
}

async function runTests() {
  console.log('=== Starting Stage 6.4.4.6 Final Transaction-Safety Review Tests ===');
  const tmpDir = path.join(process.cwd(), '.tmp-test-6-4-4-6');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  try {
    // ----------------------------------------------------
    // Test 1: Repository API Parity (getState & mutate)
    // ----------------------------------------------------
    {
      console.log('Test 1: Verification of getState and mutate parity on disk and memory repos...');
      const diskPath = path.join(tmpDir, 'test1_disk.json');
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      const memRepo = new MemoryJarvisDataRepository();
      await memRepo.init();

      // Ensure getState returns a valid DatabaseSchema
      const diskState = diskRepo.getState();
      const memState = memRepo.getState();

      assert.ok(diskState, 'Disk repo getState should return schema');
      assert.ok(memState, 'Memory repo getState should return schema');

      // Verify mutate function works on both repos
      diskRepo.mutate((state) => {
        state.meta = { ...state.meta, version: 10, testTag: 'disk-test-1' } as any;
      });
      await diskRepo.flush();

      memRepo.mutate((state) => {
        state.meta = { ...state.meta, version: 10, testTag: 'mem-test-1' } as any;
      });

      assert.equal((diskRepo.getState().meta as any).testTag, 'disk-test-1');
      assert.equal((memRepo.getState().meta as any).testTag, 'mem-test-1');

      // Verify cold reload from disk retains mutated state
      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      assert.equal((coldRepo.getState().meta as any).testTag, 'disk-test-1');
      console.log('  -> Test 1 PASSED.');
    }

    // ----------------------------------------------------
    // Test 2: Nested Transactions & Savepoint Rollback
    // ----------------------------------------------------
    {
      console.log('Test 2: Nested transaction savepoint rollback isolation...');
      const diskPath = path.join(tmpDir, 'test2_disk.json');
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();

      await diskRepo.runTransaction(async (txOuter) => {
        // Outer tx creates User A
        await txOuter.users.create({
          id: 'user-outer-1',
          email: 'outer1@example.com',
          name: 'Outer User 1',
          role: 'student',
          workspaceIds: []
        });

        // Inner nested transaction fails
        try {
          await txOuter.runTransaction(async (txInner) => {
            await txInner.users.create({
              id: 'user-inner-bad',
              email: 'innerbad@example.com',
              name: 'Inner User Bad',
              role: 'student',
              workspaceIds: []
            });
            throw new Error('Inner savepoint error');
          });
        } catch (err: any) {
          assert.equal(err.message, 'Inner savepoint error');
        }

        // Outer tx continues and creates User B
        await txOuter.users.create({
          id: 'user-outer-2',
          email: 'outer2@example.com',
          name: 'Outer User 2',
          role: 'student',
          workspaceIds: []
        });
      });

      // Verify user-outer-1 and user-outer-2 exist, but user-inner-bad was rolled back
      const u1 = await diskRepo.users.getById('user-outer-1');
      const u2 = await diskRepo.users.getById('user-outer-2');
      const uBad = await diskRepo.users.getById('user-inner-bad');

      assert.ok(u1, 'user-outer-1 should exist');
      assert.ok(u2, 'user-outer-2 should exist');
      assert.equal(uBad, null, 'user-inner-bad must be rolled back by savepoint');

      // Cold reload verification
      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldU1 = await coldRepo.users.getById('user-outer-1');
      const coldUBad = await coldRepo.users.getById('user-inner-bad');
      assert.ok(coldU1, 'Cold reload retains user-outer-1');
      assert.equal(coldUBad, null, 'Cold reload omits user-inner-bad');
      console.log('  -> Test 2 PASSED.');
    }

    // ----------------------------------------------------
    // Test 3: Transaction Execution Timeout & Lock Cleanup
    // ----------------------------------------------------
    {
      console.log('Test 3: Transaction execution timeout and lock cleanup...');
      const diskPath = path.join(tmpDir, 'test3_disk.json');
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();

      let timedOutErrorCaught = false;

      try {
        await diskRepo.runTransaction(async (tx) => {
          await tx.users.create({
            id: 'user-timeout-1',
            email: 'timeout@example.com',
            name: 'Timeout User',
            role: 'student',
            workspaceIds: []
          });
          // Intentionally block work past 150ms timeout
          await new Promise((resolve) => setTimeout(resolve, 300));
        }, { timeoutMs: 150 });
      } catch (err: any) {
        if (err instanceof TransactionTimeoutError || err.name === 'TransactionTimeoutError') {
          timedOutErrorCaught = true;
        } else {
          throw err;
        }
      }

      assert.ok(timedOutErrorCaught, 'Transaction execution should throw TransactionTimeoutError on timeout');

      // Verify timed-out transaction was rolled back
      const u = await diskRepo.users.getById('user-timeout-1');
      assert.equal(u, null, 'Timed out transaction changes must be rolled back');

      // Verify lock was released and a new transaction can run immediately
      let newTxExecuted = false;
      await diskRepo.runTransaction(async (tx) => {
        await tx.users.create({
          id: 'user-after-timeout',
          email: 'after@example.com',
          name: 'After Timeout User',
          role: 'student',
          workspaceIds: []
        });
        newTxExecuted = true;
      }, { timeoutMs: 1000 });

      assert.ok(newTxExecuted, 'Subsequent transaction must succeed after lock is released');
      const afterUser = await diskRepo.users.getById('user-after-timeout');
      assert.ok(afterUser, 'User created after lock release must exist');
      console.log('  -> Test 3 PASSED.');
    }

    // ----------------------------------------------------
    // Test 4: Ordinary Write During Rollback
    // ----------------------------------------------------
    {
      console.log('Test 4: Ordinary write during transaction rollback...');
      const diskPath = path.join(tmpDir, 'test4_disk.json');
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();

      const barrierTxPaused = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (tx) => {
        await tx.users.create({
          id: 'user-tx-rollback',
          email: 'txrollback@example.com',
          name: 'TX Rollback User',
          role: 'student',
          workspaceIds: []
        });

        barrierTxPaused.signal();
        await barrierOrdinaryDone.wait();

        throw new Error('Intentional transaction rollback');
      });

      await barrierTxPaused.wait();

      // Ordinary write outside transaction
      await diskRepo.users.create({
        id: 'user-ordinary-survives',
        email: 'ordinarysurvives@example.com',
        name: 'Ordinary User Survives',
        role: 'teacher',
        workspaceIds: []
      });

      barrierOrdinaryDone.signal();

      try {
        await txPromise;
        assert.fail('Transaction should have failed');
      } catch (err: any) {
        assert.equal(err.message, 'Intentional transaction rollback');
      }

      // Verify ordinary write survives, tx write rolled back
      const ordinaryUser = await diskRepo.users.getById('user-ordinary-survives');
      const txUser = await diskRepo.users.getById('user-tx-rollback');

      assert.ok(ordinaryUser, 'Ordinary write must survive transaction rollback');
      assert.equal(txUser, null, 'Transaction write must be rolled back');

      await diskRepo.flush();

      // Cold reload check
      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldOrdinary = await coldRepo.users.getById('user-ordinary-survives');
      const coldTx = await coldRepo.users.getById('user-tx-rollback');

      assert.ok(coldOrdinary, 'Ordinary write survives cold reload after transaction rollback');
      assert.equal(coldTx, null, 'Rolled back transaction remains absent after cold reload');
      console.log('  -> Test 4 PASSED.');
    }

    // ----------------------------------------------------
    // Test 5: Simulated Disk Write Failure & Temp File Recovery
    // ----------------------------------------------------
    {
      console.log('Test 5: Disk write failure handling, temp file cleanup, and recovery...');
      const diskPath = path.join(tmpDir, 'test5_disk.json');
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();

      // Seed initial data
      await diskRepo.users.create({
        id: 'user-base-5',
        email: 'base5@example.com',
        name: 'Base 5 User',
        role: 'student',
        workspaceIds: []
      });
      await diskRepo.flush();

      // Mock fs.promises.rename once to simulate atomic replace failure
      const originalRename = fs.promises.rename;
      let mockFailed = false;

      (fs.promises as any).rename = async (src: string, dest: string) => {
        if (!mockFailed) {
          mockFailed = true;
          throw new Error('EACCES: permission denied during atomic replace');
        }
        return originalRename.call(fs.promises, src, dest);
      };

      try {
        diskRepo.mutate((state) => {
          state.meta = { ...state.meta, dirtyTest: true } as any;
        });
        await diskRepo.flush();
        assert.fail('Flush should fail when fs.rename fails');
      } catch (err: any) {
        assert.equal(err.message, 'EACCES: permission denied during atomic replace');
      } finally {
        fs.promises.rename = originalRename;
      }

      // Check no orphaned .tmp files remain in tmpDir
      const filesInDir = fs.readdirSync(tmpDir);
      const tmpFiles = filesInDir.filter((f) => f.includes('test5_disk.json') && f.endsWith('.tmp'));
      assert.equal(tmpFiles.length, 0, 'Temporary files must be cleaned up on write error');

      // Subsequent flush should succeed now that rename is restored
      await diskRepo.flush();

      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      assert.equal((coldRepo.getState().meta as any).dirtyTest, true, 'Recovered flush survives cold reload');
      console.log('  -> Test 5 PASSED.');
    }

    // ----------------------------------------------------
    // Test 6: Same-Field Conflict Transaction-Wins Policy
    // ----------------------------------------------------
    {
      console.log('Test 6: Same-field conflict transaction-wins policy verification...');
      const diskPath = path.join(tmpDir, 'test6_disk.json');
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();

      await diskRepo.users.create({
        id: 'user-conflict-1',
        email: 'conflict@example.com',
        name: 'Initial Name',
        role: 'student',
        workspaceIds: []
      });
      await diskRepo.flush();

      const barrierTxPaused = new PromiseBarrier();
      const barrierOrdinaryDone = new PromiseBarrier();

      const txPromise = diskRepo.runTransaction(async (tx) => {
        const u = await tx.users.getById('user-conflict-1');
        assert.ok(u);
        u.name = 'Transaction Winner Name';
        await tx.users.update('user-conflict-1', { name: u.name });

        barrierTxPaused.signal();
        await barrierOrdinaryDone.wait();
      });

      await barrierTxPaused.wait();

      // Ordinary write changes same field 'name'
      await diskRepo.users.update('user-conflict-1', { name: 'Ordinary Loser Name' });

      barrierOrdinaryDone.signal();
      await txPromise;

      // Verify transaction-wins for same field
      const finalUser = await diskRepo.users.getById('user-conflict-1');
      assert.equal(finalUser?.name, 'Transaction Winner Name', 'Transaction wins on same-field conflict');

      // Cold reload check
      const coldRepo = new DiskJarvisDataRepository(diskPath);
      await coldRepo.init();
      const coldUser = await coldRepo.users.getById('user-conflict-1');
      assert.equal(coldUser?.name, 'Transaction Winner Name', 'Transaction winner survives cold reload');
      console.log('  -> Test 6 PASSED.');
    }

    console.log('=== ALL Stage 6.4.4.6 Tests PASSED Successfully! ===');
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

runTests().catch((err) => {
  console.error('Stage 6.4.4.6 Test Failed:', err);
  process.exit(1);
});
