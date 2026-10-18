// JARVIS-WEB — MILESTONE 1, BATCH 2: CORS, CHAT CONTRACT & MULTI-USER ISOLATION REGRESSION TEST SUITE
import assert from 'node:assert';
import { startHttpHarness } from './httpHarness.ts';
import {
  resolveAllowedOrigins,
  isOriginAllowed
} from '../server/security/corsAndHeaders.ts';
import { sessionStore } from '../server/session/sessionStore.ts';
import { jarvisData } from '../server/data/index.ts';

async function runMilestone1Batch2Tests() {
  console.log('========================================================================');
  console.log('=== [JARVIS-WEB] MILESTONE 1, BATCH 2: CORS, CHAT & ISOLATION SUITE ===');
  console.log('========================================================================\n');

  let harness: Awaited<ReturnType<typeof startHttpHarness>> | null = null;

  try {
    // =========================================================================
    // SECTION 1: CORS & HTTP SECURITY HARDENING
    // =========================================================================
    console.log('--- Section 1: CORS & HTTP Security Hardening ---');

    // 1.1 Production fail-closed behavior without configured origins
    const prodOriginsEmpty = resolveAllowedOrigins(true);
    assert.strictEqual(
      isOriginAllowed('https://evil-attacker.com', true, prodOriginsEmpty),
      false,
      'Production must reject origins when no ALLOWED_ORIGINS configured'
    );
    assert.strictEqual(
      isOriginAllowed('http://localhost:3000', true, prodOriginsEmpty),
      false,
      'Production must fail closed even for localhost when unconfigured'
    );

    // 1.2 Production explicit allowlist with normalization and lookalike domain rejection
    const origAllowedEnv = process.env.ALLOWED_ORIGINS;
    const origNodeEnv = process.env.NODE_ENV;
    const origReqCors = process.env.REQUIRE_CORS;

    process.env.ALLOWED_ORIGINS = 'https://app.stark.edu/, https://admin.stark.edu ';
    const prodOriginsConfigured = resolveAllowedOrigins(true);
    assert.strictEqual(prodOriginsConfigured.includes('https://app.stark.edu'), true, 'Trailing slash must be normalized away');
    assert.strictEqual(prodOriginsConfigured.includes('https://admin.stark.edu'), true);
    assert.strictEqual(isOriginAllowed('https://app.stark.edu', true, prodOriginsConfigured), true);
    assert.strictEqual(isOriginAllowed('https://app.stark.edu/', true, prodOriginsConfigured), true);

    // Lookalike domain attack: must strictly reject subdomain and suffix spoofing
    assert.strictEqual(isOriginAllowed('https://app.stark.edu.attacker.com', true, prodOriginsConfigured), false);
    assert.strictEqual(isOriginAllowed('https://attacker-app.stark.edu', true, prodOriginsConfigured), false);
    assert.strictEqual(isOriginAllowed('https://app.stark.edu:8443', true, prodOriginsConfigured), false);
    assert.strictEqual(isOriginAllowed('javascript:alert(1)', true, prodOriginsConfigured), false);
    assert.strictEqual(isOriginAllowed('ftp://app.stark.edu', true, prodOriginsConfigured), false);
    assert.strictEqual(isOriginAllowed('null', true, prodOriginsConfigured), false);

    // 1.3 Startup validation errors for malformed production CORS configuration
    process.env.NODE_ENV = 'production';

    // Wildcard in production must throw
    process.env.ALLOWED_ORIGINS = 'https://app.stark.edu, *';
    let wildcardThrew = false;
    try {
      const { validateCorsConfiguration } = await import('../server/security/corsAndHeaders.ts');
      validateCorsConfiguration();
    } catch (e: any) {
      if (e.message.includes('Wildcard (*) origin is prohibited')) wildcardThrew = true;
    }
    assert.strictEqual(wildcardThrew, true, 'Production must throw on wildcard origin configuration');

    // Malformed URL in production must throw
    process.env.ALLOWED_ORIGINS = 'not-a-valid-url';
    let malformedThrew = false;
    try {
      const { validateCorsConfiguration } = await import('../server/security/corsAndHeaders.ts');
      validateCorsConfiguration();
    } catch (e: any) {
      if (e.message.includes('Invalid or malformed origin')) malformedThrew = true;
    }
    assert.strictEqual(malformedThrew, true, 'Production must throw on malformed origin URL');

    // REQUIRE_CORS missing origins in production must throw
    delete process.env.ALLOWED_ORIGINS;
    process.env.REQUIRE_CORS = 'true';
    let missingRequiredThrew = false;
    try {
      const { validateCorsConfiguration } = await import('../server/security/corsAndHeaders.ts');
      validateCorsConfiguration();
    } catch (e: any) {
      if (e.message.includes('ALLOWED_ORIGINS or PUBLIC_APP_URL is required')) missingRequiredThrew = true;
    }
    assert.strictEqual(missingRequiredThrew, true, 'Production must throw if REQUIRE_CORS is true and origins are missing');

    // Restore environment
    if (origAllowedEnv !== undefined) process.env.ALLOWED_ORIGINS = origAllowedEnv; else delete process.env.ALLOWED_ORIGINS;
    if (origNodeEnv !== undefined) process.env.NODE_ENV = origNodeEnv; else delete process.env.NODE_ENV;
    if (origReqCors !== undefined) process.env.REQUIRE_CORS = origReqCors; else delete process.env.REQUIRE_CORS;

    // 1.4 Local development origin behavior
    const devOrigins = resolveAllowedOrigins(false);
    assert.strictEqual(isOriginAllowed('http://localhost:3000', false, devOrigins), true);
    assert.strictEqual(isOriginAllowed('http://127.0.0.1:5173', false, devOrigins), true);
    assert.strictEqual(isOriginAllowed('http://localhost:8080', false, devOrigins), true);
    assert.strictEqual(isOriginAllowed('https://attacker.com', false, devOrigins), false);
    assert.strictEqual(isOriginAllowed(undefined, false, devOrigins), true, 'Same-origin without origin header is allowed');

    console.log('  ✓ 1.1-1.4 CORS policy, lookalike domain rejection & startup validation passed');

    // Start HTTP harness for server integration tests
    harness = await startHttpHarness();
    const baseUrl = harness.baseUrl;

    // 1.4 Preflight OPTIONS request from allowed origin
    const preflightAllowed = await fetch(`${baseUrl}/api/chat`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization, x-user-id, x-user-role'
      }
    });
    assert.strictEqual(preflightAllowed.status, 204, 'Allowed preflight must return 204 No Content');
    assert.strictEqual(
      preflightAllowed.headers.get('Access-Control-Allow-Origin'),
      'http://localhost:3000',
      'Preflight must return caller origin in Access-Control-Allow-Origin'
    );
    assert.strictEqual(
      preflightAllowed.headers.get('Access-Control-Allow-Credentials'),
      'true',
      'Credentials must be allowed for allowed origins'
    );
    assert(
      (preflightAllowed.headers.get('Access-Control-Allow-Headers') || '').includes('Authorization'),
      'Access-Control-Allow-Headers must include Authorization'
    );
    assert.strictEqual(
      (preflightAllowed.headers.get('Access-Control-Allow-Headers') || '').includes('x-user-id'),
      false,
      'Access-Control-Allow-Headers must not advertise x-user-id as an auth header'
    );
    assert.strictEqual(
      (preflightAllowed.headers.get('Access-Control-Allow-Headers') || '').includes('x-user-role'),
      false,
      'Access-Control-Allow-Headers must not advertise x-user-role as an auth header'
    );
    assert.strictEqual(
      preflightAllowed.headers.get('Access-Control-Max-Age'),
      '86400',
      'Access-Control-Max-Age should be 86400'
    );

    // 1.5 Preflight OPTIONS request from disallowed origin
    const preflightDisallowed = await fetch(`${baseUrl}/api/chat`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://attacker-site.evil.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.strictEqual(preflightDisallowed.status, 403, 'Disallowed preflight must return 403 Forbidden');
    const preflightErr = await preflightDisallowed.json();
    assert.strictEqual(preflightErr.error.code, 'CORS_FORBIDDEN');
    assert.strictEqual(
      preflightDisallowed.headers.get('Access-Control-Allow-Origin'),
      null,
      'Disallowed preflight must not receive Access-Control-Allow-Origin'
    );

    // 1.6 Security headers present on responses
    assert.strictEqual(preflightAllowed.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.strictEqual(preflightAllowed.headers.get('X-XSS-Protection'), '1; mode=block');
    assert.strictEqual(preflightAllowed.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');

    console.log('  ✓ 1.4-1.6 HTTP preflight and security headers verified');

    // =========================================================================
    // SECTION 2: CHAT API CONTRACT ALIGNMENT
    // =========================================================================
    console.log('\n--- Section 2: Chat API Contract Alignment ---');

    const studentToken = await harness.tokenFor('student-1');
    const teacherToken = await harness.tokenFor('teacher-1');
    const tonyToken = await harness.tokenFor('user-tony'); // commander / admin

    // 2.1 Authenticated unary request
    const unaryRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        message: 'Hello Jarvis, this is an authenticated test.'
      })
    });
    assert.strictEqual(unaryRes.status, 200, 'Authenticated chat request must return 200');
    const unaryData = await unaryRes.json();
    assert(unaryData.id, 'Chat response must have id');
    assert(unaryData.sessionId, 'Chat response must have sessionId');
    assert(typeof unaryData.reply === 'string' && unaryData.reply.length > 0, 'Chat response must have non-empty reply');
    assert(unaryData.source === 'gemini' || unaryData.source === 'server-mock', 'Source must be valid provider');
    assert(unaryData.timestamp, 'Chat response must include timestamp');

    // 2.2 SmartBoard messages array payload compatibility
    const smartBoardRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Explain kinematics for grade 11 physics.' }
        ],
        context: {
          activeSector: 'education',
          topic: 'Kinematics'
        }
      })
    });
    assert.strictEqual(smartBoardRes.status, 200, 'SmartBoard messages array payload must return 200');
    const smartBoardData = await smartBoardRes.json();
    assert(smartBoardData.reply && smartBoardData.reply.length > 0);

    // 2.3 Unauthenticated request rejection
    const unauthRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Unauthenticated prompt' })
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    const unauthData = await unauthRes.json();
    assert.strictEqual(unauthData.error.code, 'UNAUTHENTICATED');

    // 2.4 Forged token rejection
    const forgedRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.invalid.signature'
      },
      body: JSON.stringify({ message: 'Forged prompt' })
    });
    assert.strictEqual(forgedRes.status, 401, 'Forged token must return 401');

    // 2.5 Invalid payloads (empty, whitespace, missing)
    const emptyRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({})
    });
    assert.strictEqual(emptyRes.status, 400, 'Empty payload must return 400');
    const emptyData = await emptyRes.json();
    assert.strictEqual(emptyData.error.code, 'INVALID_REQUEST');

    const whitespaceRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ message: '   ' })
    });
    assert.strictEqual(whitespaceRes.status, 400, 'Whitespace message must return 400');

    // 2.6 Streaming SSE delivery
    const streamRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        message: 'Provide a brief summary of quantum mechanics',
        stream: true
      })
    });
    assert.strictEqual(streamRes.status, 200, 'Streaming request must return 200');
    assert(
      streamRes.headers.get('content-type')?.includes('text/event-stream'),
      'Content-type must be text/event-stream'
    );
    const streamBody = await streamRes.text();
    assert(streamBody.includes('"type":"start"'), 'Stream must contain start event');
    assert(streamBody.includes('"type":"done"'), 'Stream must contain done event');

    console.log('  ✓ 2.1-2.6 Chat API contract, validations and streaming verified');

    // =========================================================================
    // SECTION 3: REQUEST CONTEXT & MULTI-USER ISOLATION
    // =========================================================================
    console.log('\n--- Section 3: Request Context & Multi-User Isolation ---');

    // 3.1 Strict workspace authorization check
    // Create an isolated personal workspace owned exclusively by Teacher 1
    const teacherOnlyWs = await jarvisData.workspaces.create({
      id: `ws-teacher-private-${Date.now()}`,
      name: 'Teacher Private Workspace',
      ownerId: 'teacher-1'
    });

    // Student 1 attempts to query chat within Teacher 1's private workspace
    const crossWsRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        message: 'Attempting cross-workspace access',
        context: { workspaceId: teacherOnlyWs.id }
      })
    });
    assert.strictEqual(crossWsRes.status, 403, 'Unauthorized workspace access must return 403 WORKSPACE_FORBIDDEN');
    const crossWsData = await crossWsRes.json();
    assert.strictEqual(crossWsData.error.code, 'WORKSPACE_FORBIDDEN');

    // Teacher 1 (owner) can access their own workspace
    const teacherWsRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        message: 'Teacher legitimate access',
        context: { workspaceId: teacherOnlyWs.id }
      })
    });
    assert.strictEqual(teacherWsRes.status, 200, 'Workspace owner must have access');

    // Tony (commander/admin) can access any workspace
    const commanderWsRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tonyToken}`
      },
      body: JSON.stringify({
        message: 'Commander privileged access',
        context: { workspaceId: teacherOnlyWs.id }
      })
    });
    assert.strictEqual(commanderWsRes.status, 200, 'Commander must have access to any workspace');

    // 3.2 SessionStore sync cache tenant isolation
    const isolatedSessionId = `sess-iso-${Date.now()}`;

    // Student 1 creates isolatedSessionId
    const createIsoRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        message: 'Student private conversation',
        sessionId: isolatedSessionId
      })
    });
    assert.strictEqual(createIsoRes.status, 200);

    // Teacher 1 attempts to hijack or read Student 1's active session
    const hijackRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        message: 'Attempting to hijack session',
        sessionId: isolatedSessionId
      })
    });
    assert.strictEqual(hijackRes.status, 403, 'Session hijacking across users must return 403 CONVERSATION_FORBIDDEN');
    const hijackData = await hijackRes.json();
    assert.strictEqual(hijackData.error.code, 'CONVERSATION_FORBIDDEN');

    // 3.2.b Privileged role (commander/admin) cannot hijack student's private session
    const commanderHijackRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tonyToken}`
      },
      body: JSON.stringify({
        message: 'Commander attempting to access student private session',
        sessionId: isolatedSessionId
      })
    });
    assert.strictEqual(commanderHijackRes.status, 403, 'Privileged role must not bypass session owner isolation');
    const commanderHijackData = await commanderHijackRes.json();
    assert.strictEqual(commanderHijackData.error.code, 'CONVERSATION_FORBIDDEN');

    // Student 1 continues their session with continuity
    const continueIsoRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        message: 'Continuing student private conversation',
        sessionId: isolatedSessionId
      })
    });
    assert.strictEqual(continueIsoRes.status, 200, 'Original session owner retains access');

    // 3.3 Direct SessionStore sync cache synchronous boundary assertion
    const directSessionId = `direct-sess-${Date.now()}`;
    // User A registers in cache
    sessionStore.getOrCreateSession(directSessionId, 'ws-stark-core', 'student-1');

    // User B immediately calls syncCache with mismatched userId
    let caughtSyncError = false;
    try {
      sessionStore.getOrCreateSession(directSessionId, 'ws-stark-core', 'teacher-1');
    } catch (err: any) {
      if (err.message === 'CONVERSATION_FORBIDDEN') {
        caughtSyncError = true;
      }
    }
    assert.strictEqual(caughtSyncError, true, 'SessionStore must synchronously reject mismatched user session');

    // 3.4 Concurrent interleaved requests from distinct users
    const concurrencyRounds = 8;
    const concurrentPromises = [];

    for (let i = 0; i < concurrencyRounds; i++) {
      const studentPromise = fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          message: `Student concurrent question ${i}`,
          sessionId: `sess-student-conc-${i}`
        })
      }).then(async (r) => {
        assert.strictEqual(r.status, 200);
        const data = await r.json();
        assert(data.reply);
        return { user: 'student-1', round: i };
      });

      const teacherPromise = fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${teacherToken}`
        },
        body: JSON.stringify({
          message: `Teacher concurrent inquiry ${i}`,
          sessionId: `sess-teacher-conc-${i}`
        })
      }).then(async (r) => {
        assert.strictEqual(r.status, 200);
        const data = await r.json();
        assert(data.reply);
        return { user: 'teacher-1', round: i };
      });

      concurrentPromises.push(studentPromise, teacherPromise);
    }

    const concurrentResults = await Promise.all(concurrentPromises);
    assert.strictEqual(concurrentResults.length, concurrencyRounds * 2);

    console.log('  ✓ 3.1-3.4 Workspace authorization, SessionStore tenant isolation & concurrency verified');

    console.log('\n========================================================================');
    console.log('=== ALL MILESTONE 1 BATCH 2 TESTS COMPLETED SUCCESSFULLY (100% PASS) ===');
    console.log('========================================================================\n');
  } finally {
    if (harness) {
      await harness.close();
    }
  }
}

runMilestone1Batch2Tests().catch((err) => {
  console.error('\n❌ Milestone 1 Batch 2 Test Suite Failed:', err);
  process.exit(1);
});
