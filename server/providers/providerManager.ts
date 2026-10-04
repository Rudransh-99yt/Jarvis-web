import type { AiProvider, GenerateOptions, ProviderResult, TurnWithToolsResult } from './types.ts';
import { GeminiProvider } from './geminiProvider.ts';
import type { ConversationMessage } from '../../src/types/api.ts';
import type { ToolCall } from '../tools/types.ts';
import { ALLOWED_PROTOCOL_IDS, type AllowedProtocolId } from '../tools/protocols.ts';

// Fallback Mock Provider used when no external AI keys are configured or when Gemini 503s
class FallbackMockProvider implements AiProvider {
  readonly id = 'server-mock';
  readonly name = 'Stark Internal Auxiliary Core (Mock Fallback)';

  isConfigured(): boolean {
    return true;
  }

  async generateTurnWithTools(contents: any[], _options?: GenerateOptions): Promise<TurnWithToolsResult> {
    const lastContent = contents[contents.length - 1];

    // Check if the last turn was a functionResponse
    const fnResponsePart = lastContent?.parts?.find((p: any) => p.functionResponse);
    if (fnResponsePart) {
      const fnName = fnResponsePart.functionResponse.name;
      const fnOutput = fnResponsePart.functionResponse.response?.output || {};

      switch (fnName) {
        case 'get_system_health':
        case 'system.health': {
          const status = fnOutput.status || 'healthy';
          const uptime = fnOutput.uptimeSeconds || 0;
          return {
            reply: `[Auxiliary Core] Health telemetry confirmed: All monitored subsystems are reporting ${status.toUpperCase()} status. Server uptime is ${uptime}s, and internal diagnostic buses remain nominal, sir.`
          };
        }
        case 'get_system_telemetry':
        case 'system.telemetry': {
          const arc = fnOutput.arcReactor || {};
          const shields = fnOutput.defenseShields || {};
          return {
            reply: `[Auxiliary Core] Engineering telemetry retrieved: Arc Reactor core output is steady at ${arc.coreOutputGW || 3.2} GW with ${arc.plasmaStabilityPct || 99.4}% plasma stability. Electromagnetic shield harmonics are operating at ${shields.harmonicResonancePct || 94}%, sir.`
          };
        }
        case 'get_protocols':
        case 'system.protocols.get': {
          const active = fnOutput.activeProtocols || [];
          const activeList = active.length > 0 ? active.join(', ') : 'None (all on standby)';
          return {
            reply: `[Auxiliary Core] Security protocol registry queried: Total registered protocols: ${fnOutput.totalProtocols || 4}. Currently engaged protocols: ${activeList}. All perimeter triggers remain responsive, sir.`
          };
        }
        case 'set_protocol':
        case 'system.protocols.set': {
          const protoName = fnOutput.name || fnOutput.protocolId;
          const isEngaged = fnOutput.active;
          return {
            reply: `[Auxiliary Core] Directive executed: Protocol [${protoName}] has been successfully ${isEngaged ? 'ENGAGED' : 'DISENGAGED'}. Subsystem harmonics updated, sir.`
          };
        }
        case 'get_armor_status':
        case 'system.armor.status': {
          return {
            reply: `[Auxiliary Core] Subterranean vault telemetry verified: ${fnOutput.totalSuits || 6} armor suits ready in standby array across Marks III through LXXXV. Average structural integrity is ${fnOutput.averageIntegrity || 96}%, sir.`
          };
        }
        case 'get_time':
        case 'system.time': {
          return {
            reply: `[Auxiliary Core] Chronological telemetry calibrated: Current server time is ${fnOutput.formattedTime || 'nominal'}, ${fnOutput.formattedDate || ''} (${fnOutput.timezone || 'UTC'}). Stark Epoch: ${fnOutput.starkEpoch || 'ACTIVE'}, sir.`
          };
        }
        case 'education.class.list':
        case 'list_classes': {
          const list = (fnOutput.classes || []).map((c: any) => `${c.code}: ${c.name} (${c.studentCount} students)`).join('\n• ');
          return {
            reply: `[Education Sector] Current academic class roster retrieved:\n• ${list || 'No active classes found.'}`
          };
        }
        case 'education.assignment.list':
        case 'list_assignments': {
          const list = (fnOutput.assignments || []).map((a: any) => `${a.title} [${a.className}] - Due: ${a.dueDate}`).join('\n• ');
          return {
            reply: `[Education Sector] Active assignments catalog:\n• ${list || 'No pending assignments found.'}`
          };
        }
        case 'education.student.progress':
        case 'get_student_progress': {
          return {
            reply: `[Education Sector] Progress summary for ${fnOutput.studentName}:\n• Average Grade: ${fnOutput.averageGradePercentage}%\n• Graded Submissions: ${fnOutput.gradedSubmissions}\n• Pending Assignments: ${fnOutput.pendingAssignmentsCount}`
          };
        }
        case 'knowledge.space.list':
        case 'list_knowledge_spaces': {
          const list = (fnOutput.spaces || []).map((s: any) => `${s.title} (${s.sourceCount} indexed sources)`).join('\n• ');
          return {
            reply: `[Knowledge Sector] Indexed Knowledge Workspaces:\n• ${list || 'No knowledge spaces found.'}`
          };
        }
        case 'knowledge.query':
        case 'query_knowledge': {
          const citation = fnOutput.citations?.[0]?.sourceTitle ? `\n\n*Reference:* ${fnOutput.citations[0].sourceTitle}` : '';
          return {
            reply: `[Grounded Knowledge Response]\n${fnOutput.answer}${citation}`
          };
        }
        default:
          return {
            reply: `[Auxiliary Core] Tool [${fnName}] executed successfully. Data synchronized, sir.`
          };
      }
    }

    // Otherwise, inspect the user's prompt text for intent
    const userText = lastContent?.parts?.find((p: any) => p.text)?.text?.toLowerCase() || '';

    // Education & Knowledge Intents
    if (userText.includes('class') || userText.includes('course') || userText.includes('roster')) {
      return {
        toolCalls: [{ id: `call_cls_${Date.now()}`, name: 'education.class.list', args: {} }]
      };
    }

    if (userText.includes('assignment') || userText.includes('homework') || userText.includes('due date')) {
      return {
        toolCalls: [{ id: `call_asg_${Date.now()}`, name: 'education.assignment.list', args: {} }]
      };
    }

    if (userText.includes('progress') || userText.includes('grade') || userText.includes('my score')) {
      return {
        toolCalls: [{ id: `call_prog_${Date.now()}`, name: 'education.student.progress', args: { studentId: 'student-1' } }]
      };
    }

    if (userText.includes('knowledge space') || userText.includes('notebook') || userText.includes('workspace')) {
      return {
        toolCalls: [{ id: `call_ks_${Date.now()}`, name: 'knowledge.space.list', args: {} }]
      };
    }

    if (userText.includes('quantum') || userText.includes('schrodinger') || userText.includes('oscillator') || userText.includes('stokes') || userText.includes('integral')) {
      const spaceId = userText.includes('stokes') || userText.includes('calculus') ? 'ks-calculus' : 'ks-quantum';
      return {
        toolCalls: [{ id: `call_kq_${Date.now()}`, name: 'knowledge.query', args: { spaceId, query: userText } }]
      };
    }

    // Protocol modifications
    if (userText.includes('protocol') || userText.includes('house party') || userText.includes('defense matrix') || userText.includes('stealth') || userText.includes('clean slate')) {
      const isEnable = userText.includes('activate') || userText.includes('enable') || userText.includes('engage') || userText.includes('turn on') || userText.includes('start');
      const isDisable = userText.includes('deactivate') || userText.includes('disable') || userText.includes('disengage') || userText.includes('turn off') || userText.includes('stop');

      if (isEnable || isDisable) {
        let targetId: AllowedProtocolId = 'house_party';
        if (userText.includes('defense') || userText.includes('matrix')) targetId = 'defense_matrix';
        else if (userText.includes('stealth') || userText.includes('camouflage')) targetId = 'stealth_mode';
        else if (userText.includes('clean slate') || userText.includes('omega')) targetId = 'clean_slate';
        else if (userText.includes('house party') || userText.includes('party')) targetId = 'house_party';

        return {
          toolCalls: [
            {
              id: `call_proto_${Date.now()}`,
              name: 'set_protocol',
              args: { protocolId: targetId, active: isEnable }
            }
          ]
        };
      }

      return {
        toolCalls: [
          {
            id: `call_proto_list_${Date.now()}`,
            name: 'get_protocols',
            args: {}
          }
        ]
      };
    }

    if (userText.includes('health') || userText.includes('status') || userText.includes('diagnostic') || userText.includes('check system') || userText.includes('systems check')) {
      return {
        toolCalls: [
          {
            id: `call_health_${Date.now()}`,
            name: 'get_system_health',
            args: {}
          }
        ]
      };
    }

    if (userText.includes('telemetry') || userText.includes('reactor') || userText.includes('arc') || userText.includes('power') || userText.includes('shield') || userText.includes('quantum core')) {
      return {
        toolCalls: [
          {
            id: `call_telem_${Date.now()}`,
            name: 'get_system_telemetry',
            args: {}
          }
        ]
      };
    }

    if (userText.includes('armor') || userText.includes('suit') || userText.includes('mark') || userText.includes('hulkbuster')) {
      return {
        toolCalls: [
          {
            id: `call_armor_${Date.now()}`,
            name: 'get_armor_status',
            args: {}
          }
        ]
      };
    }

    if (userText.includes('time') || userText.includes('date') || userText.includes('clock') || userText.includes('epoch')) {
      return {
        toolCalls: [
          {
            id: `call_time_${Date.now()}`,
            name: 'get_time',
            args: {}
          }
        ]
      };
    }

    // Default conversational reply
    const reply = `[Auxiliary Core] Directive acknowledged: "${lastContent?.parts?.[0]?.text || 'directive'}". Primary Gemini satellite link is currently awaiting configuration. Auxiliary telemetry routines remain fully operational, sir.`;
    return { reply };
  }

  async generateResponse(messages: ConversationMessage[], options?: GenerateOptions): Promise<ProviderResult> {
    const contents: Array<{ role: 'user'; parts: [{ text: string }] }> = [
      { role: 'user', parts: [{ text: messages[messages.length - 1]?.content || '' }] }
    ];
    const turnResult = await this.generateTurnWithTools(contents, options);
    const reply = turnResult.reply || 'Directive acknowledged, sir.';
    return {
      reply,
      speechText: reply,
      toolCalls: turnResult.toolCalls
    };
  }

  async *generateStream(
    messages: ConversationMessage[],
    options?: GenerateOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, ProviderResult, unknown> {
    const lastMessage = messages[messages.length - 1]?.content || 'directive';
    const tokens = [
      '[Auxiliary Core] ',
      'Directive acknowledged: ',
      `"${lastMessage}". `,
      'Primary Gemini satellite link ',
      'is currently awaiting configuration. ',
      'Auxiliary telemetry routines ',
      'remain fully operational, sir.'
    ];

    let fullReply = '';
    for (const token of tokens) {
      if (abortSignal?.aborted) break;
      fullReply += token;
      yield token;
      await new Promise((r) => setTimeout(r, 40));
    }

    return {
      reply: fullReply,
      speechText: `Directive acknowledged: ${lastMessage}. Systems operational.`
    };
  }
}

export class ProviderManager {
  private providers: Map<string, AiProvider> = new Map();
  private defaultProviderId: string = 'gemini';
  private fallbackProvider: AiProvider = new FallbackMockProvider();

  constructor() {
    this.registerProvider(new GeminiProvider());
  }

  registerProvider(provider: AiProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): AiProvider | undefined {
    return this.providers.get(id);
  }

  getFallbackProvider(): AiProvider {
    return this.fallbackProvider;
  }

  getActiveProvider(): { provider: AiProvider; isFallback: boolean } {
    const primary = this.providers.get(this.defaultProviderId);
    if (primary && primary.isConfigured()) {
      return { provider: primary, isFallback: false };
    }
    return { provider: this.fallbackProvider, isFallback: true };
  }

  getProviderStatus(): { id: string; name: string; available: boolean }[] {
    const statusList: { id: string; name: string; available: boolean }[] = [];
    this.providers.forEach((prov) => {
      statusList.push({
        id: prov.id,
        name: prov.name,
        available: prov.isConfigured()
      });
    });
    return statusList;
  }
}

export const providerManager = new ProviderManager();
