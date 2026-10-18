import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { personalMemoryStore } from '../server/personal/memoryStore.ts';
import { personalKnowledgeStore } from '../server/personal/knowledgeStore.ts';
import { diagnosticService } from '../server/personal/diagnosticService.ts';

async function runTests() {
  console.log('=== [STAGE 6.4.2] PERSONAL-STORE REPOSITORY INTEGRATION TEST SUITE ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-2-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_2_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Suite 1: Disk Repository Reinitialization & Personal Identity Persistence
    // --------------------------------------------------------------------------
    console.log('--- Suite 1: Personal Identity Persistence Across Disk Reinitialization ---');
    {
      const diskRepo1 = new DiskJarvisDataRepository(diskPath);
      await diskRepo1.init();
      setActiveRepository(diskRepo1);

      // Fetch student-1 identity
      const identBefore = await personalIdentityStore.getIdentity('student-1');
      assert.strictEqual(identBefore.userId, 'student-1');
      assert.strictEqual(identBefore.profile.displayName, 'Alex Stark');

      // Update preferences and add a new goal
      await personalIdentityStore.updateIdentity('student-1', {
        preferences: {
          ...identBefore.preferences,
          hudTheme: 'amber_tactical'
        },
        goals: [
          ...identBefore.goals,
          {
            id: 'goal-stage6-4-2',
            title: 'Verify Disk Persistence Architecture',
            category: 'system',
            progressPercent: 100,
            status: 'completed'
          }
        ]
      });

      // Register new user cadet-persist-1 via onboarding
      await personalIdentityStore.processProgressiveOnboarding({
        userId: 'cadet-persist-1',
        name: 'Cadet Persist',
        primaryRole: 'student',
        pathChoice: 'personal',
        interests: ['Quantum Physics']
      });

      // Simulate cold process restart by creating a new DiskJarvisDataRepository pointing to same file
      const diskRepo2 = new DiskJarvisDataRepository(diskPath);
      await diskRepo2.init();
      setActiveRepository(diskRepo2);

      const identAfter = await personalIdentityStore.getIdentity('student-1');
      assert.strictEqual(identAfter.preferences.hudTheme, 'amber_tactical', 'Updated preference must survive disk reinitialization');
      assert.ok(
        identAfter.goals.some((g) => g.id === 'goal-stage6-4-2'),
        'New goal must survive disk reinitialization'
      );

      const cadetAfter = await personalIdentityStore.getIdentity('cadet-persist-1');
      assert.strictEqual(cadetAfter.userId, 'cadet-persist-1', 'Newly onboarded user must survive disk reinitialization');
      console.log('[PASS] 1.1 Personal identity and preferences survive disk-repository reinitialization');
    }

    // --------------------------------------------------------------------------
    // Suite 2: Personal Memories Persistence & Ownership Boundaries
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 2: Personal Memories Persistence & Isolation ---');
    {
      const diskRepo1 = new DiskJarvisDataRepository(diskPath);
      await diskRepo1.init();
      setActiveRepository(diskRepo1);

      // Add memories for student-1 and student-2
      const mem1 = await personalMemoryStore.addMemory({
        userId: 'student-1',
        category: 'UserPreference',
        key: 'proof_preference',
        value: 'Prefers formal epsilon-delta limit proofs before heuristic step approximations.',
        source: 'USER_STATED',
        confidence: 1.0,
        contextId: 'ctx-student1-edu',
        visibility: 'PRIVATE_PERSONAL',
        provenance: {
          sourceEntityType: 'settings',
          timestamp: new Date().toISOString(),
          notes: 'Added during Stage 6.4.2 test run'
        }
      });

      const mem2 = await personalMemoryStore.addMemory({
        userId: 'student-2',
        category: 'UserGoal',
        key: 'math_target',
        value: 'Master Fourier Transform Analysis',
        source: 'USER_STATED',
        confidence: 1.0,
        contextId: 'ctx-student2-edu',
        visibility: 'PRIVATE_PERSONAL',
        provenance: {
          sourceEntityType: 'onboarding',
          timestamp: new Date().toISOString(),
          notes: 'Student 2 goal'
        }
      });

      // Confirm system memory
      await personalMemoryStore.confirmSystemMemory(mem1.id, 'student-1');

      // Simulate cold process restart
      const diskRepo2 = new DiskJarvisDataRepository(diskPath);
      await diskRepo2.init();
      setActiveRepository(diskRepo2);

      const student1Memories = await personalMemoryStore.getMemories('student-1');
      const foundMem1 = student1Memories.find((m) => m.id === mem1.id);
      assert.ok(foundMem1, 'Student 1 memory must persist across restart');
      assert.strictEqual(foundMem1?.source, 'USER_CONFIRMED', 'Confirmed status must survive restart');
      assert.strictEqual(foundMem1?.confidence, 1.0);

      // User isolation check: student 1 cannot see student 2 memories
      const student1AllMemories = await personalMemoryStore.getMemories('student-1');
      assert.strictEqual(
        student1AllMemories.some((m) => m.id === mem2.id),
        false,
        'Student 1 must not see Student 2 memories'
      );

      // Confirmation ownership check: student 2 cannot confirm student 1 memory
      const unauthConfirm = await personalMemoryStore.confirmSystemMemory(mem1.id, 'student-2');
      assert.strictEqual(unauthConfirm, null, 'Unauthorized user cannot confirm another user memory');

      console.log('[PASS] 2.1 Personal memories retain ownership, provenance, and context visibility after reinitialization');
    }

    // --------------------------------------------------------------------------
    // Suite 3: Personal Knowledge & Mastery Persistence
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 3: Personal Knowledge & Concept Mastery Persistence ---');
    {
      const diskRepo1 = new DiskJarvisDataRepository(diskPath);
      await diskRepo1.init();
      setActiveRepository(diskRepo1);

      // Record concept mastery update for student-1
      const conceptState = await personalKnowledgeStore.recordConceptMastery('student-1', {
        conceptName: 'Thermodynamic Carnot Engines',
        subject: 'Physics',
        masteryDelta: 0.35,
        provenanceSource: 'test-stage6-4-2'
      });
      assert.strictEqual(conceptState.conceptName, 'Thermodynamic Carnot Engines');

      // Simulate cold process restart
      const diskRepo2 = new DiskJarvisDataRepository(diskPath);
      await diskRepo2.init();
      setActiveRepository(diskRepo2);

      const knowledgeAfter = await personalKnowledgeStore.getKnowledge('student-1');
      const savedConcept = Object.values(knowledgeAfter.concepts).find(
        (c) => c.conceptName.toLowerCase() === 'thermodynamic carnot engines'
      );
      assert.ok(savedConcept, 'Mastery state must survive restart');
      assert.strictEqual(savedConcept?.masteryLevel, 0.85);
      assert.strictEqual(savedConcept?.status, 'mastered');

      // Cross-user authorization check
      const student2Knowledge = await personalKnowledgeStore.getKnowledge('student-2');
      const leakedConcept = Object.values(student2Knowledge.concepts).find(
        (c) => c.conceptName.toLowerCase() === 'thermodynamic carnot engines'
      );
      assert.strictEqual(leakedConcept, undefined, 'Student 2 cannot see Student 1 concept mastery');

      console.log('[PASS] 3.1 Knowledge and mastery state persist without bypassing existing authorization');
    }

    // --------------------------------------------------------------------------
    // Suite 4: Memory-Backed Repository Compatibility
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 4: Memory Repository Compatibility ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);

      const ident = await personalIdentityStore.getIdentity('student-mem-1');
      assert.strictEqual(ident.userId, 'student-mem-1');

      const updated = await personalIdentityStore.updateIdentity('student-mem-1', {
        interests: ['Quantum Optics']
      });
      assert.ok(updated.interests.includes('Quantum Optics'));

      const mem = await personalMemoryStore.addMemory({
        userId: 'student-mem-1',
        category: 'UserPreference',
        key: 'tone',
        value: 'analytical',
        source: 'USER_STATED',
        contextId: 'ctx-mem-1',
        provenance: { sourceEntityType: 'settings', timestamp: new Date().toISOString() }
      });
      assert.ok(mem.id);

      const memories = await personalMemoryStore.getMemories('student-mem-1');
      assert.strictEqual(memories.length, 1);

      const k = await personalKnowledgeStore.recordConceptMastery('student-mem-1', {
        conceptName: 'Linear Algebra Eigenvalues',
        subject: 'Mathematics',
        masteryDelta: 0.30,
        provenanceSource: 'test-mem'
      });
      assert.strictEqual(k.masteryLevel, 0.80);

      console.log('[PASS] 4.1 Memory-backed repository remains fully compatible with personal stores');
    }

  } finally {
    resetActiveRepository();
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }

  console.log('\n======================================================');
  console.log('ALL STAGE 6.4.2 PERSONAL REPOSITORY INTEGRATION TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
