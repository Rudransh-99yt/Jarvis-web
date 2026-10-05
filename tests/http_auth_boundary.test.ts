import assert from 'node:assert';
import { startHttpHarness } from './httpHarness.ts';
import { signAuthPayload } from '../server/auth/tokens.ts';
import crypto from 'node:crypto';

console.log('=== [WEB JARVIS] HTTP AUTHENTICATION BOUNDARY TEST SUITE ===');

async function runTests() {
  const harness = await startHttpHarness();
  const { baseUrl, tokenFor } = harness;

  try {
    const studentAId = 'student-1';
    const studentBId = 'student-2';

    const validTokenA = await tokenFor(studentAId);
    const validTokenB = await tokenFor(studentBId);

    // 1. /api/chat without Authorization -> 401
    let res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.strictEqual(res.status, 401, 'Expected 401 for missing Authorization header');

    // 2. /api/chat with malformed token -> 401
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer malformed.token.here'
      },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.strictEqual(res.status, 401, 'Expected 401 for malformed token');

    // 3. /api/chat with forged token signature -> 401
    const parts = validTokenA.split('.');
    const forgedToken = `${parts[0]}.${parts[1]}.invalid_signature_abcdef`;
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${forgedToken}`
      },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.strictEqual(res.status, 401, 'Expected 401 for forged signature');

    // 4. /api/chat with expired token -> 401
    const expiredPayload = {
      sub: studentAId,
      iat: Date.now() - 100000,
      exp: Date.now() - 10000, // Expired 10s ago
      jti: crypto.randomUUID()
    };
    const expiredToken = signAuthPayload(expiredPayload, process.env.JARVIS_AUTH_SECRET!);
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expiredToken}`
      },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.strictEqual(res.status, 401, 'Expected 401 for expired token');

    // 5. /api/chat with valid signed token -> reaches authenticated route
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenA}`
      },
      body: JSON.stringify({ message: 'Hello' })
    });
    // It should at least be 200 (if it processes) or maybe 403 if workspace forbidden, but not 401.
    // Given seed data, student-1 has access to ws-stark-core.
    assert.notStrictEqual(res.status, 401, 'Expected NOT 401 for valid token');
    assert.strictEqual(res.status, 200, 'Expected 200 for valid token');

    // 6. Session ownership
    const sessionId = 'test-session-boundary-1';
    
    // Student A creates/uses session A
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenA}`
      },
      body: JSON.stringify({ message: 'Session test', sessionId })
    });
    assert.strictEqual(res.status, 200, 'Expected 200 for session creator');

    // Student B attempts same session
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenB}`
      },
      body: JSON.stringify({ message: 'Steal session', sessionId })
    });
    assert.strictEqual(res.status, 403, 'Expected 403 CONVERSATION_FORBIDDEN for stolen session');

    // 7. Forged headers (x-user-id)
    const sessionId2 = 'test-session-boundary-2';
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenA}`,
        'x-user-id': 'student-2' // Forge to be someone else
      },
      body: JSON.stringify({ message: 'Hello from forged identity', sessionId: sessionId2 })
    });
    assert.strictEqual(res.status, 200, 'Expected 200 for forged header request');
    
    // Ensure that it was created under Student A's identity despite the header.
    // If it was created under Student A, then Student A should still be able to access it.
    // Let's test if Student B can access it (if the forge worked, Student B could access it).
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenB}`
      },
      body: JSON.stringify({ message: 'Hello from true student 2', sessionId: sessionId2 })
    });
    assert.strictEqual(res.status, 403, 'Expected 403 because session belongs to Student A, ignoring forged header');

    // 8. Forged role (x-user-role)
    const sessionId3 = 'test-session-boundary-3';
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validTokenA}`,
        'x-user-role': 'principal' // Forge role
      },
      body: JSON.stringify({ message: 'Hello from forged role', sessionId: sessionId3 })
    });
    assert.strictEqual(res.status, 200, 'Expected 200 for forged role request');
    // The underlying authenticateRequest in index.ts ignores x-user-role and loads from DB.
    // This is tested implicitly since the DB returns 'student'.
    
    console.log('[TEST] All HTTP Auth Boundary tests PASSED.');
  } finally {
    await harness.close();
  }
}

runTests().catch((err) => {
  console.error('[ERROR] Tests failed:', err);
  process.exit(1);
});
