// JARVIS EDUCATION OS — PHASE D.7: FAMILY ROUTES
// Strict server-authoritative role verification & child privacy boundaries.

import { Router, type Request, type Response } from 'express';
import { familyService } from './familyService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';

export const familyRouter = Router();

// Middleware: Authenticate & Enforce Family/Parent Role
async function requireParentUser(req: Request) {
  const user = await authenticateRequest(req, jarvisData);
  const isParent = user.role === 'parent';
  const isAdminOrCommander = user.role === 'admin' || user.role === 'commander';

  if (!isParent && !isAdminOrCommander) {
    const err: any = new Error(`Access forbidden: User '${user.id}' with role '${user.role}' is not authorized to access family intelligence.`);
    err.statusCode = 403;
    throw err;
  }
  return user;
}

// 1. GET /api/education/family/children - Get authorized children for logged-in parent
familyRouter.get('/children', async (req: Request, res: Response) => {
  try {
    const user = await requireParentUser(req);
    // If admin/commander testing, map to parent-1 if not registered directly
    const parentId = user.role === 'parent' ? user.id : 'parent-1';
    const children = await familyService.getChildrenForParent(parentId);
    res.json({ children, count: children.length });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 2. GET /api/education/family/child/:studentId/intelligence - Authorized child intelligence
familyRouter.get('/child/:studentId/intelligence', async (req: Request, res: Response) => {
  try {
    const user = await requireParentUser(req);
    const parentId = user.role === 'parent' ? user.id : 'parent-1';
    const targetStudentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : String(req.params.studentId);

    // Strict boundary enforcement: verify parent has relationship to target student
    const isAuthorized = await familyService.verifyParentChildAccess(parentId, targetStudentId);
    if (!isAuthorized && user.role === 'parent') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Privacy Violation: Parent '${user.id}' is not authorized to access records for student '${targetStudentId}'.`
        }
      });
      return;
    }

    const intelligence = await familyService.getFamilyHomeIntelligence(parentId, targetStudentId);
    res.json({ intelligence });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 3. GET /api/education/family/child/:studentId/communication - Family announcements
familyRouter.get('/child/:studentId/communication', async (req: Request, res: Response) => {
  try {
    const user = await requireParentUser(req);
    const parentId = user.role === 'parent' ? user.id : 'parent-1';
    const targetStudentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : String(req.params.studentId);

    const isAuthorized = await familyService.verifyParentChildAccess(parentId, targetStudentId);
    if (!isAuthorized && user.role === 'parent') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Privacy Violation: Parent '${user.id}' is not authorized to access communication for student '${targetStudentId}'.`
        }
      });
      return;
    }

    const intelligence = await familyService.getFamilyHomeIntelligence(parentId, targetStudentId);
    res.json({ communications: intelligence.communications });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});
