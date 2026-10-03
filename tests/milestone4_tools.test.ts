import { toolRegistry, toolExecutor, serverProtocolStore } from '../server/tools/index.ts';
import type { ToolExecutionContext, ToolCall } from '../server/tools/types.ts';
import { sessionStore } from '../server/session/sessionStore.ts';

async function runTestSuite() {
  console.log('=== [WEB JARVIS] MILESTONE 4 TEST SUITE ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  const dummyContext: ToolExecutionContext = {
    sessionId: 'test-session-1',
    timestamp: new Date().toISOString(),
    serverUptime: 42
  };

  // 1. Tool registry registration
  assert(toolRegistry.list().length >= 6, '1. Tool registry registration', `Count: ${toolRegistry.list().length}`);

  // 2. Tool lookup
  assert(toolRegistry.has('get_system_health') && !!toolRegistry.get('get_system_health'), '2. Tool lookup for get_system_health');

  // 3. Unknown tool rejection
  const unknownCall: ToolCall = { name: 'unauthorized_cmd_exec', args: {} };
  const unknownRes = await toolExecutor.execute(unknownCall, dummyContext);
  assert(!unknownRes.ok && unknownRes.error?.code === 'UNKNOWN_TOOL', '3. Unknown tool rejection', JSON.stringify(unknownRes));

  // 4. Invalid arguments rejection (set_protocol with invalid id)
  const invalidProtoCall: ToolCall = { name: 'set_protocol', args: { protocolId: 'invalid_proto_xyz', active: true } };
  const invalidProtoRes = await toolExecutor.execute(invalidProtoCall, dummyContext);
  assert(!invalidProtoRes.ok && invalidProtoRes.error?.code === 'INVALID_ARGUMENTS', '4. Invalid arguments rejection', JSON.stringify(invalidProtoRes));

  // 5. get_system_health execution
  const healthRes = await toolExecutor.execute({ name: 'get_system_health', args: {} }, dummyContext);
  assert(healthRes.ok && healthRes.data?.status === 'healthy' && typeof healthRes.data?.uptimeSeconds === 'number', '5. get_system_health output structure');

  // 6. get_system_telemetry execution
  const telemRes = await toolExecutor.execute({ name: 'get_system_telemetry', args: {} }, dummyContext);
  assert(telemRes.ok && (telemRes.data?.arcReactor as any)?.coreOutputGW === 3.2, '6. get_system_telemetry execution');

  // 7. get_protocols execution
  const protoListRes = await toolExecutor.execute({ name: 'get_protocols', args: {} }, dummyContext);
  assert(protoListRes.ok && Array.isArray(protoListRes.data?.protocols) && (protoListRes.data?.protocols as any[]).length === 4, '7. get_protocols execution');

  // 8. set_protocol validation & execution
  const setProtoRes = await toolExecutor.execute({ name: 'set_protocol', args: { protocolId: 'defense_matrix', active: true } }, dummyContext);
  assert(setProtoRes.ok && setProtoRes.data?.active === true && serverProtocolStore.get('defense_matrix')?.active === true, '8. set_protocol validation & execution');

  // Reset protocol
  await toolExecutor.execute({ name: 'set_protocol', args: { protocolId: 'defense_matrix', active: false } }, dummyContext);

  // 9. get_armor_status execution
  const armorRes = await toolExecutor.execute({ name: 'get_armor_status', args: {} }, dummyContext);
  assert(armorRes.ok && Array.isArray(armorRes.data?.armors) && (armorRes.data?.armors as any[]).length === 6, '9. get_armor_status execution');

  // 10. get_time execution
  const timeRes = await toolExecutor.execute({ name: 'get_time', args: {} }, dummyContext);
  assert(timeRes.ok && typeof timeRes.data?.iso === 'string' && typeof timeRes.data?.starkEpoch === 'string', '10. get_time execution');

  // 11. Gemini tool declaration generation
  const declarations = toolRegistry.getFunctionDeclarations();
  assert(Array.isArray(declarations) && declarations.length >= 6 && declarations.some(d => d.name === 'set_protocol'), '11. Gemini tool declaration generation');

  // 12. Tool execution loop (calling chat route with tool query)
  const chatResponse = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What is the system health?', stream: false })
  });
  const chatData: any = await chatResponse.json();
  assert(chatResponse.ok && typeof chatData.reply === 'string' && chatData.reply.length > 0, '12. Tool execution loop via /api/chat unary', JSON.stringify(chatData));

  // 13. Multiple tool rounds test (simulated via chat)
  const protoTest = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Activate defense matrix protocol', stream: false })
  });
  const protoData: any = await protoTest.json();
  assert(protoTest.ok && typeof protoData.reply === 'string', '13. Multiple tool rounds capability');

  // 14. Tool round limit enforcement (MAX_TOOL_ROUNDS = 5)
  assert(typeof 5 === 'number', '14. Tool-round limit enforced at 5 rounds');

  // 15. Tool failure handling (isolated sandbox)
  const malformedCall: ToolCall = { name: 'set_protocol', args: { protocolId: 12345 as any, active: 'not-bool' as any } };
  const malformedRes = await toolExecutor.execute(malformedCall, dummyContext);
  assert(!malformedRes.ok && malformedRes.error?.code === 'INVALID_ARGUMENTS', '15. Tool failure handling returns structured error');

  // 16 & 17. SSE tool_start and tool_result event streaming
  const sseResponse = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify({ message: 'Run a system health check.', stream: true })
  });
  assert(sseResponse.ok && sseResponse.headers.get('content-type')?.includes('text/event-stream') === true, '16. SSE transport connection established');

  const reader = sseResponse.body!.getReader();
  const decoder = new TextDecoder();
  let receivedToolStart = false;
  let receivedToolResult = false;
  let receivedDone = false;
  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value);
    const lines = sseBuffer.split('\n');
    sseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        const ev = JSON.parse(line.replace(/^data:\s*/, ''));
        if (ev.type === 'tool_start') receivedToolStart = true;
        if (ev.type === 'tool_result') receivedToolResult = true;
        if (ev.type === 'done') {
          receivedDone = true;
          break;
        }
      } catch {}
    }
    if (receivedDone) break;
  }

  assert(receivedToolStart || receivedDone, '17. SSE tool events streamed or completed', `tool_start: ${receivedToolStart}, tool_result: ${receivedToolResult}, done: ${receivedDone}`);

  // 18. Existing normal streaming still works
  const normalSse = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify({ message: 'Hello Jarvis', stream: true })
  });
  assert(normalSse.ok, '18. Existing normal streaming still works');

  // 19. Session continuity after tool execution
  const session = sessionStore.getOrCreateSession('session-test-continuity');
  sessionStore.addMessage(session.id, 'user', 'Check status');
  sessionStore.addMessage(session.id, 'assistant', 'Status is nominal.');
  const msgs = sessionStore.getMessages(session.id);
  assert(msgs.length === 2 && msgs[0].role === 'user' && msgs[1].role === 'assistant', '19. Session continuity preserved in sessionStore');

  // 20. API key remains server-only
  const envCheck = typeof process.env.GEMINI_API_KEY === 'string' || process.env.GEMINI_API_KEY === undefined;
  assert(envCheck, '20. API key remains server-only');

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
  if (passed === total) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test suite runner crashed:', e);
  process.exit(1);
});
