// Server-authoritative Real-Time Teaching Copilot Service (D.11)

import type { User } from '../../../data/types.ts';
import type {
  CopilotCommandIntent,
  CopilotActionClass,
  CopilotProposal,
  CopilotContext,
  CopilotAuditEvent
} from '../../../../src/types/copilot.ts';
import { visualizationService } from '../visualization/visualizationService.ts';
import { smartboardStore } from '../smartboard/smartboardStore.ts';
import { toolExecutor } from '../../../tools/index.ts';

class CopilotService {
  private proposals: Map<string, CopilotProposal> = new Map();
  private auditEvents: CopilotAuditEvent[] = [];

  /**
   * Classify command intent into action class
   */
  public classifyIntent(intent: CopilotCommandIntent): CopilotActionClass {
    switch (intent) {
      case 'EXPLAIN_CONCEPT':
      case 'EXPLAIN_BOARD_OBJECT':
      case 'SIMPLIFY_EXPLANATION':
      case 'FIND_IN_TEXTBOOK':
      case 'ANSWER_TEACHER_QUESTION':
      case 'SHOW_RESOURCE':
        return 'SAFE_READ';

      case 'CREATE_VISUALIZATION':
      case 'MODIFY_VISUALIZATION':
      case 'CREATE_GRAPH':
      case 'CREATE_DIAGRAM':
      case 'GENERATE_EXAMPLE':
      case 'SUMMARIZE_BOARD':
      case 'CREATE_NOTES':
      case 'CHECK_STUDENT_CONFUSION':
        return 'TEACHER_CONFIRMATION';

      case 'START_QUIZ':
      case 'CREATE_HOMEWORK':
      case 'CREATE_FLASHCARDS':
        return 'HIGH_IMPACT';

      default:
        return 'TEACHER_CONFIRMATION';
    }
  }

  /**
   * Assemble bounded AI context strictly for the current session
   */
  public buildContext(params: Partial<CopilotContext>): CopilotContext {
    return {
      institutionId: params.institutionId || 'inst-stark-academy',
      classId: params.classId || 'class-phys-301',
      courseCode: params.courseCode || 'PHYS-301',
      courseName: params.courseName || 'Advanced Electrodynamics',
      unitId: params.unitId,
      lessonId: params.lessonId,
      lessonTitle: params.lessonTitle || 'Gauss Law & Field Flux',
      classSessionId: params.classSessionId || 'session-phys-101',
      currentBoardPageId: params.currentBoardPageId,
      selectedElementIds: params.selectedElementIds || [],
      boardAIContext: params.boardAIContext,
      approvedKnowledgeSpaceIds: params.approvedKnowledgeSpaceIds || ['ks-phys-301'],
      recentClassroomEvents: params.recentClassroomEvents || []
    };
  }

  /**
   * Process a natural language or structured teacher copilot command
   */
  public async processCommand(
    user: User,
    command: string,
    context: CopilotContext,
    options?: { selectedEquation?: string; targetIntent?: CopilotCommandIntent }
  ): Promise<{
    intent: CopilotCommandIntent;
    actionClass: CopilotActionClass;
    immediateReply?: string;
    proposal?: CopilotProposal;
  }> {
    if (user.role !== 'teacher' && user.role !== 'principal') {
      throw new Error('Forbidden: Only authorized teachers can use Teaching Copilot controls (403)');
    }

    const cmdLower = command.toLowerCase().trim();
    let intent: CopilotCommandIntent = options?.targetIntent || 'EXPLAIN_CONCEPT';

    if (cmdLower.includes('plot') || cmdLower.includes('graph') || cmdLower.includes('waveform')) {
      intent = 'CREATE_GRAPH';
    } else if (cmdLower.includes('diagram') || cmdLower.includes('circuit') || cmdLower.includes('draw flow')) {
      intent = 'CREATE_DIAGRAM';
    } else if (cmdLower.includes('quiz') || cmdLower.includes('question') || cmdLower.includes('pulse')) {
      intent = 'START_QUIZ';
    } else if (cmdLower.includes('summarize') || cmdLower.includes('board summary')) {
      intent = 'SUMMARIZE_BOARD';
    } else if (cmdLower.includes('homework') || cmdLower.includes('assignment')) {
      intent = 'CREATE_HOMEWORK';
    } else if (cmdLower.includes('flashcard')) {
      intent = 'CREATE_FLASHCARDS';
    } else if (cmdLower.includes('confusion') || cmdLower.includes('misconception')) {
      intent = 'CHECK_STUDENT_CONFUSION';
    } else if (cmdLower.includes('example')) {
      intent = 'GENERATE_EXAMPLE';
    } else if (cmdLower.includes('explain') || cmdLower.includes('what is') || cmdLower.includes('derive')) {
      intent = 'EXPLAIN_CONCEPT';
    }

    const actionClass = this.classifyIntent(intent);
    const now = new Date().toISOString();

    // 1. SAFE_READ: Generate immediate pedagogical response
    if (actionClass === 'SAFE_READ') {
      let explanation = '';
      if (intent === 'EXPLAIN_CONCEPT') {
        explanation = `[Teaching Copilot]: For ${context.lessonTitle || context.courseCode}, recall that Gauss's Law states the net outward electric flux through any closed Gaussian surface is proportional to the enclosed charge: ∮ E·dA = Q_enc / ε₀. When analyzing spherical or cylindrical charge distributions, choose a Gaussian surface matching the symmetry to keep |E| constant on the integration boundary.`;
      } else {
        explanation = `[Teaching Copilot]: Verified source textbook excerpt for ${context.courseCode}: Inverse-square law ensures total field flux remains invariant regardless of the closed surface geometry.`;
      }

      this.recordAudit({
        id: `audit-${Date.now()}`,
        timestamp: now,
        teacherId: user.id,
        classSessionId: context.classSessionId,
        intent,
        actionClass,
        approved: true,
        executionStatus: 'SUCCESS',
        details: { command, replyLength: explanation.length }
      });

      return { intent, actionClass, immediateReply: explanation };
    }

    // 2. TEACHER_CONFIRMATION or HIGH_IMPACT: Create structured proposal
    const proposalId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let title = '';
    let summary = '';
    let payload: Record<string, any> = {};
    let toolToExecute: string | undefined;
    let toolArgs: Record<string, any> | undefined;

    if (intent === 'CREATE_GRAPH' || intent === 'CREATE_VISUALIZATION') {
      const expr = options?.selectedEquation || (cmdLower.includes('sin') ? 'sin(x)' : 'x^2 - 4*x + 4');
      title = `Interactive Graph: f(x) = ${expr}`;
      summary = `Propose plotting 2D interactive graph for "${expr}" and attaching to SmartBoard canvas.`;
      payload = {
        type: 'GRAPH',
        title: `Graph of ${expr}`,
        series: [{ id: 's1', name: expr, expression: expr, color: '#00f2fe' }],
        xDomain: [-10, 10],
        yDomain: [-5, 5],
        grid: true
      };
      toolToExecute = 'visualization.create';
      toolArgs = {
        title: `Graph of ${expr}`,
        visualizationType: 'GRAPH',
        payload,
        courseCode: context.courseCode,
        classSessionId: context.classSessionId,
        isReleased: true
      };
    } else if (intent === 'START_QUIZ') {
      title = 'Formative Understanding Pulse (2 Questions)';
      summary = 'Propose launching 2-minute quick check on Gauss cylindrical flux symmetry across enrolled cadets.';
      payload = {
        questionCount: 2,
        durationMinutes: 2,
        topics: ['Gauss Law', 'Cylindrical Flux']
      };
      toolToExecute = 'quiz.start';
      toolArgs = { quizId: 'quiz-phys-301-1' };
    } else if (intent === 'SUMMARIZE_BOARD') {
      title = 'Board Session Summary Note';
      summary = 'Generate structured student revision sheet from current handwritten derivations.';
      payload = {
        topicsCovered: ["Gauss's Law Integral Form", 'Cylindrical Line Charge Derivation'],
        keyFormulas: ['E = λ / (2πε₀r)', '∮ E·dA = Q / ε₀']
      };
    } else {
      title = `Teacher Action Proposal: ${intent}`;
      summary = `Propose action for ${command}`;
      payload = { intent, context: context.lessonTitle };
    }

    const proposal: CopilotProposal = {
      id: proposalId,
      classSessionId: context.classSessionId,
      boardId: `doc-${context.classSessionId}`,
      pageId: context.currentBoardPageId,
      teacherId: user.id,
      intent,
      actionClass,
      title,
      summary,
      payload,
      toolToExecute,
      toolArgs,
      status: 'PROPOSED',
      requiresApproval: true,
      createdAt: now
    };

    this.proposals.set(proposalId, proposal);

    this.recordAudit({
      id: `audit-${Date.now()}`,
      timestamp: now,
      teacherId: user.id,
      classSessionId: context.classSessionId,
      intent,
      actionClass,
      toolRequested: toolToExecute,
      approved: false,
      executionStatus: 'SUCCESS',
      details: { proposalId, title }
    });

    return { intent, actionClass, proposal };
  }

  /**
   * Teacher approves or rejects a Copilot proposal
   */
  public async reviewProposal(
    user: User,
    proposalId: string,
    decision: 'APPROVE' | 'REJECT',
    options?: { rejectionReason?: string }
  ): Promise<CopilotProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found`);
    }

    if (user.role !== 'teacher' && user.role !== 'principal') {
      throw new Error('Forbidden: Only teachers can review proposals (403)');
    }

    const now = new Date().toISOString();

    if (decision === 'REJECT') {
      proposal.status = 'REJECTED';
      proposal.rejectionReason = options?.rejectionReason || 'Teacher declined proposal';
      this.recordAudit({
        id: `audit-${Date.now()}`,
        timestamp: now,
        teacherId: user.id,
        classSessionId: proposal.classSessionId,
        intent: proposal.intent,
        actionClass: proposal.actionClass,
        toolRequested: proposal.toolToExecute,
        approved: false,
        executionStatus: 'REJECTED',
        details: { proposalId, reason: proposal.rejectionReason }
      });
      return proposal;
    }

    // APPROVE & EXECUTE
    proposal.status = 'APPROVED';
    proposal.isApproved = true;
    proposal.approvedAt = now;

    if (proposal.toolToExecute && proposal.toolArgs) {
      try {
        const result = await toolExecutor.execute(
          proposal.toolToExecute,
          proposal.toolArgs,
          {
            sessionId: proposal.classSessionId,
            timestamp: now,
            serverUptime: 1000,
            userId: user.id,
            role: user.role
          }
        );
        proposal.status = 'EXECUTED';
        proposal.executedAt = new Date().toISOString();
        proposal.executionResult = result.data;

        // If it was a visualization creation, auto-attach to board page if specified
        if (proposal.intent === 'CREATE_GRAPH' || proposal.intent === 'CREATE_VISUALIZATION') {
          const visId = (result.data as any)?.visualization?.id;
          if (visId && proposal.boardId) {
            await visualizationService.attachToSmartBoard(
              user,
              proposal.boardId,
              proposal.pageId || 'page-1',
              visId
            );
          }
        }
      } catch (err: any) {
        proposal.status = 'FAILED';
        proposal.executionResult = { error: err?.message };
      }
    } else {
      proposal.status = 'EXECUTED';
      proposal.executedAt = now;
    }

    this.recordAudit({
      id: `audit-${Date.now()}`,
      timestamp: now,
      teacherId: user.id,
      classSessionId: proposal.classSessionId,
      intent: proposal.intent,
      actionClass: proposal.actionClass,
      toolRequested: proposal.toolToExecute,
      approved: true,
      executionStatus: proposal.status === 'EXECUTED' ? 'SUCCESS' : 'FAILED',
      details: { proposalId, result: proposal.executionResult }
    });

    return proposal;
  }

  public getProposal(id: string): CopilotProposal | undefined {
    return this.proposals.get(id);
  }

  public listProposals(sessionId: string): CopilotProposal[] {
    return Array.from(this.proposals.values()).filter((p) => p.classSessionId === sessionId);
  }

  public getAuditEvents(sessionId?: string): CopilotAuditEvent[] {
    if (sessionId) {
      return this.auditEvents.filter((a) => a.classSessionId === sessionId);
    }
    return [...this.auditEvents];
  }

  private recordAudit(event: CopilotAuditEvent): void {
    this.auditEvents.push(event);
    if (this.auditEvents.length > 500) {
      this.auditEvents.shift();
    }
  }
}

export const copilotService = new CopilotService();
