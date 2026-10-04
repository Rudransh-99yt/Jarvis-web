// JARVIS EDUCATION OS — PHASE D.7: PRINCIPAL & INSTITUTIONAL ROUTES
// Strict server-authoritative institutional oversight & controlled command execution.

import { Router, type Request, type Response } from 'express';
import { institutionalService } from './institutionalService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';

export const institutionalRouter = Router();

// Middleware: Authenticate & Enforce Principal/Admin/Commander Role
async function requireLeadershipUser(req: Request): Promise<User> {
  const user = await authenticateRequest(req, jarvisData);
  const isLeadership = user.role === 'principal' || user.role === 'admin' || user.role === 'commander';

  if (!isLeadership) {
    const err: any = new Error(
      `Access Denied: User '${user.id}' with role '${user.role}' is not authorized to access institutional intelligence.`
    );
    err.statusCode = 403;
    throw err;
  }
  return user;
}

// 1. GET /api/education/institutional/school - School-wide intelligence & pulse
institutionalRouter.get('/school', async (req: Request, res: Response) => {
  try {
    const user = await requireLeadershipUser(req);
    const institutionId = (req.query.institutionId as string) || 'inst-stark-academy';

    if (institutionId !== 'inst-stark-academy') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Cross-Institution Denied: Leadership user '${user.id}' is not authorized for institution '${institutionId}'.`
        }
      });
      return;
    }

    const intelligence = institutionalService.getSchoolIntelligence(institutionId);
    res.json({ intelligence, user: { id: user.id, role: user.role } });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 2. GET /api/education/institutional/grade/:gradeId - Grade-level intelligence & drill-down
institutionalRouter.get('/grade/:gradeId', async (req: Request, res: Response) => {
  try {
    await requireLeadershipUser(req);
    const gradeId = Array.isArray(req.params.gradeId) ? req.params.gradeId[0] : String(req.params.gradeId || 'g11');
    const intelligence = institutionalService.getGradeIntelligence(gradeId);
    res.json({ intelligence });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 3. GET /api/education/institutional/teachers - Teacher leadership & workload projections
institutionalRouter.get('/teachers', async (req: Request, res: Response) => {
  try {
    await requireLeadershipUser(req);
    const projections = institutionalService.getTeacherLeadershipProjections();
    res.json({ teachers: projections, count: projections.length });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 4. GET /api/education/institutional/class/:classId - Class institutional projection
institutionalRouter.get('/class/:classId', async (req: Request, res: Response) => {
  try {
    await requireLeadershipUser(req);
    const classId = Array.isArray(req.params.classId) ? req.params.classId[0] : String(req.params.classId);
    const projection = institutionalService.getClassInstitutionalProjection(classId);
    res.json({ projection });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 5. POST /api/education/institutional/commands/propose - Propose AI diagnostic command
institutionalRouter.post('/commands/propose', async (req: Request, res: Response) => {
  try {
    const user = await requireLeadershipUser(req);
    const { commandPrompt, targetGradeId, courseCode, durationMinutes, questionCount } = req.body;

    if (!commandPrompt || typeof commandPrompt !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_ARGUMENTS', message: 'commandPrompt is required.' } });
      return;
    }

    const proposal = await institutionalService.proposeCommand(user, commandPrompt, {
      targetGradeId,
      courseCode,
      durationMinutes,
      questionCount
    });

    res.status(201).json({ proposal });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 6. POST /api/education/institutional/commands/:proposalId/approve - Explicit approval & execution
institutionalRouter.post('/commands/:proposalId/approve', async (req: Request, res: Response) => {
  try {
    const user = await requireLeadershipUser(req);
    const proposalId = Array.isArray(req.params.proposalId) ? req.params.proposalId[0] : String(req.params.proposalId);

    const result = await institutionalService.approveAndExecuteCommand(user, proposalId);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 7. GET /api/education/institutional/audit - Institutional audit ledger
institutionalRouter.get('/audit', async (req: Request, res: Response) => {
  try {
    await requireLeadershipUser(req);
    const institutionId = (req.query.institutionId as string) || 'inst-stark-academy';
    const auditEvents = institutionalService.getAuditEvents(institutionId);
    res.json({ auditEvents, count: auditEvents.length });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});
