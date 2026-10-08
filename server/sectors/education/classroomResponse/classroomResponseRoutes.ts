import { Router, type Request, type Response } from 'express';

export const classroomResponseRouter = Router();

classroomResponseRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'active',
    service: 'classroom-response-foundation',
    timestamp: new Date().toISOString()
  });
});
