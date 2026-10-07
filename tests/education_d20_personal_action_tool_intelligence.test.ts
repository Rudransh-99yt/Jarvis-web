import assert from 'node:assert';
import { personalToolRegistry } from '../server/personal/tools/toolRegistry.ts';
import { confirmationPolicy } from '../server/personal/tools/confirmationPolicy.ts';
import { personalNotesStore } from '../server/personal/tools/personalNotesStore.ts';
import { conversationEngine } from '../server/personal/conversationEngine.ts';
import { contextEngine } from '../server/personal/contextEngine.ts';
import { startHttpHarness } from './httpHarness.ts';
import { authService } from '../server/auth/tokens.ts';
import type {
  PersonalTool,
  PersonalToolExecutionContext
} from '../src/types/personalIdentity.ts';

console.log('=== [WEB JARVIS] PHASE 5: PERSONAL JARVIS ACTION + TOOL INTELLIGENCE TEST SUITE ===');

async function runPhase5TestSuite() {
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      throw err;
    }
  }

  const defaultExecContext: PersonalToolExecutionContext = {
    userId: 'student-1',
    contextId: 'ctx-student1-edu',
    contextType: 'EDUCATION',
    permissions: {
      canAccessInstitutionData: true,
      sharePersonalMemory: false
    }
  };

  // --------------------------------------------------------------------------
  // SECTION 1: Tool Registry & Discovery
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Tool Registry & Discovery ---');

  await test('1.1 Tool registry registers and discovers initial personal tools', () => {
    const tools = personalToolRegistry.listTools();
    assert.ok(tools.length >= 7, 'Must register at least 7 initial personal tools');

    const expectedTools = [
      'personal_knowledge_search',
      'personal_notes_create',
      'personal_notes_read',
      'personal_study_session_create',
      'personal_practice_session_start',
      'personal_flashcard_create',
      'personal_learning_progress_read',
      'personal_notes_delete',
      'personal_external_notify'
    ];

    for (const toolId of expectedTools) {
      const tool = personalToolRegistry.getTool(toolId);
      assert.ok(tool, `Tool '${toolId}' must be registered in registry`);
      assert.ok(tool.name);
      assert.ok(tool.description);
      assert.ok(tool.category);
      assert.ok(tool.riskLevel);
      assert.ok(tool.inputSchema);
    }
  });

  await test('1.2 Custom tool registration expands registry without breaking existing contracts', () => {
    const customTool: PersonalTool = {
      id: 'custom_unit_converter',
      name: 'Unit Converter',
      description: 'Converts between physics measurement units',
      category: 'study',
      riskLevel: 'READ_ONLY',
      inputSchema: {
        value: { type: 'number', description: 'Value to convert', required: true },
        from: { type: 'string', description: 'Source unit', required: true },
        to: { type: 'string', description: 'Target unit', required: true }
      },
      async execute(_ctx, args: { value: number; from: string; to: string }) {
        return {
          success: true,
          toolId: 'custom_unit_converter',
          data: { converted: args.value * 1000 },
          userMessage: `${args.value} ${args.from} = ${args.value * 1000} ${args.to}`
        };
      }
    };

    personalToolRegistry.registerTool(customTool);
    const retrieved = personalToolRegistry.getTool('custom_unit_converter');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.name, 'Unit Converter');
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Deterministic Input Validation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Deterministic Input Validation ---');

  await test('2.1 Input validation accepts valid arguments', () => {
    const res = personalToolRegistry.validateInput('personal_notes_create', {
      title: 'Newton Kinematics',
      content: 'Derivation of projectile trajectories.'
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors, undefined);
  });

  await test('2.2 Input validation rejects missing required arguments', () => {
    const res = personalToolRegistry.validateInput('personal_notes_create', {
      content: 'Missing title'
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors && res.errors.length > 0);
    assert.ok(res.errors[0].includes("Missing required parameter 'title'"));
  });

  await test('2.3 Input validation rejects incorrect argument data types', () => {
    const res = personalToolRegistry.validateInput('personal_study_session_create', {
      title: 'Valid Title',
      durationMinutes: 'forty-five' as any // Should be number
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors && res.errors[0].includes("Parameter 'durationMinutes' must be a number"));
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Safe Execution of READ_ONLY and LOW_RISK_WRITE Tools
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Safe Execution of READ_ONLY & LOW_RISK_WRITE Tools ---');

  await test('3.1 READ_ONLY: personal_knowledge_search executes and returns verified mastery', async () => {
    const result = await personalToolRegistry.executeTool('personal_knowledge_search', defaultExecContext, {
      query: 'newton'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.toolId, 'personal_knowledge_search');
    assert.ok(result.data.matches.length > 0);
    assert.ok(result.userMessage.includes("Newton's Laws"));
  });

  await test('3.2 READ_ONLY: personal_learning_progress_read returns mastery metrics and Next Best Action', async () => {
    const result = await personalToolRegistry.executeTool('personal_learning_progress_read', defaultExecContext, {
      subject: 'Physics'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.data.totalConcepts > 0);
    assert.ok(result.data.averageMastery > 0);
    assert.ok(result.userMessage.includes('Learning Progress Summary'));
  });

  await test('3.3 LOW_RISK_WRITE: personal_notes_create persists note without requiring confirmation', async () => {
    const noteTitle = `Electromagnetism Note ${Date.now()}`;
    const result = await personalToolRegistry.executeTool('personal_notes_create', defaultExecContext, {
      title: noteTitle,
      content: 'Maxwell equations unite electric and magnetic vector flux.',
      subject: 'Physics',
      tags: ['electromagnetism', 'maxwell']
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.data.note.id);
    assert.strictEqual(result.data.note.title, noteTitle);

    // Verify stored
    const notes = await personalNotesStore.getNotes('student-1', { query: noteTitle });
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0].title, noteTitle);
  });

  await test('3.4 LOW_RISK_WRITE: personal_flashcard_create saves card with USER_STATED provenance', async () => {
    const result = await personalToolRegistry.executeTool('personal_flashcard_create', defaultExecContext, {
      front: 'What is Lenz Law?',
      back: 'Induced EMF opposes the magnetic flux change producing it.',
      subject: 'Physics'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.data.card.id);
    assert.strictEqual(result.activityEvent?.provenance, 'USER_STATED');
  });

  await test('3.5 LOW_RISK_WRITE: personal_study_session_create schedules plan with EDUCATION_ACTIVITY provenance', async () => {
    const result = await personalToolRegistry.executeTool('personal_study_session_create', defaultExecContext, {
      title: 'Rotational Dynamics Drill',
      subject: 'Physics',
      durationMinutes: 60
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.data.plan.id);
    assert.strictEqual(result.activityEvent?.provenance, 'EDUCATION_ACTIVITY');
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Deterministic Confirmation Layer (HIGH_RISK_WRITE & EXTERNAL_ACTION)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Deterministic Confirmation Layer ---');

  await test('4.1 HIGH_RISK_WRITE: personal_notes_delete refuses direct execution and creates PendingConfirmationAction', async () => {
    const result = await personalToolRegistry.executeTool('personal_notes_delete', defaultExecContext, {
      deleteAll: true
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'CONFIRMATION_REQUIRED');
    assert.ok(result.metadata?.confirmationRequired);
    assert.ok(result.metadata?.pendingActionId);
    assert.ok(result.userMessage.includes('Confirmation Required'));

    // Check stored in ConfirmationPolicy
    const pending = confirmationPolicy.getPendingAction(result.metadata.pendingActionId);
    assert.ok(pending);
    assert.strictEqual(pending.userId, 'student-1');
    assert.strictEqual(pending.riskLevel, 'HIGH_RISK_WRITE');
  });

  await test('4.2 HIGH_RISK_WRITE: Executing confirmed action with token succeeds permanently', async () => {
    // 1. Create a test note to delete
    const testNote = await personalNotesStore.createNote('student-1', {
      title: 'Disposable Temporary Derivation',
      content: 'Temporary notes'
    });

    // 2. Request deletion -> should require confirmation
    const reqRes = await personalToolRegistry.executeTool('personal_notes_delete', defaultExecContext, {
      noteId: testNote.id
    });
    assert.strictEqual(reqRes.error?.code, 'CONFIRMATION_REQUIRED');
    const pendingId = reqRes.metadata!.pendingActionId;

    // 3. Confirm and execute
    const pendingAction = confirmationPolicy.consumePendingAction(pendingId, 'student-1');
    assert.ok(pendingAction);

    const execRes = await personalToolRegistry.executeTool(
      pendingAction.toolId,
      defaultExecContext,
      pendingAction.arguments,
      { bypassConfirmationCheck: true }
    );

    assert.strictEqual(execRes.success, true);
    assert.strictEqual(execRes.data.deletedNoteId, testNote.id);

    // Verify note is gone
    const lookup = await personalNotesStore.getNoteById('student-1', testNote.id);
    assert.strictEqual(lookup, null);
  });

  await test('4.3 EXTERNAL_ACTION: personal_external_notify requires deterministic confirmation', async () => {
    const result = await personalToolRegistry.executeTool('personal_external_notify', defaultExecContext, {
      recipient: 'Prof. Banner',
      subject: 'Lab Results',
      message: 'Completed kinematic friction measurements.'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'CONFIRMATION_REQUIRED');
    assert.strictEqual(result.metadata?.riskLevel, 'EXTERNAL_ACTION');
  });

  await test('4.4 Model / Client CANNOT bypass confirmation policy by falsifying flags', async () => {
    // Confirmation policy does NOT take boolean overrides from untrusted inputs
    const req = confirmationPolicy.evaluateConfirmationRequirement('HIGH_RISK_WRITE', true);
    assert.strictEqual(req, true, 'HIGH_RISK_WRITE must ALWAYS require confirmation');

    const extReq = confirmationPolicy.evaluateConfirmationRequirement('EXTERNAL_ACTION', true);
    assert.strictEqual(extReq, true, 'EXTERNAL_ACTION must ALWAYS require confirmation');
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Security, Context & User Boundary Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Security, Context & User Boundary Isolation ---');

  await test('5.1 Cross-user isolation: User A cannot read, modify, or delete User B personal notes', async () => {
    // User B creates a note
    const userBNote = await personalNotesStore.createNote('student-2', {
      title: 'Secret User B Notes',
      content: 'Confidential personal derivations'
    });

    // User A attempts to search notes
    const userANotes = await personalNotesStore.getNotes('student-1', { query: 'Secret User B' });
    assert.strictEqual(userANotes.length, 0, 'User A must not find User B notes');

    // User A attempts to delete User B note
    const userAContext: PersonalToolExecutionContext = {
      ...defaultExecContext,
      userId: 'student-1'
    };

    const delRes = await personalToolRegistry.executeTool('personal_notes_delete', userAContext, {
      noteId: userBNote.id
    }, { bypassConfirmationCheck: true });

    assert.strictEqual(delRes.success, false, 'User A cannot delete User B note');
    assert.strictEqual(delRes.error?.code, 'NOTE_NOT_FOUND');
  });

  await test('5.2 Cross-user isolation: User A cannot consume or confirm User B pending actions', () => {
    const pending = confirmationPolicy.createPendingAction({
      toolId: 'personal_notes_delete',
      userId: 'student-2',
      contextId: 'ctx-b',
      arguments: { deleteAll: true },
      riskLevel: 'HIGH_RISK_WRITE',
      previewSummary: 'Purge all student-2 data'
    });

    assert.throws(() => {
      confirmationPolicy.consumePendingAction(pending.id, 'student-1');
    }, /SECURITY_VIOLATION/, 'Consuming other user pending action must throw security violation');
  });

  await test('5.3 Context isolation: Institutional context without sharing consent cannot access personal notes', async () => {
    const institutionCtx: PersonalToolExecutionContext = {
      userId: 'student-1',
      contextId: 'ctx-inst-test',
      contextType: 'INSTITUTION',
      permissions: {
        canAccessInstitutionData: true,
        sharePersonalMemory: false // STRICTLY NO CONSENT
      }
    };

    const res = await personalToolRegistry.executeTool('personal_notes_read', institutionCtx, {});
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error?.code, 'FORBIDDEN');
    assert.ok(res.userMessage.includes('Institutional context cannot access'));
  });

  // --------------------------------------------------------------------------
  // SECTION 6: ConversationEngine Intent & Tool Routing Integration
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: ConversationEngine Intent & Tool Routing Integration ---');

  await test('6.1 Conversational request routes to standard Phase 4 context reasoning', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `conv-route-${Date.now()}`,
      userId: 'student-1',
      message: 'Why is linear momentum conserved during collisions?'
    });

    assert.ok(turn.reply);
    assert.notStrictEqual(turn.providerId, 'personal-tool-engine');
  });

  await test('6.2 Actionable note creation routes to personal_notes_create tool and responds naturally', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `act-note-${Date.now()}`,
      userId: 'student-1',
      message: 'Create a note titled "Quantum Born Rule Summary": The square of the wave function amplitude gives probability density.'
    });

    assert.strictEqual(turn.providerId, 'personal-tool-engine');
    assert.ok(turn.reply.includes('Quantum Born Rule Summary') || turn.reply.includes('created successfully'));

    // Check note was created
    const notes = await personalNotesStore.getNotes('student-1', { query: 'Quantum Born Rule' });
    assert.strictEqual(notes.length, 1);
  });

  await test('6.3 Actionable practice request routes to personal_practice_session_start', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `act-prac-${Date.now()}`,
      userId: 'student-1',
      message: "Let's practice Newton's Laws of Motion questions."
    });

    assert.strictEqual(turn.providerId, 'personal-tool-engine');
    assert.ok(turn.reply.includes('Practice session initialized') || turn.reply.includes("Newton's Laws"));
  });

  await test('6.4 Actionable high-risk deletion produces confirmation request in conversation', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `act-del-${Date.now()}`,
      userId: 'student-1',
      message: 'Delete all my physics notes.'
    });

    assert.strictEqual(turn.providerId, 'personal-tool-engine');
    assert.ok(turn.reply.includes('Confirmation Required') || turn.reply.includes('proceed with this action'));

    const lastMsg = turn.session.messages[turn.session.messages.length - 1];
    assert.strictEqual(lastMsg.metadata?.toolExecution?.confirmationRequired, true);
  });

  await test('6.5 User confirming in multi-turn conversation executes the pending action', async () => {
    const sessionId = `act-flow-${Date.now()}`;

    // Step 1: Create a note to delete
    await personalNotesStore.createNote('student-1', {
      title: 'DeleteMe Note',
      subject: 'Physics',
      content: 'Will be removed upon confirmation'
    });

    // Step 2: User requests deletion
    const turn1 = await conversationEngine.processConversationTurn({
      sessionId,
      userId: 'student-1',
      message: 'Delete all notes for physics.'
    });
    assert.ok(turn1.reply.includes('Confirmation Required'));

    // Step 3: User says "Yes, proceed with deletion"
    const turn2 = await conversationEngine.processConversationTurn({
      sessionId,
      userId: 'student-1',
      message: 'Yes, proceed with deletion.'
    });

    assert.ok(turn2.reply.includes('Successfully deleted') || turn2.reply.includes('deleted'));
  });

  // --------------------------------------------------------------------------
  // SECTION 7: HTTP REST API Integration
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: HTTP REST API Integration ---');

  const harness = await startHttpHarness();
  const baseUrl = harness.baseUrl;
  const token = authService.issueToken({ id: 'student-1' });
  const authHeaders = { Authorization: `Bearer ${token}` };

  try {
    await test('7.1 GET /api/personal/tools lists available tools with schemas', async () => {
      const res = await fetch(`${baseUrl}/api/personal/tools`, {
        headers: authHeaders
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.tools));
      assert.ok(data.tools.length >= 7);
      const searchTool = data.tools.find((t: any) => t.id === 'personal_knowledge_search');
      assert.ok(searchTool);
      assert.strictEqual(searchTool.riskLevel, 'READ_ONLY');
    });

    await test('7.2 POST /api/personal/tools/execute directly executes read-only tool', async () => {
      const res = await fetch(`${baseUrl}/api/personal/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          toolId: 'personal_knowledge_search',
          arguments: { query: 'newton' }
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.toolId, 'personal_knowledge_search');
      assert.ok(data.result.matches.length > 0);
    });

    await test('7.3 POST /api/personal/notes & GET /api/personal/notes REST API', async () => {
      // 1. Create note
      const createRes = await fetch(`${baseUrl}/api/personal/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          title: 'HTTP REST Test Note',
          content: 'Testing REST API endpoint for personal notes',
          subject: 'Physics',
          tags: ['test', 'http']
        })
      });
      assert.strictEqual(createRes.status, 200);
      const created = await createRes.json();
      assert.strictEqual(created.success, true);
      assert.strictEqual(created.note.title, 'HTTP REST Test Note');

      // 2. Query note
      const getRes = await fetch(`${baseUrl}/api/personal/notes?query=HTTP+REST`, {
        headers: authHeaders
      });
      assert.strictEqual(getRes.status, 200);
      const getNotes = await getRes.json();
      assert.strictEqual(getNotes.success, true);
      assert.ok(getNotes.notes.some((n: any) => n.id === created.note.id));

      // 3. Delete note
      const delRes = await fetch(`${baseUrl}/api/personal/notes/${created.note.id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      assert.strictEqual(delRes.status, 200);
      const delData = await delRes.json();
      assert.strictEqual(delData.success, true);
    });

    await test('7.4 POST /api/personal/flashcards & GET /api/personal/flashcards REST API', async () => {
      const createRes = await fetch(`${baseUrl}/api/personal/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          front: 'What is angular momentum?',
          back: 'L = r x p = I * omega',
          subject: 'Physics'
        })
      });
      assert.strictEqual(createRes.status, 200);
      const cardData = await createRes.json();
      assert.strictEqual(cardData.success, true);
      assert.strictEqual(cardData.flashcard.subject, 'Physics');

      const getRes = await fetch(`${baseUrl}/api/personal/flashcards?subject=Physics`, {
        headers: authHeaders
      });
      assert.strictEqual(getRes.status, 200);
      const listData = await getRes.json();
      assert.strictEqual(listData.success, true);
      assert.ok(listData.flashcards.length > 0);
    });
  } finally {
    await harness.close();
  }

  console.log(`\n==================================================`);
  console.log(`PHASE 5 TEST SUMMARY: ${passed}/${total} tests passed.`);
  console.log(`==================================================\n`);

  process.exit(0);
}

runPhase5TestSuite().catch((err) => {
  console.error('Fatal error in Phase 5 test suite:', err);
  process.exit(1);
});
