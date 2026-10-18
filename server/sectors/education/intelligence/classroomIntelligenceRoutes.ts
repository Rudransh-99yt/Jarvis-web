// REST API Routes for Phase D.15: Classroom Intelligence Engine

import { Router, type Request, type Response } from 'express';
import { classroomIntelligenceService } from './classroomIntelligenceService.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';

export const classroomIntelligenceRouter = Router();

// Helper to resolve authenticated user via canonical authentication
async function resolveUser(req: Request): Promise<User> {
  return authenticateRequest(req, jarvisData);
}

function handleIntelError(err: any, res: Response, defaultMessage: string) {
  const isUnauth = err.statusCode === 401 || err.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
  const isForbidden = err.statusCode === 403 || err.code === 'FORBIDDEN' || err.message?.includes('Forbidden') || err.message?.includes('Access denied');
  const isNotFound = err.statusCode === 404 || err.message?.includes('not found');
  const status = isUnauth ? 401 : isForbidden ? 403 : isNotFound ? 404 : (err.statusCode || 500);
  res.status(status).json({
    success: false,
    error: err.message || defaultMessage
  });
}

/**
 * GET /api/education/intelligence/sessions/:sessionId
 * Fetch canonical Classroom Intelligence for a ClassSession.
 */
classroomIntelligenceRouter.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.sessionId as string;
    const forceRefreshAi = req.query.refreshAi === 'true';

    const intelligence = await classroomIntelligenceService.getIntelligenceForSession(
      sessionId,
      user,
      'ws-stark-core',
      forceRefreshAi
    );

    res.json({
      success: true,
      intelligence
    });
  } catch (err: any) {
    handleIntelError(err, res, 'Failed to retrieve classroom intelligence.');
  }
});

/**
 * GET /api/education/intelligence/classes/:classId
 * Fetch latest Classroom Intelligence for a class.
 */
classroomIntelligenceRouter.get('/classes/:classId', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const classId = req.params.classId as string;

    const allSessions = classSessionStore.listSessionsSync
      ? classSessionStore.listSessionsSync().filter((s: any) => s.classId === classId)
      : [];

    const latestSession = allSessions[0];
    const sessionId = latestSession ? latestSession.id : 'session-phys-101';

    const intelligence = await classroomIntelligenceService.getIntelligenceForSession(
      sessionId,
      user,
      'ws-stark-core'
    );

    res.json({
      success: true,
      intelligence
    });
  } catch (err: any) {
    handleIntelError(err, res, 'Failed to retrieve class intelligence.');
  }
});

/**
 * GET /api/education/intelligence/grade/:gradeId
 * Principal/Executive grade level aggregated intelligence.
 */
classroomIntelligenceRouter.get('/grade/:gradeId', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const gradeId = req.params.gradeId as string;

    const gradeIntel = classroomIntelligenceService.getGradeIntelligence(gradeId, user);
    res.json({
      success: true,
      gradeIntelligence: gradeIntel
    });
  } catch (err: any) {
    handleIntelError(err, res, 'Failed to retrieve grade intelligence.');
  }
});

/**
 * GET /api/education/intelligence/family/:studentId
 * Family portal intelligence view for parents.
 */
classroomIntelligenceRouter.get('/family/:studentId', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const studentId = req.params.studentId as string;

    const familyIntel = classroomIntelligenceService.getFamilyIntelligence(studentId, user);
    res.json({
      success: true,
      familyIntelligence: familyIntel
    });
  } catch (err: any) {
    handleIntelError(err, res, 'Failed to retrieve family intelligence.');
  }
});

/**
 * POST /api/education/intelligence/sessions/:sessionId/carry-forward
 * Carry forward approved signals into the next session.
 */
classroomIntelligenceRouter.post('/sessions/:sessionId/carry-forward', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const fromSessionId = req.params.sessionId as string;
    const { toSessionId, approvedSignalIds } = req.body || {};

    if (!toSessionId || !Array.isArray(approvedSignalIds)) {
      res.status(400).json({
        success: false,
        error: "Missing required 'toSessionId' or 'approvedSignalIds' array in request body."
      });
      return;
    }

    const updatedSignals = classroomIntelligenceService.carryForwardSignalsToNextSession(
      fromSessionId,
      toSessionId,
      approvedSignalIds,
      user
    );

    res.json({
      success: true,
      carryForwardSignals: updatedSignals
    });
  } catch (err: any) {
    handleIntelError(err, res, 'Failed to carry forward signals.');
  }
});

/**
 * POST /api/education/intelligence/sessions/:sessionId/interpret
 * Request explicit AI interpretation of classroom evidence.
 */
classroomIntelligenceRouter.post('/sessions/:sessionId/interpret', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.sessionId as string;

    const intelligence = await classroomIntelligenceService.getIntelligenceForSession(
      sessionId,
      user,
      'ws-stark-core',
      true // force refresh AI
    );

    res.json({
      success: true,
      aiInterpretation: intelligence.aiInterpretation
    });
  } catch (err: any) {
    handleIntelError(err, res, 'Failed to interpret classroom evidence.');
  }
});
