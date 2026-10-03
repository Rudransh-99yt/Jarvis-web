import { toolRegistry } from './registry.ts';
import { getSystemHealthTool, getTimeTool } from './diagnostics.ts';
import { getProtocolsTool, setProtocolTool, serverProtocolStore } from './protocols.ts';
import { getSystemTelemetryTool, getArmorStatusTool } from './telemetry.ts';
import {
  listClassesTool,
  listAssignmentsTool,
  createAssignmentTool,
  studentProgressTool,
  listKnowledgeSpacesTool
} from '../sectors/education/tools.ts';
import {
  listThreadsTool,
  listMessagesTool,
  sendMessageTool
} from '../sectors/education/messagingTools.ts';

import {
  addSourceTool,
  listSourcesTool,
  ingestSourceTool,
  deleteSourceTool,
  retrieveKnowledgeTool,
  queryKnowledgeTool
} from './ragTools.ts';
import {
  createResearchProjectTool,
  listResearchProjectsTool,
  getResearchProjectTool,
  createResearchQuestionTool,
  listResearchQuestionsTool,
  listResearchEvidenceTool,
  createResearchNoteTool,
  listResearchNotesTool,
  investigateResearchTool,
  generateResearchReportTool
} from '../sectors/research/tools.ts';
import {
  listFilesTool,
  getFileTool,
  deleteFileTool,
  ingestFileTool
} from '../storage/tools.ts';

// 1. Register Core System / Command Sector Tools
toolRegistry.register(getSystemHealthTool);
toolRegistry.register(getTimeTool);
toolRegistry.register(getProtocolsTool);
toolRegistry.register(setProtocolTool);
toolRegistry.register(getSystemTelemetryTool);
toolRegistry.register(getArmorStatusTool);

// 2. Register Education & Knowledge Sector Tools
toolRegistry.register(listClassesTool);
toolRegistry.register(listAssignmentsTool);
toolRegistry.register(createAssignmentTool);
toolRegistry.register(studentProgressTool);
toolRegistry.register(listKnowledgeSpacesTool);
toolRegistry.register(listThreadsTool);
toolRegistry.register(listMessagesTool);
toolRegistry.register(sendMessageTool);

// 3. Register RAG & Grounded Knowledge Engine Tools
toolRegistry.register(addSourceTool);
toolRegistry.register(listSourcesTool);
toolRegistry.register(ingestSourceTool);
toolRegistry.register(deleteSourceTool);
toolRegistry.register(retrieveKnowledgeTool);
toolRegistry.register(queryKnowledgeTool);

// 4. Register Research & Labs Sector Tools (Milestone 9)
toolRegistry.register(createResearchProjectTool);
toolRegistry.register(listResearchProjectsTool);
toolRegistry.register(getResearchProjectTool);
toolRegistry.register(createResearchQuestionTool);
toolRegistry.register(listResearchQuestionsTool);
toolRegistry.register(listResearchEvidenceTool);
toolRegistry.register(createResearchNoteTool);
toolRegistry.register(listResearchNotesTool);
toolRegistry.register(investigateResearchTool);
toolRegistry.register(generateResearchReportTool);

// 5. Register Unified File & Storage Tools (Milestone 10)
toolRegistry.register(listFilesTool);
toolRegistry.register(getFileTool);
toolRegistry.register(deleteFileTool);
toolRegistry.register(ingestFileTool);

// 6. Register Smart Classroom Tools (Milestone 12)
import { CLASSROOM_TOOLS } from '../sectors/education/classroomTools.ts';
for (const tool of CLASSROOM_TOOLS) {
  toolRegistry.register(tool);
}

// 7. Register Smart Quiz & Live Response Tools (Milestone 13)
import { quizTools } from '../sectors/education/quizTools.ts';
for (const tool of quizTools) {
  toolRegistry.register(tool);
}

// 8. Register Video Library & Media Knowledge Tools (Milestone 14)
import { videoTools } from '../sectors/education/videoTools.ts';
for (const tool of videoTools) {
  toolRegistry.register(tool);
}

console.log(`[ToolRegistry] Initialized with ${toolRegistry.list().length} registered tools across sectors: ${toolRegistry.list().map(t => t.name).join(', ')}`);

export * from './types.ts';
export * from './registry.ts';
export * from './executor.ts';
export * from './diagnostics.ts';
export * from './protocols.ts';
export * from './telemetry.ts';
export * from './ragTools.ts';
export * from '../sectors/education/tools.ts';
export * from '../sectors/education/messagingTools.ts';
export * from '../sectors/education/classroomTools.ts';
export * from '../sectors/research/tools.ts';
export * from '../storage/tools.ts';
export { serverProtocolStore };
