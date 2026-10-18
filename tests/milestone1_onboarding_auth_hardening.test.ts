import assert from 'node:assert/strict';
import { startHttpHarness } from './httpHarness.ts';
import { isOriginAllowed, resolveAllowedOrigins } from '../server/security/corsAndHeaders.ts';

async function runOnboardingAuthHardeningTests() {
  console.log('\n=== [JARVIS] MILESTONE 1 ONBOARDING & AUTH HARDENING SUITE ===');

  const harness = await startHttpHarness();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Development CORS Preflight on Allowed Localhost & Loopback Origins
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Development Preflight Allowed Origins ---');
    const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000'];

    for (const origin of devOrigins) {
      const res = await fetch(`${harness.baseUrl}/api/auth/register`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      assert.equal(res.status, 204, `Preflight for ${origin} must return HTTP 204`);
      assert.equal(res.headers.get('access-control-allow-origin'), origin, `Preflight must echo allow origin for ${origin}`);
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true', 'Must allow credentials');
      assert.ok(
        (res.headers.get('access-control-allow-methods') || '').includes('POST'),
        'Must allow POST method'
      );
      console.log(`  [PASS] Preflight OPTIONS succeeded for ${origin}`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Production CORS Fails Closed on Unconfigured Origins
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Production CORS Strict Allowlist Evaluation ---');
    const prodAllowed = resolveAllowedOrigins(true); // in test env, no ALLOWED_ORIGINS configured -> empty array
    const isMaliciousAllowedInProd = isOriginAllowed('http://malicious-site.com', true, prodAllowed);
    assert.equal(isMaliciousAllowedInProd, false, 'Production must reject unconfigured external origin');

    const isLoopbackAllowedInProdWithoutExplicitConfig = isOriginAllowed('http://localhost:3000', true, prodAllowed);
    assert.equal(
      isLoopbackAllowedInProdWithoutExplicitConfig,
      false,
      'Production without explicit ALLOWED_ORIGINS must fail closed on all cross-origin requests'
    );
    console.log('  [PASS] Production CORS fails closed correctly');

    // -------------------------------------------------------------------------
    // TEST 3: End-to-End Onboarding Account Registration & Profile Calibration
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Onboarding Account Registration & Personal Workspace ---');
    const testEmail = `cadet-${Date.now()}@test-jarvis.internal`;
    const regRes = await fetch(`${harness.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Cadet Alexander',
        email: testEmail,
        role: 'student',
        ageRange: '19-24',
        country: 'United States'
      })
    });

    assert.equal(regRes.status, 201, 'Registration must return HTTP 201 Created');
    assert.equal(regRes.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    const regData = await regRes.json();

    assert.equal(regData.success, true);
    assert.ok(regData.token && typeof regData.token === 'string', 'Token must be issued');
    assert.equal(regData.user?.email, testEmail, 'Email must match');
    assert.equal(regData.user?.role, 'student', 'Role must be student');
    assert.ok(regData.activeWorkspace?.id, 'Personal workspace must be created');
    assert.ok(regData.activeWorkspace.id.startsWith('ws-pers-'), 'Workspace ID must have personal prefix');
    console.log(`  [PASS] User registered (${regData.user.id}) with personal workspace (${regData.activeWorkspace.id})`);

    // Verify personal calibration endpoint works with the issued token
    const calibRes = await fetch(`${harness.baseUrl}/api/personal/onboarding`, {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${regData.token}`
      },
      body: JSON.stringify({
        name: 'Cadet Alexander',
        preferredName: 'Alex',
        pathChoice: 'personal',
        ageRange: '19-24',
        primaryRole: 'student',
        educationInfo: {
          gradeLevel: 'Undergraduate',
          curriculum: 'Physics, CS',
          subjects: ['Physics', 'CS'],
          academicGoals: ['Master quantum computation']
        },
        preferences: {
          explanationStyle: 'first_principles'
        }
      })
    });

    assert.equal(calibRes.status, 200, 'Personal calibration must return HTTP 200 OK');
    const calibData = await calibRes.json();
    assert.equal(calibData.success, true);
    assert.equal(calibData.identity?.profile?.displayName, 'Cadet Alexander');
    console.log('  [PASS] Personal identity calibration completed');

    // -------------------------------------------------------------------------
    // TEST 4: Atomic Duplicate-Email Conflict Returns HTTP 409 USER_EXISTS
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Duplicate Email Conflict Handling ---');
    const duplicateRes = await fetch(`${harness.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Cadet Alexander Duplicate',
        email: testEmail, // same normalized email
        role: 'student'
      })
    });

    assert.equal(duplicateRes.status, 409, 'Duplicate registration must return HTTP 409 Conflict');
    const dupData = await duplicateRes.json();
    assert.equal(dupData.error?.code, 'USER_EXISTS');
    assert.equal(dupData.error?.message, 'An account with this email address already exists.');
    console.log('  [PASS] Duplicate normalized email cleanly rejected with 409 USER_EXISTS');

    // -------------------------------------------------------------------------
    // TEST 5: Role Escalation Prevention During Self-Registration
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Role Escalation Guard ---');
    const hackerEmail = `wannabe-admin-${Date.now()}@test-jarvis.internal`;
    const escalateRes = await fetch(`${harness.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Fake Admin',
        email: hackerEmail,
        role: 'admin' // Attempting to self-assign admin without code
      })
    });

    assert.equal(escalateRes.status, 201, 'Request succeeds but role must be safe default');
    const escalateData = await escalateRes.json();
    assert.equal(escalateData.user?.role, 'student', 'Unearned admin role must be downgraded to student');
    console.log('  [PASS] Role escalation prevented: unearned admin downgraded to student');

    // -------------------------------------------------------------------------
    // TEST 6: Registration with Valid Invitation Code Grants Authorized Role
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Invitation-Code Onboarding Flow ---');
    const facultyEmail = `faculty-${Date.now()}@stark.edu`;
    const facultyRes = await fetch(`${harness.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Professor Xavier',
        email: facultyEmail,
        role: 'teacher',
        institutionCode: 'STARK-FACULTY' // Valid invitation code granting teacher role
      })
    });

    assert.equal(facultyRes.status, 201, 'Faculty registration with code must succeed');
    const facultyData = await facultyRes.json();
    assert.equal(facultyData.user?.role, 'teacher', 'Valid invitation must grant authorized teacher role');
    assert.equal(facultyData.user?.institutionId, 'inst-stark-academy', 'Must be associated with Stark Academy');
    console.log(`  [PASS] Teacher registered via invitation code (${facultyData.user.id})`);

    console.log('\n=== ALL ONBOARDING & AUTH HARDENING TESTS PASSED ===\n');
  } finally {
    await harness.close();
  }
}

runOnboardingAuthHardeningTests().catch((err) => {
  console.error('\n[FAIL] Test suite failed:', err);
  process.exit(1);
});
