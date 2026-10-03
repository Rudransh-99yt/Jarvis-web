import type { ToolCall, ToolExecutionContext, ToolResult } from './types.ts';
import { toolRegistry } from './registry.ts';

export class ToolExecutor {
  async execute(call: ToolCall, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    const toolName = call.name ? call.name.trim() : '';

    // 1. Validation: Allowlist check
    if (!toolRegistry.has(toolName)) {
      console.warn(`[ToolExecutor] Rejected unauthorized tool call: '${toolName}'`);
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_TOOL',
          message: `Tool '${toolName}' is not registered or permitted in the Stark tactical subsystem.`
        }
      };
    }

    const tool = toolRegistry.get(toolName)!;

    // 2. Validation: Arguments validation
    const validation = tool.validate(call.args || {});
    if (!validation.valid) {
      console.warn(`[ToolExecutor] Invalid arguments for tool '${toolName}': ${validation.error}`);
      return {
        ok: false,
        error: {
          code: 'INVALID_ARGUMENTS',
          message: `Invalid parameters supplied for tool '${toolName}': ${validation.error}`
        }
      };
    }

    // 3. Execution: Isolated execution sandbox
    try {
      const result = await tool.execute(validation.data, context);
      const durationMs = Date.now() - startTime;
      console.log(`[ToolExecutor] Executed '${toolName}' in ${durationMs}ms (status: ${result.ok ? 'OK' : 'ERROR'})`);
      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const rawMessage = err?.message || 'Unexpected failure during tool execution';
      // Redact any sensitive tokens or internal paths
      const safeMessage = rawMessage.replace(/key=[^&\s]+/gi, 'key=[REDACTED]');
      console.error(`[ToolExecutor] Execution error in '${toolName}' after ${durationMs}ms:`, safeMessage);

      return {
        ok: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: `Tool execution failed: ${safeMessage}`
        }
      };
    }
  }
}

export const toolExecutor = new ToolExecutor();
