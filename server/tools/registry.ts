import type { FunctionDeclaration } from '@google/genai';
import type { ToolDefinition } from './types.ts';

export class ToolRegistry {
  private toolsByName: Map<string, ToolDefinition<any>> = new Map();
  private canonicalTools: Set<ToolDefinition<any>> = new Set();

  register(tool: ToolDefinition<any>): void {
    if (this.toolsByName.has(tool.name)) {
      console.warn(`[ToolRegistry] Overwriting existing registration for tool '${tool.name}'.`);
    }
    this.toolsByName.set(tool.name, tool);
    this.canonicalTools.add(tool);

    // Register any aliases for backward compatibility or alternate namings
    if (tool.aliases && Array.isArray(tool.aliases)) {
      for (const alias of tool.aliases) {
        this.toolsByName.set(alias, tool);
      }
    }
  }

  get(toolName: string): ToolDefinition<any> | undefined {
    return this.toolsByName.get(toolName);
  }

  has(toolName: string): boolean {
    return this.toolsByName.has(toolName);
  }

  list(sector?: string): ToolDefinition<any>[] {
    const list = Array.from(this.canonicalTools);
    if (!sector || sector === 'all') {
      return list;
    }
    const normalized = sector.toLowerCase();
    return list.filter((t) => {
      const toolSector = t.sector || 'system';
      if (toolSector === 'all') return true;
      if (normalized === 'command' || normalized === 'system') {
        return toolSector === 'system';
      }
      if (normalized === 'education') {
        return toolSector === 'education' || toolSector === 'knowledge';
      }
      return toolSector === normalized;
    });
  }

  getFunctionDeclarations(sector?: string): FunctionDeclaration[] {
    return this.list(sector).map((tool) => tool.declaration);
  }
}

export const toolRegistry = new ToolRegistry();
