import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { authenticateRequest } from './index.ts';
import { resolveCapabilities } from './capabilities.ts';
import { jarvisData } from '../data/index.ts';
import { authService } from './tokens.ts';
import { personalIdentityStore } from '../personal/identityStore.ts';
import { otpService } from './otpService.ts';
import { resolveEmailProvider, renderOtpEmail, authIpRateLimiter } from './email/index.ts';
import type { User, UserRole, AuthOtpIntent } from '../data/types.ts';

export const authRouter = Router();

// GET /api/auth/me & GET /api/auth/session
// Cryptographically verifies caller session token and retrieves full principal, workspaces & capabilities
const handleSessionVerification = async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const capabilities = resolveCapabilities(user);
    const workspaces = await jarvisData.workspaces.listForUser(user.id);
    const activeWorkspace = workspaces.find((w) => w.id === user.workspaceId) || workspaces[0] || null;

    let profile = null;
    try {
      profile = await personalIdentityStore.getIdentity(user.id);
    } catch {
      // Graceful fallback if no personal profile initialized yet
    }

    res.json({
      success: true,
      user,
      role: user.role,
      institution: user.institutionId ? {
        id: user.institutionId,
        name: user.institutionId === 'inst-stark-academy' ? 'Stark Academy of Science & Technology' : 'Affiliated Institution'
      } : null,
      workspaces,
      activeWorkspace,
      profile,
      capabilities
    });
  } catch (err: any) {
    res.status(err?.statusCode || 401).json({
      error: {
        code: err?.code || 'UNAUTHENTICATED',
        message: err?.message || 'Authentication required'
      }
    });
  }
};

authRouter.get('/me', handleSessionVerification);
authRouter.get('/session', handleSessionVerification);

// POST /api/auth/login
// In production: rejects all unverified credential-free logins unconditionally (403 UNVERIFIED_LOGIN_DISALLOWED).
// In non-production: permits legacy demo/dev login flow ONLY when ALLOW_DEV_AUTH === 'true'.
// Otherwise rejects with 403 DEV_AUTH_REQUIRED.
// Privileged roles (admin, commander) are strictly blocked in all environments.
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    // 1. Production Fail-Closed Boundary:
    // Reject all credential-free login attempts unconditionally before any lookup, workspace creation, or issuance.
    // Never allow ALLOW_DEV_AUTH or any other environment variable or header to bypass this in production.
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: {
          code: 'UNVERIFIED_LOGIN_DISALLOWED',
          message: 'Passwordless login via unverified role, email, or userId is disabled in production. Standard credential verification is required.'
        }
      });
    }

    // 2. Non-Production Explicit Control Gate:
    // In development and test environments, legacy credential-free demo login requires ALLOW_DEV_AUTH === 'true'.
    if (process.env.ALLOW_DEV_AUTH !== 'true') {
      return res.status(403).json({
        error: {
          code: 'DEV_AUTH_REQUIRED',
          message: 'Credential-free login by role, email, or userId is disabled. Set ALLOW_DEV_AUTH=true in non-production environments to enable development and test authentication.'
        }
      });
    }

    const { email, userId, role } = req.body || {};
    let user: User | null = null;

    if (role && typeof role === 'string') {
      const cleanRole = role.toLowerCase().trim();
      if (cleanRole === 'admin' || cleanRole === 'commander') {
        return res.status(403).json({
          error: {
            code: 'PRIVILEGED_LOGIN_DISALLOWED',
            message: 'Privileged accounts (admin/commander) cannot authenticate via unverified credentials. Operator-level authentication is required.'
          }
        });
      }
      const roleUserMap: Record<string, string> = {
        student: 'student-1',
        teacher: 'teacher-1',
        principal: 'principal-1',
        parent: 'parent-1'
      };
      const mappedId = roleUserMap[cleanRole] || 'student-1';
      user = await jarvisData.users.getById(mappedId);
    } else if (email && typeof email === 'string' && email.trim()) {
      user = await jarvisData.users.getByEmail(email.trim().toLowerCase());
    } else if (userId && typeof userId === 'string' && userId.trim()) {
      user = await jarvisData.users.getById(userId.trim());
    }

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'User identity could not be verified with provided credentials.'
        }
      });
    }

    const cleanUserRole = (user.role || '').toLowerCase().trim();
    if (cleanUserRole === 'admin' || cleanUserRole === 'commander') {
      return res.status(403).json({
        error: {
          code: 'PRIVILEGED_LOGIN_DISALLOWED',
          message: 'Privileged accounts (admin/commander) cannot authenticate via unverified credentials. Operator-level authentication is required.'
        }
      });
    }

    // Ensure the user has an isolated personal workspace
    let userWorkspaces = await jarvisData.workspaces.listForUser(user.id);
    let personalWs = userWorkspaces.find((w) => !w.institutionId || w.id === `ws-pers-${user.id}`);
    if (!personalWs) {
      personalWs = await jarvisData.workspaces.create({
        id: `ws-pers-${user.id}`,
        name: `${user.displayName}'s Personal Workspace`,
        description: 'Isolated personal intelligence workspace for learning, research, and life.',
        ownerId: user.id,
        activeSectors: ['personal', 'education', 'research', 'command'],
        institutionId: undefined
      });
      await jarvisData.workspaces.addMember(personalWs.id, user.id, 'owner');
      userWorkspaces = await jarvisData.workspaces.listForUser(user.id);
    }

    const token = authService.issueToken(user, 24 * 60 * 60 * 1000); // 24-hour token
    const capabilities = resolveCapabilities(user);
    const resolvedActiveWorkspace = userWorkspaces.find((w) => w.id === user.workspaceId) || personalWs || userWorkspaces[0];

    res.json({
      success: true,
      token,
      user,
      role: user.role,
      institution: user.institutionId ? {
        id: user.institutionId,
        name: user.institutionId === 'inst-stark-academy' ? 'Stark Academy of Science & Technology' : 'Affiliated Institution'
      } : null,
      activeWorkspace: resolvedActiveWorkspace,
      workspaces: userWorkspaces,
      capabilities
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message } });
  }
});

// POST /api/auth/register
// Registers an individual user with an isolated personal workspace and issues a signed token
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    // 1. Production Fail-Closed Boundary:
    // Reject direct registration attempts unconditionally in production.
    // Account creation in production strictly requires email OTP verification via /api/auth/otp/request and /api/auth/otp/verify.
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: {
          code: 'UNVERIFIED_REGISTRATION_DISALLOWED',
          message: 'Direct registration without email OTP verification is disabled in production. Verification via /api/auth/otp/request and /api/auth/otp/verify is required.'
        }
      });
    }

    // Deprecation notice for non-production environments
    res.setHeader('Warning', '299 - "Legacy direct registration is deprecated and disabled in production; use /api/auth/otp/request and /api/auth/otp/verify"');

    const { displayName, email, role, institutionCode, ageRange, country } = req.body || {};

    const cleanDisplayName = typeof displayName === 'string' ? displayName.trim() : '';
    if (!cleanDisplayName || cleanDisplayName.length < 2 || cleanDisplayName.length > 100) {
      return res.status(400).json({
        error: { code: 'INVALID_ARGUMENTS', message: 'A valid display name (2-100 characters) is required.' }
      });
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        error: { code: 'INVALID_ARGUMENTS', message: 'A valid email address is required.' }
      });
    }

    // Pre-flight duplicate check (fails fast before transaction lock; authoritative check is in repository mutate)
    const existing = await jarvisData.users.getByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        error: { code: 'USER_EXISTS', message: 'An account with this email address already exists.' }
      });
    }

    // Role cannot be escalated by user:
    // Self-registration without an invitation permits only safe public roles (student, parent).
    // Privileged or institutional roles (admin, commander, principal, teacher) cannot be self-assigned.
    const safeSelfRoles: UserRole[] = ['student', 'parent'];
    const cleanRequestedRole = typeof role === 'string' ? (role.toLowerCase().trim() as UserRole) : 'student';

    // Optional institution invitation code handling with real verification
    let institutionCodeUpper: string | undefined = undefined;
    if (institutionCode && typeof institutionCode === 'string' && institutionCode.trim()) {
      institutionCodeUpper = institutionCode.trim().toUpperCase();
      const inv = await jarvisData.institutions.getInvitationByCode(institutionCodeUpper);
      if (!inv) {
        return res.status(400).json({
          error: { code: 'INVALID_INVITATION', message: 'The provided institution invitation code does not exist.' }
        });
      }
      const isExpired = new Date(inv.expiresAt).getTime() <= Date.now() || inv.status === 'expired';
      const isMaxed = inv.usedCount >= inv.maxUses || inv.status === 'consumed';
      const isRevoked = inv.status === 'revoked';

      if (inv.status !== 'active' || isExpired || isMaxed || isRevoked) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INVITATION',
            message: isExpired ? 'This invitation code has expired.' :
                     isRevoked ? 'This invitation code has been revoked.' :
                     isMaxed ? 'This invitation code has reached its maximum enrollment capacity.' :
                     'This invitation code is no longer active.'
          }
        });
      }
    }

    // Generate unique user ID and workspace ID
    const newUserId = `user-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const personalWsId = `ws-pers-${newUserId}`;

    // Execute atomic unit-of-work across User, Workspace, and Invitation consumption
    const registrationResult = await jarvisData.runTransaction(async (txRepo) => {
      let assignedRole: UserRole = safeSelfRoles.includes(cleanRequestedRole) ? cleanRequestedRole : 'student';
      let institutionId: string | undefined = undefined;
      let consumedInv: any = null;

      if (institutionCodeUpper) {
        // ATOMIC INVITATION CONSUMPTION:
        // Must consume within the transaction BEFORE granting a privileged role or session.
        // If consumption fails (e.g. concurrent usage exceeded maxUses), consumeInvitation throws and rolls back.
        const consumptionResult = await txRepo.institutions.consumeInvitation(institutionCodeUpper, newUserId);
        consumedInv = consumptionResult.invitation;
        institutionId = consumedInv.institutionId;

        // Role escalation guard: never allow an invitation to grant admin or commander
        const allowedInvitationRoles: UserRole[] = ['student', 'teacher', 'principal', 'parent'];
        if (allowedInvitationRoles.includes(consumedInv.role)) {
          assignedRole = consumedInv.role;
        } else {
          assignedRole = 'student';
        }
      }

      // 1. Create persistent user record (enforcing atomic normalized-email uniqueness inside mutation)
      const user = await txRepo.users.create({
        id: newUserId,
        displayName: cleanDisplayName,
        email: cleanEmail,
        role: assignedRole,
        institutionId
      });

      // 2. Create isolated personal workspace
      const personalWs = await txRepo.workspaces.create({
        id: personalWsId,
        name: `${cleanDisplayName}'s Personal Workspace`,
        description: 'Sovereign individual workspace for learning, research, and life.',
        ownerId: newUserId,
        activeSectors: ['personal', 'education', 'research', 'command'],
        institutionId: undefined
      });
      await txRepo.workspaces.addMember(personalWsId, newUserId, 'owner');

      // 3. If invitation was consumed, add user as member to institutional workspaces
      if (consumedInv) {
        const instWorkspaces = (await txRepo.workspaces.list()).filter(
          (w) => w.institutionId === consumedInv.institutionId
        );
        for (const ws of instWorkspaces) {
          await txRepo.workspaces.addMember(ws.id, newUserId, 'member');
        }
      }

      // 4. Bind user's active workspace
      await txRepo.users.update(newUserId, { workspaceId: personalWsId });
      user.workspaceId = personalWsId;

      const userWorkspaces = await txRepo.workspaces.listForUser(newUserId);
      return { user, personalWs, userWorkspaces, assignedRole };
    });

    const { user: newUser, personalWs, userWorkspaces, assignedRole } = registrationResult;

    // Map role to progressive onboarding union
    const progressiveRole: 'teacher' | 'student' | 'researcher' | 'professional' | 'lifelong_learner' =
      assignedRole === 'teacher' ? 'teacher' :
      assignedRole === 'student' ? 'student' :
      assignedRole === 'principal' ? 'professional' :
      'lifelong_learner';

    // Initialize personal identity store with progressive onboarding
    try {
      await personalIdentityStore.processProgressiveOnboarding({
        userId: newUserId,
        name: cleanDisplayName,
        primaryRole: progressiveRole,
        ageRange,
        country
      });
    } catch (e) {
      console.warn('[AuthRegister] Failed to initialize personal identity store:', e);
    }

    // Issue signed HMAC token
    const token = authService.issueToken(newUser, 24 * 60 * 60 * 1000);
    const capabilities = resolveCapabilities(newUser);

    res.status(201).json({
      success: true,
      token,
      user: newUser,
      role: newUser.role,
      activeWorkspace: personalWs,
      workspaces: userWorkspaces,
      capabilities
    });
  } catch (err: any) {
    if (err?.code === 'USER_EXISTS' || err?.message?.includes('USER_EXISTS')) {
      return res.status(409).json({
        error: { code: 'USER_EXISTS', message: 'An account with this email address already exists.' }
      });
    }
    if (err?.message?.includes('INVALID_INVITATION')) {
      const cleanMsg = err.message.replace(/^INVALID_INVITATION:\s*/, '');
      return res.status(400).json({
        error: { code: 'INVALID_INVITATION', message: cleanMsg }
      });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected registration error occurred.' } });
  }
});

// POST /api/auth/invitation/validate
// Checks if an institution invitation code is valid and active without leaking secrets
authRouter.post('/invitation/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        valid: false,
        error: { code: 'INVALID_ARGUMENTS', message: 'Invitation code is required.' }
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const inv = await jarvisData.institutions.getInvitationByCode(cleanCode);
    if (!inv) {
      return res.status(404).json({
        valid: false,
        error: { code: 'INVALID_INVITATION', message: 'Invitation code not found or invalid.' }
      });
    }

    const isExpired = new Date(inv.expiresAt).getTime() <= Date.now() || inv.status === 'expired';
    const isMaxed = inv.usedCount >= inv.maxUses || inv.status === 'consumed';
    const isRevoked = inv.status === 'revoked';

    if (inv.status !== 'active' || isExpired || isMaxed || isRevoked) {
      return res.status(400).json({
        valid: false,
        error: {
          code: 'INVALID_INVITATION',
          message: isExpired ? 'This invitation code has expired.' :
                   isRevoked ? 'This invitation code has been revoked.' :
                   isMaxed ? 'This invitation code has reached its maximum enrollment capacity.' :
                   'This invitation code is no longer active.'
        }
      });
    }

    res.json({
      valid: true,
      institutionId: inv.institutionId,
      institutionName: inv.institutionName,
      role: inv.role
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message } });
  }
});

// POST /api/auth/invitation/join
// Authenticated user consumes an invitation code to join an institution
authRouter.post('/invitation/join', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        error: { code: 'INVALID_ARGUMENTS', message: 'Invitation code is required.' }
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const { invitation, membership, updatedWorkspaces } = await jarvisData.runTransaction(async (txRepo) => {
      const { invitation, membership } = await txRepo.institutions.consumeInvitation(cleanCode, user.id);

      // Add user to the institution's workspaces
      const instWorkspaces = (await txRepo.workspaces.list()).filter(
        (w) => w.institutionId === invitation.institutionId
      );
      for (const ws of instWorkspaces) {
        await txRepo.workspaces.addMember(ws.id, user.id, 'member');
      }

      // Update user's institutionId
      await txRepo.users.update(user.id, { institutionId: invitation.institutionId });

      const updatedWorkspaces = await txRepo.workspaces.listForUser(user.id);
      return { invitation, membership, updatedWorkspaces };
    });

    res.json({
      success: true,
      membership,
      institution: {
        id: invitation.institutionId,
        name: invitation.institutionName
      },
      workspaces: updatedWorkspaces
    });
  } catch (err: any) {
    const msg = err?.message || 'Failed to join institution';
    const statusCode = msg.includes('INVALID_INVITATION') ? 400 : 500;
    res.status(statusCode).json({ error: { code: 'INVALID_INVITATION', message: msg } });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/token (restricted test/dev token issuance by userId)
authRouter.post('/token', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEV_AUTH !== 'true') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Direct token issuance is disabled. Authenticate via standard credentials.'
      }
    });
  }
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: { code: 'INVALID_ARGUMENTS', message: 'userId is required' } });
    }
    const user = await jarvisData.users.getById(userId);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `User '${userId}' not found` } });
    }
    const token = authService.issueToken(user);
    res.json({ success: true, token, user, role: user.role });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message } });
  }
});

// POST /api/auth/dev-session
authRouter.post('/dev-session', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: {
        code: 'DEV_AUTH_DISABLED',
        message: 'Dev session initialization is strictly disabled in production environments.'
      }
    });
  }

  if (process.env.ALLOW_DEV_AUTH !== 'true') {
    return res.status(403).json({
      error: {
        code: 'DEV_AUTH_REQUIRED',
        message: 'Dev session initialization is disabled. Set ALLOW_DEV_AUTH=true in non-production environments to enable development sessions.'
      }
    });
  }

  try {
    const { role } = req.body || {};
    const cleanRole = typeof role === 'string' ? role.toLowerCase().trim() : 'student';

    // Privileged accounts cannot authenticate via unverified dev sessions
    if (cleanRole === 'admin' || cleanRole === 'commander') {
      return res.status(403).json({
        error: {
          code: 'PRIVILEGED_LOGIN_DISALLOWED',
          message: 'Privileged accounts (admin/commander) cannot authenticate via unverified credentials. Operator-level authentication is required.'
        }
      });
    }

    const roleUserMap: Record<string, string> = {
      student: 'student-1',
      teacher: 'teacher-1',
      principal: 'principal-1',
      parent: 'parent-1'
    };
    const userId = roleUserMap[cleanRole] || 'student-1';
    const user = await jarvisData.users.getById(userId);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const cleanUserRole = (user.role || '').toLowerCase().trim();
    if (cleanUserRole === 'admin' || cleanUserRole === 'commander') {
      return res.status(403).json({
        error: {
          code: 'PRIVILEGED_LOGIN_DISALLOWED',
          message: 'Privileged accounts (admin/commander) cannot authenticate via unverified credentials. Operator-level authentication is required.'
        }
      });
    }

    const token = authService.issueToken(user);
    const capabilities = resolveCapabilities(user);
    res.json({
      success: true,
      token,
      user,
      role: user.role,
      capabilities
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message } });
  }
});

// =========================================================================
// EMAIL OTP DELIVERY & VERIFICATION ENDPOINTS (Milestone 2.2)
// =========================================================================

// POST /api/auth/otp/request & POST /api/auth/otp/send
// Generates and dispatches a cryptographically salted one-time password (OTP).
// - For 'login': If email is unknown, returns generic success without sending email (anti-enumeration).
// - For 'register': Fails if account already exists with 409 USER_EXISTS.
// - Persists OTP before delivery.
// - If email delivery fails, executes compensating invalidation of the exact OTP created while preserving rate limiting.
const handleOtpRequest = async (req: Request, res: Response) => {
  let createdOtpId: string | null = null;
  try {
    // 1. IP Rate Limiting (Single-process safeguard)
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const ipLimit = authIpRateLimiter.check(clientIp);
    if (!ipLimit.allowed) {
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many requests from this IP address. Please wait ${Math.ceil(ipLimit.retryAfterMs / 1000)} seconds.`,
          retryAfterMs: ipLimit.retryAfterMs
        }
      });
    }

    const { email, intent, metadata } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || cleanEmail.length > 254 || !emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ARGUMENTS',
          message: 'A valid email address (up to 254 characters) is required.'
        }
      });
    }

    if (intent !== 'login' && intent !== 'register') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ARGUMENTS',
          message: "Invalid OTP intent. Must be 'login' or 'register'."
        }
      });
    }

    // 2. Intent-Specific Account Existence Verification
    if (intent === 'login') {
      const existingUser = await jarvisData.users.getByEmail(cleanEmail);
      if (!existingUser) {
        // Milestone 2.2 Approved Decision 2:
        // For login OTP requests to unknown email addresses, return the same generic public response
        // used for known accounts and do not send an email.
        return res.json({
          success: true,
          message: 'If an account exists for this email address, a verification code has been dispatched.',
          email: cleanEmail,
          intent: 'login',
          resendAvailableAt: new Date(Date.now() + 60_000).toISOString()
        });
      }
    } else {
      // intent === 'register'
      const existingUser = await jarvisData.users.getByEmail(cleanEmail);
      if (existingUser) {
        return res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: 'An account with this email address already exists.'
          }
        });
      }
    }

    // 3. Resolve & Validate Email Provider before creating OTP
    let emailProvider;
    try {
      emailProvider = resolveEmailProvider();
    } catch (providerErr: any) {
      console.error('[AuthOtp] Email provider resolution failed:', providerErr?.message || providerErr);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Email delivery service is currently unavailable. Please try again later.'
        }
      });
    }

    // 4. Sanitize metadata and generate & Persist OTP (enforcing durable hourly rate limits & resend cooldown)
    let sanitizedMetadata: Record<string, any> | undefined = undefined;
    if (metadata && typeof metadata === 'object') {
      const allowedRoles = ['student', 'parent'];
      const rawRole = typeof metadata.role === 'string' ? metadata.role.toLowerCase().trim() : undefined;
      sanitizedMetadata = {
        displayName: typeof metadata.displayName === 'string' ? metadata.displayName.trim().slice(0, 100) : undefined,
        role: rawRole && allowedRoles.includes(rawRole) ? rawRole : 'student',
        institutionCode: typeof metadata.institutionCode === 'string' ? metadata.institutionCode.trim().slice(0, 50) : undefined,
        ageRange: typeof metadata.ageRange === 'string' ? metadata.ageRange.trim().slice(0, 50) : undefined,
        country: typeof metadata.country === 'string' ? metadata.country.trim().slice(0, 100) : undefined
      };
    }

    let otp: any;
    try {
      otp = await otpService.generateOtp(cleanEmail, intent, sanitizedMetadata);
      createdOtpId = otp.otpId;
    } catch (err: any) {
      if (err?.code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many verification requests for this email. Please try again later.'
          }
        });
      }
      if (err?.code === 'RESEND_COOLDOWN_ACTIVE') {
        return res.status(429).json({
          error: {
            code: 'RESEND_COOLDOWN_ACTIVE',
            message: err.message,
            retryAfterMs: err.retryAfterMs
          }
        });
      }
      console.error('[AuthOtp] OTP generation error:', err?.message || err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while requesting verification code.'
        }
      });
    }

    // 5. Dispatch Email via Configured Provider
    let dispatchResult;
    try {
      const rendered = renderOtpEmail({
        code: otp.code,
        intent,
        recipientEmail: cleanEmail
      });

      dispatchResult = await emailProvider.send({
        to: cleanEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tag: `auth-otp-${intent}`
      });
    } catch (sendErr: any) {
      console.error('[AuthOtp] Email dispatch exception:', sendErr?.message || sendErr);
      dispatchResult = {
        success: false,
        error: {
          code: 'NETWORK_ERROR' as const,
          message: 'Email dispatch exception occurred.'
        }
      };
    }

    // 6. Delivery Failure Handling (Milestone 2.2 Approved Decision 3)
    if (!dispatchResult.success) {
      // Invalidate the specific OTP created by this request while preserving request history for rate limiting
      try {
        await otpService.invalidateOtpById(otp.otpId);
      } catch (cleanupErr: any) {
        console.error('[AuthOtp] Failed to execute compensating OTP invalidation:', cleanupErr?.message || cleanupErr);
      }

      return res.status(502).json({
        error: {
          code: 'EMAIL_DELIVERY_FAILED',
          message: 'Unable to deliver verification code. Please try again later.'
        }
      });
    }

    // 7. Generic public success response (Treat provider acceptance as queued/accepted, not guaranteed inbox delivery)
    return res.json({
      success: true,
      message: intent === 'login'
        ? 'If an account exists for this email address, a verification code has been dispatched.'
        : 'A verification code has been dispatched to your email address.',
      email: cleanEmail,
      intent,
      resendAvailableAt: otp.resendAvailableAt
    });
  } catch (err: any) {
    console.error('[AuthOtp] Unexpected error in handleOtpRequest:', err?.message || err);
    if (createdOtpId) {
      try {
        await otpService.invalidateOtpById(createdOtpId);
      } catch (cleanupErr: any) {
        console.error('[AuthOtp] Failed to clean up OTP in catch block:', cleanupErr?.message || cleanupErr);
      }
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while requesting verification code.'
      }
    });
  }
};

authRouter.post('/otp/request', handleOtpRequest);
authRouter.post('/otp/send', handleOtpRequest);

// POST /api/auth/otp/verify
// Atomically verifies a 6-digit OTP code. Single-use consumption.
// - For 'login': issues an authenticated session token for the existing account.
// - For 'register': finalizes user and workspace creation, issuing an authenticated session token.
authRouter.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const ipLimit = authIpRateLimiter.check(clientIp);
    if (!ipLimit.allowed) {
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many requests from this IP address. Please wait ${Math.ceil(ipLimit.retryAfterMs / 1000)} seconds.`,
          retryAfterMs: ipLimit.retryAfterMs
        }
      });
    }

    const { email, code, intent, displayName, role, institutionCode, ageRange, country } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanCode = typeof code === 'string' ? code.trim() : '';

    if (!cleanEmail || !cleanCode || (intent !== 'login' && intent !== 'register')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ARGUMENTS',
          message: "A valid email, 6-digit verification code, and intent ('login' or 'register') are required."
        }
      });
    }

    const verifyResult = await otpService.verifyOtp(cleanEmail, cleanCode, intent);

    if (!verifyResult.success) {
      const errCode = verifyResult.error?.code || 'INVALID_CODE';
      const statusCode =
        errCode === 'LOCKED' ? 423 :
        errCode === 'NOT_FOUND' ? 404 :
        400;

      return res.status(statusCode).json({
        error: {
          code: errCode,
          message: verifyResult.error?.message || 'Verification failed.',
          attemptsRemaining: verifyResult.attemptsRemaining
        }
      });
    }

    // OTP Verified! Handle Session Creation:
    if (intent === 'login') {
      const user = await jarvisData.users.getByEmail(cleanEmail);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User account not found.'
          }
        });
      }

      const token = authService.issueToken(user);
      const capabilities = resolveCapabilities(user);
      const workspaces = await jarvisData.workspaces.listForUser(user.id);
      const activeWorkspace = workspaces.find((w) => w.id === user.workspaceId) || workspaces[0] || null;

      return res.json({
        success: true,
        token,
        user,
        role: user.role,
        capabilities,
        workspaces,
        activeWorkspace
      });
    }

    // intent === 'register'
    // Finalize registration using verified metadata or provided body attributes
    const meta = verifyResult.metadata || {};
    const effectiveDisplayName = (typeof displayName === 'string' && displayName.trim()) || meta.displayName || cleanEmail.split('@')[0];
    const candidateRole = (typeof role === 'string' && role.trim()) || meta.role || 'student';
    const effectiveRole: UserRole = ['student', 'parent'].includes(candidateRole) ? (candidateRole as UserRole) : 'student';
    const effectiveInstitutionCode = (typeof institutionCode === 'string' && institutionCode.trim()) || meta.institutionCode;
    const effectiveAgeRange = ageRange || meta.ageRange;
    const effectiveCountry = country || meta.country;

    // Check if user already exists
    const existingUser = await jarvisData.users.getByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email address already exists. Please sign in instead.'
        }
      });
    }

    const newUserId = `user-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const personalWsId = `ws-pers-${newUserId}`;

    let regResult;
    try {
      regResult = await jarvisData.runTransaction(async (txRepo) => {
        // Atomic check-and-create within transaction to prevent concurrent race condition:
        const userInTx = await txRepo.users.getByEmail(cleanEmail);
        if (userInTx) {
          const err = new Error('USER_EXISTS: An account with this email address already exists.');
          (err as any).code = 'USER_EXISTS';
          throw err;
        }

        let assignedRole: UserRole = effectiveRole;
        let institutionId: string | undefined = undefined;

        if (effectiveInstitutionCode) {
          const cleanInvCode = effectiveInstitutionCode.trim().toUpperCase();
          const inv = await txRepo.institutions.getInvitationByCode(cleanInvCode);
          if (inv && inv.status === 'active') {
            const consumed = await txRepo.institutions.consumeInvitation(cleanInvCode, newUserId);
            institutionId = consumed.invitation.institutionId;
            if (['student', 'teacher', 'principal', 'parent'].includes(consumed.invitation.role)) {
              assignedRole = consumed.invitation.role;
            }
          }
        }

        const newUser = await txRepo.users.create({
          id: newUserId,
          displayName: effectiveDisplayName,
          email: cleanEmail,
          role: assignedRole,
          institutionId
        });

        const personalWs = await txRepo.workspaces.create({
          id: personalWsId,
          name: `${effectiveDisplayName}'s Personal Workspace`,
          description: 'Sovereign individual workspace for learning, research, and life.',
          ownerId: newUserId,
          activeSectors: ['personal', 'education', 'research', 'command'],
          institutionId: undefined
        });
        await txRepo.workspaces.addMember(personalWsId, newUserId, 'owner');

        await txRepo.users.update(newUserId, { workspaceId: personalWsId });
        newUser.workspaceId = personalWsId;

        return { newUser, personalWs };
      });
    } catch (regErr: any) {
      if (regErr?.code === 'USER_EXISTS' || regErr?.message?.includes('USER_EXISTS')) {
        return res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: 'An account with this email address already exists. Please sign in instead.'
          }
        });
      }
      throw regErr;
    }

    const user = regResult.newUser;

    // Initialize personal identity store with progressive onboarding
    try {
      const progressiveRole =
        user.role === 'teacher' ? 'teacher' :
        user.role === 'student' ? 'student' :
        user.role === 'principal' ? 'professional' :
        'lifelong_learner';

      await personalIdentityStore.processProgressiveOnboarding({
        userId: user.id,
        name: effectiveDisplayName,
        primaryRole: progressiveRole,
        ageRange: effectiveAgeRange,
        country: effectiveCountry
      });
    } catch (e) {
      console.warn('[AuthOtpVerify] Failed to initialize personal identity store:', e);
    }

    const token = authService.issueToken(user);
    const capabilities = resolveCapabilities(user);
    const workspaces = await jarvisData.workspaces.listForUser(user.id);
    const activeWorkspace = workspaces.find((w) => w.id === user.workspaceId) || workspaces[0] || null;

    return res.status(201).json({
      success: true,
      token,
      user,
      role: user.role,
      capabilities,
      workspaces,
      activeWorkspace
    });
  } catch (err: any) {
    console.error('[AuthOtpVerify] Unexpected verification error:', err?.message || err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during code verification.'
      }
    });
  }
});

// GET /api/auth/otp/eligibility
// Checks if an email is currently eligible to request an OTP.
// Protected by IP rate limiting and minimizes unauthenticated account-activity disclosure.
authRouter.get('/otp/eligibility', async (req: Request, res: Response) => {
  try {
    // 1. IP Rate Limiting (Single-process safeguard)
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const ipLimit = authIpRateLimiter.check(clientIp);
    if (!ipLimit.allowed) {
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many requests from this IP address. Please wait ${Math.ceil(ipLimit.retryAfterMs / 1000)} seconds.`,
          retryAfterMs: ipLimit.retryAfterMs
        }
      });
    }

    const email = typeof req.query.email === 'string' ? req.query.email : '';
    const intent = typeof req.query.intent === 'string' ? (req.query.intent as AuthOtpIntent) : 'login';

    const cleanEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || cleanEmail.length > 254 || !emailPattern.test(cleanEmail) || (intent !== 'login' && intent !== 'register')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ARGUMENTS',
          message: "A valid email address and intent ('login' or 'register') are required."
        }
      });
    }

    const existingUser = await jarvisData.users.getByEmail(cleanEmail);

    if (intent === 'login') {
      if (!existingUser) {
        // Return generic eligible: true to prevent quota enumeration,
        // and accountExists: false so login UI can guide users without active accounts.
        return res.json({
          success: true,
          eligible: true,
          accountExists: false
        });
      }
    }

    const result = await otpService.checkResendEligibility(cleanEmail, intent);

    // Minimize unauthenticated account-activity disclosure:
    // Return high-level eligibility, account existence, and cooldown without disclosing exact
    // hourlyRequestsRemaining quota or usage history to unauthenticated callers.
    return res.json({
      success: true,
      eligible: result.eligible,
      accountExists: Boolean(existingUser),
      ...(result.cooldownRemainingMs ? { cooldownRemainingMs: result.cooldownRemainingMs } : {})
    });
  } catch (err: any) {
    console.error('[AuthOtpEligibility] Unexpected error:', err?.message || err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check eligibility.'
      }
    });
  }
});
