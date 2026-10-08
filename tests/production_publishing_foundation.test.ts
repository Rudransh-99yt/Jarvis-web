/**
 * Tests: Jarvis Production Publishing Foundation
 * Verifies Production Readiness Audit, Environment Contract,
 * Diagnostics & Health (/api/health), Subsystem Failures,
 * Production Error Experience, Security Headers, and CORS.
 */

import { startHttpHarness } from './httpHarness.ts';
import { formatProductionError } from '../src/services/productionErrorExperience.ts';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: unknown) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Production Foundation Assertion Failed: ${testName}`);
  }
}

async function runProductionFoundationTests() {
  console.log('\n=== [WEB JARVIS] PRODUCTION PUBLISHING FOUNDATION TEST SUITE ===\n');

  const harness = await startHttpHarness();

  try {
    // -------------------------------------------------------------
    // SECTION 1: Health & Diagnostics API (/api/health)
    // -------------------------------------------------------------
    console.log('--- SECTION 1: Production Health & Subsystem Diagnostics ---');

    const healthRes = await fetch(`${harness.baseUrl}/api/health`);
    assert(healthRes.status === 200, '1.1 GET /api/health returns HTTP 200');

    const health = await healthRes.json();
    assert(
      health.status === 'healthy' || health.status === 'degraded',
      '1.2 Health status is deterministic (healthy or degraded)',
      health.status
    );
    assert(health.service === 'web-jarvis-api', '1.3 Service identity matches web-jarvis-api');
    assert(typeof health.uptimeSeconds === 'number', '1.4 Uptime seconds is numeric');
    assert(Boolean(health.timestamp), '1.5 Timestamp is present');

    // Subsystems verification
    const subs = health.subsystems;
    assert(Boolean(subs), '1.6 Subsystems object is present');
    assert(Boolean(subs.JARVIS_APP), '1.7 JARVIS_APP subsystem reported');
    assert(Boolean(subs.BACKEND), '1.8 BACKEND subsystem reported');
    assert(Boolean(subs.DATABASE), '1.9 DATABASE subsystem reported');
    assert(Boolean(subs.STORAGE), '1.10 STORAGE subsystem reported');
    assert(Boolean(subs.GEMINI), '1.11 GEMINI subsystem reported');
    assert(Boolean(subs.AUTH), '1.12 AUTH subsystem reported');

    // Security: No sensitive tokens or keys in health output
    const healthJsonStr = JSON.stringify(health);
    assert(
      !healthJsonStr.includes('jarvis-default-development-auth-secret') &&
      !healthJsonStr.includes('jarvis-http-harness-test-secret') &&
      !healthJsonStr.includes('AIzaSy'),
      '1.13 No credentials or raw secrets leaked in health payload'
    );

    // Alternate alias route
    const aliasRes = await fetch(`${harness.baseUrl}/api/system/health`);
    assert(aliasRes.status === 200, '1.14 GET /api/system/health alias returns HTTP 200');

    // -------------------------------------------------------------
    // SECTION 2: Request Correlation IDs & Security Headers
    // -------------------------------------------------------------
    console.log('--- SECTION 2: Correlation IDs & Security Headers ---');

    assert(
      Boolean(healthRes.headers.get('x-correlation-id')),
      '2.1 Response contains x-correlation-id header'
    );
    assert(
      healthRes.headers.get('x-content-type-options') === 'nosniff',
      '2.2 Response contains nosniff security header'
    );
    assert(
      healthRes.headers.get('x-xss-protection') === '1; mode=block',
      '2.3 Response contains X-XSS-Protection header'
    );
    assert(
      healthRes.headers.get('referrer-policy') === 'strict-origin-when-cross-origin',
      '2.4 Response contains Referrer-Policy header'
    );

    // Incoming correlation ID preservation
    const customCorrelationRes = await fetch(`${harness.baseUrl}/api/health`, {
      headers: { 'x-correlation-id': 'client-corr-test-999' }
    });
    assert(
      customCorrelationRes.headers.get('x-correlation-id') === 'client-corr-test-999',
      '2.5 Incoming x-correlation-id is preserved across pipeline'
    );

    // -------------------------------------------------------------
    // SECTION 3: CORS & Preflight
    // -------------------------------------------------------------
    console.log('--- SECTION 3: CORS & Preflight Verification ---');

    const optionsRes = await fetch(`${harness.baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://jarvis.stark.local',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assert(optionsRes.status === 204, '3.1 OPTIONS preflight responds with HTTP 204');
    assert(
      optionsRes.headers.get('access-control-allow-origin') === 'https://jarvis.stark.local',
      '3.2 OPTIONS preflight echoes allowed origin'
    );
    assert(
      optionsRes.headers.get('access-control-allow-credentials') === 'true',
      '3.3 OPTIONS preflight enables credentials'
    );

    // -------------------------------------------------------------
    // SECTION 4: Production Error Handling Middleware & Auth Guards
    // -------------------------------------------------------------
    console.log('--- SECTION 4: Production Error Handling Middleware & Auth Guards ---');

    // Protected endpoint without token triggers structured 401
    const unauthRes = await fetch(`${harness.baseUrl}/api/auth/me`);
    assert(unauthRes.status === 401, '4.1 Unauthenticated request returns HTTP 401');
    const unauthData = await unauthRes.json();
    assert(
      unauthData.error?.code === 'UNAUTHENTICATED' || unauthData.error?.subsystem === 'AUTH',
      '4.2 Unauthenticated error classifies subsystem/code correctly',
      unauthData
    );

    // Classroom session creation without auth returns 401
    const classroomUnauthRes = await fetch(`${harness.baseUrl}/api/education/classroom/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'QUIZ', classId: 'cls-physics-101' })
    });
    assert(classroomUnauthRes.status === 401, '4.3 Classroom session creation without auth returns 401');

    // -------------------------------------------------------------
    // SECTION 5: Frontend Production Error Experience Mapping
    // -------------------------------------------------------------
    console.log('--- SECTION 5: Frontend Error Experience Classification ---');

    // 5.1 Auth Failure
    const authErr = formatProductionError({ status: 401, code: 'UNAUTHENTICATED' });
    assert(authErr.category === 'AUTH_FAILURE', '5.1 formatProductionError maps 401 to AUTH_FAILURE');
    assert(authErr.isRetryable === false, '5.2 AUTH_FAILURE is non-retryable');

    // 5.2 Gemini Failure
    const geminiErr = formatProductionError({
      subsystem: 'GEMINI',
      message: 'Resource has been exhausted (e.g. check quota)'
    });
    assert(geminiErr.category === 'GEMINI_FAILURE', '5.3 formatProductionError maps quota to GEMINI_FAILURE');
    assert(geminiErr.isRetryable === true, '5.4 GEMINI_FAILURE is retryable');

    // 5.3 Database Failure
    const dbErr = formatProductionError({ subsystem: 'DATABASE', message: 'disk sync failure' });
    assert(dbErr.category === 'DATABASE_FAILURE', '5.5 formatProductionError maps store error to DATABASE_FAILURE');

    // 5.4 Backend Unavailable
    const netErr = formatProductionError(new Error('Failed to fetch'));
    assert(netErr.category === 'BACKEND_UNAVAILABLE', '5.6 formatProductionError maps fetch drop to BACKEND_UNAVAILABLE');

    // 5.5 Timeout
    const toErr = formatProductionError(new Error('The user aborted a request / timeout'));
    assert(toErr.category === 'TIMEOUT', '5.7 formatProductionError maps timeout to TIMEOUT');

    // 5.6 Application Error
    const appErr = formatProductionError({ message: 'Unknown condition' });
    assert(appErr.category === 'APPLICATION_ERROR', '5.8 formatProductionError maps generic error to APPLICATION_ERROR');

    // -------------------------------------------------------------
    // SECTION 6: Environment Contract & Build Assets
    // -------------------------------------------------------------
    console.log('--- SECTION 6: Environment Contract & Build Assets ---');

    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    assert(fs.existsSync(envExamplePath), '6.1 .env.example exists');
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    assert(envContent.includes('GEMINI_API_KEY='), '6.2 .env.example declares GEMINI_API_KEY');
    assert(envContent.includes('JARVIS_AUTH_SECRET='), '6.3 .env.example declares JARVIS_AUTH_SECRET');
    assert(envContent.includes('NODE_ENV='), '6.4 .env.example declares NODE_ENV');
    assert(envContent.includes('STORAGE_PROVIDER='), '6.5 .env.example declares STORAGE_PROVIDER');
    assert(envContent.includes('PUBLIC_APP_URL='), '6.6 .env.example declares PUBLIC_APP_URL');

    const distIndexPath = path.resolve(process.cwd(), 'dist', 'index.html');
    assert(fs.existsSync(distIndexPath), '6.7 Production dist/index.html exists');

    console.log(`\n===================================================================`);
    console.log(` PRODUCTION PUBLISHING FOUNDATION TEST SUITE: ${passed}/${total} PASSED`);
    console.log(`===================================================================\n`);
  } finally {
    await harness.close();
  }
}

runProductionFoundationTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
