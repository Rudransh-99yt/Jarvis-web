import { toolRegistry } from './registry.ts';
import { getSystemHealthTool, getTimeTool } from './diagnostics.ts';
import { getProtocolsTool, setProtocolTool, serverProtocolStore } from './protocols.ts';
import { getSystemTelemetryTool, getArmorStatusTool } from './telemetry.ts';
import {
  listClassesTool,
  listAssignmentsTool,
  createAssignmentTool,
  studentProgressTool,
  listKnowledgeSpacesTool,
  queryKnowledgeTool
} from '../sectors/education/tools.ts';

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
toolRegistry.register(queryKnowledgeTool);

console.log(`[ToolRegistry] Initialized with ${toolRegistry.list().length} registered tools across sectors: ${toolRegistry.list().map(t => t.name).join(', ')}`);

export * from './types.ts';
export * from './registry.ts';
export * from './executor.ts';
export * from './diagnostics.ts';
export * from './protocols.ts';
export * from './telemetry.ts';
export * from '../sectors/education/tools.ts';
export { serverProtocolStore };
