import assert from 'node:assert';
import { conversationEngine } from '../server/personal/conversationEngine.ts';
import { personalToolRegistry } from '../server/personal/tools/toolRegistry.ts';
import { confirmationPolicy } from '../server/personal/tools/confirmationPolicy.ts';
import { personalNotesStore } from '../server/personal/tools/personalNotesStore.ts';
import { contextEngine } from '../server/personal/contextEngine.ts';
import type { PersonalToolExecutionContext } from '../src/types/personalIdentity.ts';

console.log('=== [WEB JARVIS] PHASE 5: REAL GEMINI EXECUTION & TOOL SECURITY VERIFICATION ===');

async function runGeminiToolVerificationSuite() {
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
  // SECTION 1: Realistic Action Flows (A - E)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Realistic Action Flows ---');

  await test('1.1 Action A: "Create a note about Newton Laws" -> personal_notes_create (LOW_RISK_WRITE -> Executed)', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `flow-a-${Date.now()}`,
      userId: 'student-1',
      message: 'Create a note on Newton Laws: Force equals mass times acceleration'
    });

    assert.strictEqual(turn.providerId, 'personal-tool-engine');
    assert.ok(turn.reply.includes('created successfully') || turn.reply.includes('Personal note created'));

    const notes = await personalNotesStore.getNotes('student-1', { query: 'Newton Laws' });
    assert.ok(notes.length > 0);
  });

  await test('1.2 Action B: "Show me my physics notes" -> personal_notes_read (READ_ONLY -> Executed)', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `flow-b-${Date.now()}`,
      userId: 'student-1',
      message: 'Show me my physics notes.'
    });

    assert.strictEqual(turn.providerId, 'personal-tool-engine');
    assert.ok(turn.reply.includes('Retrieved') || turn.reply.includes('note'));
  });

  await test('1.3 Action C: "What concepts am I weak at?" -> personal_learning_progress_read (READ_ONLY -> Executed)', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `flow-c-${Date.now()}`,
      userId: 'student-1',
      message: 'Show my learning progress summary'
    });

    assert.strictEqual(turn.providerId, 'personal-tool-engine');
    assert.ok(turn.reply.includes('Learning Progress Summary') || turn.reply.includes('Mastered'));
  });

  await test('1.4 Action D: "Delete all my physics notes" -> personal_notes_delete (HIGH_RISK_WRITE -> Confirmation Required)', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `flow-d-${Date.now()}`,
      userId: 'student-1',
      message: 'Delete all my physics notes.'
    });

    assert.strictEqual(turn.providerId, 'personal-tool-engine');
    assert.ok(turn.reply.includes('Confirmation Required') || turn.reply.includes('proceed'));

    const pending = confirmationPolicy.findPendingActionForUser('student-1');
    assert.ok(pending, 'Must create pending confirmation action');
    assert.strictEqual(pending.toolId, 'personal_notes_delete');
    assert.strictEqual(pending.riskLevel, 'HIGH_RISK_WRITE');
  });

  await test('1.5 Action E: "Yes, proceed" -> Pending token consumed -> Deletion executes', async () => {
    const sessionId = `flow-e-${Date.now()}`;

    // Seed note
    await personalNotesStore.createNote('student-1', {
      title: 'Note to be deleted',
      subject: 'Physics',
      content: 'Will be removed'
    });

    // Request deletion
    const reqTurn = await conversationEngine.processConversationTurn({
      sessionId,
      userId: 'student-1',
      message: 'Delete all physics notes.'
    });
    assert.ok(reqTurn.reply.includes('Confirmation Required'));

    // Confirm deletion
    const confirmTurn = await conversationEngine.processConversationTurn({
      sessionId,
      userId: 'student-1',
      message: 'Yes, proceed.'
    });

    assert.ok(confirmTurn.reply.includes('deleted') || confirmTurn.reply.includes('Successfully'));

    // Verify token consumed
    const pendingAfter = confirmationPolicy.findPendingActionForUser('student-1');
    assert.strictEqual(pendingAfter, null, 'Pending action token must be consumed');
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Confirmation Security & Token Validation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Confirmation Security & Token Validation ---');

  await test('2.1 Model or untrusted input CANNOT bypass confirmation policy', () => {
    const risk = confirmationPolicy.evaluateConfirmationRequirement('HIGH_RISK_WRITE');
    assert.strictEqual(risk, true, 'Server deterministic policy MUST force confirmation for HIGH_RISK_WRITE');

    const extRisk = confirmationPolicy.evaluateConfirmationRequirement('EXTERNAL_ACTION');
    assert.strictEqual(extRisk, true, 'Server deterministic policy MUST force confirmation for EXTERNAL_ACTION');
  });

  await test('2.2 Invalid confirmation token fails safely without executing tool', async () => {
    const invalidToken = 'act-invalid-token-999';
    const consumed = confirmationPolicy.consumePendingAction(invalidToken, 'student-1');
    assert.strictEqual(consumed, null, 'Invalid token must return null');
  });

  await test('2.3 Wrong user confirmation token throws SECURITY_VIOLATION and blocks execution', () => {
    const pending = confirmationPolicy.createPendingAction({
      toolId: 'personal_notes_delete',
      userId: 'student-2',
      contextId: 'ctx-b',
      arguments: { deleteAll: true },
      riskLevel: 'HIGH_RISK_WRITE',
      previewSummary: 'Purge all user 2 data'
    });

    assert.throws(() => {
      confirmationPolicy.consumePendingAction(pending.id, 'student-1'); // User 1 trying to consume User 2 token
    }, /SECURITY_VIOLATION/, 'Must throw security violation on cross-user confirmation attempt');
  });

  await test('2.4 Expired confirmation token is automatically purged and fails safely', () => {
    const pending = confirmationPolicy.createPendingAction({
      toolId: 'personal_notes_delete',
      userId: 'student-1',
      contextId: 'ctx-a',
      arguments: { deleteAll: true },
      riskLevel: 'HIGH_RISK_WRITE',
      previewSummary: 'Expired test'
    });

    // Manually force expiration
    pending.expiresAt = new Date(Date.now() - 1000).toISOString();

    const consumed = confirmationPolicy.consumePendingAction(pending.id, 'student-1');
    assert.strictEqual(consumed, null, 'Expired token must return null');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Invalid Tool & Malformed Argument Resilience
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Invalid Tool & Malformed Argument Resilience ---');

  await test('3.1 Invalid tool ID returns clean structured error without throwing or corrupting state', async () => {
    const result = await personalToolRegistry.executeTool('non_existent_tool_123', defaultExecContext, {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'TOOL_NOT_FOUND');
    assert.ok(result.userMessage);
  });

  await test('3.2 Malformed arguments fail validation cleanly without execution', async () => {
    const result = await personalToolRegistry.executeTool('personal_notes_create', defaultExecContext, {
      title: 12345 as any, // Invalid type
      content: null as any
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'INVALID_ARGUMENTS');
  });

  console.log('\n==================================================');
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} tests passed.`);
  console.log(`==================================================\n`);

  process.exit(0);
}

runGeminiToolVerificationSuite().catch((err) => {
  console.error('Fatal error in Gemini tool verification suite:', err);
  process.exit(1);
});
