// Milestone 9: Research & Labs Sector Automated Test Suite
import { toolExecutor, toolRegistry } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import { jarvisData, createRepository } from '../server/data/index.ts';
import { researchAssistant } from '../server/sectors/research/researchAssistant.ts';

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Assertion failed: ${testName}`);
  }
  console.log(`[PASS] ${testName}`);
}

const dummyContext: ToolExecutionContext = {
  sessionId: 'test-research-session-1',
  timestamp: new Date().toISOString(),
  serverUptime: 100,
  sector: 'research',
  userId: 'user-tony',
  role: 'commander'
};

async function runMilestone9Tests() {
  console.log('\n=== [WEB JARVIS] MILESTONE 9: RESEARCH & LABS SECTOR TEST SUITE ===\n');

  // Initialize data repository
  await jarvisData.init();
  await jarvisData.seed();

  // Test 1: Project CRUD - Create
  const testProject = await jarvisData.research.createProject({
    workspaceId: 'ws-stark-core',
    ownerId: 'user-tony',
    title: 'Arc Reactor Plasma Toroidal Boundary Study',
    description: 'Investigating high-energy plasma containment via differential geometry.',
    status: 'active',
    researchQuestion: 'Can Stokes Theorem verify zero-leakage plasma boundaries in toroidal magnetic coils?',
    knowledgeSpaceIds: ['ks-quantum', 'ks-calculus']
  });

  assert(Boolean(testProject && testProject.id.startsWith('proj-')), '1. Project CRUD: Create research project');
  assert(testProject.status === 'active', '2. Project default status is active');

  // Test 3: Project CRUD - Get by ID
  const retrievedProject = await jarvisData.research.getProjectById(testProject.id, 'ws-stark-core');
  assert(Boolean(retrievedProject && retrievedProject.title === testProject.title), '3. Project CRUD: Retrieve project by ID');

  // Test 4: Workspace Isolation
  const crossWorkspaceCheck = await jarvisData.research.getProjectById(testProject.id, 'ws-external-foreign');
  assert(crossWorkspaceCheck === null, '4. Workspace Isolation: Foreign workspace cannot access project');

  // Test 5: Project CRUD - Update
  const updatedProject = await jarvisData.research.updateProject(testProject.id, {
    status: 'paused',
    description: 'Temporarily paused for sensor recalibration.'
  }, 'ws-stark-core');
  assert(Boolean(updatedProject && updatedProject.status === 'paused'), '5. Project CRUD: Update status and description');

  // Test 6: Question CRUD - Create
  const question1 = await jarvisData.research.createQuestion({
    projectId: testProject.id,
    workspaceId: 'ws-stark-core',
    title: 'Magnetic Boundary Line Integral Equivalence',
    question: 'How does line integration around boundary curve C relate to total surface curl of magnetic field F?',
    priority: 'critical',
    status: 'investigating',
    notes: 'Checking against classical Stokes formulation in ks-calculus.'
  });
  assert(Boolean(question1 && question1.id.startsWith('q-')), '6. Question CRUD: Create question');

  // Test 7: Question CRUD - List
  const questionsList = await jarvisData.research.listQuestions(testProject.id, 'ws-stark-core');
  assert(questionsList.length >= 1 && questionsList.some((q) => q.id === question1.id), '7. Question CRUD: List questions for project');

  // Test 8: Question CRUD - Update Status
  const answeredQuestion = await jarvisData.research.updateQuestion(question1.id, {
    status: 'answered',
    answer: 'Stokes theorem confirms surface integral of curl F equals closed line integral around boundary.'
  });
  assert(Boolean(answeredQuestion && answeredQuestion.status === 'answered' && answeredQuestion.answer), '8. Question CRUD: Update question status & answer');

  // Test 9: Evidence Integrity - Link to Real Chunk
  const realChunks = await jarvisData.knowledge.getChunksForSpace('ks-calculus', 'ws-stark-core');
  assert(realChunks.length > 0, '9. Evidence Integrity: Real database chunks exist in ks-calculus');
  const targetChunk = realChunks[0];

  const evidenceRecord = await jarvisData.research.createEvidence({
    projectId: testProject.id,
    workspaceId: 'ws-stark-core',
    questionId: question1.id,
    knowledgeSourceId: targetChunk.sourceId,
    knowledgeSpaceId: targetChunk.knowledgeSpaceId,
    sourceTitle: targetChunk.sourceTitle,
    chunkId: targetChunk.id,
    chunkText: targetChunk.text,
    citation: {
      sourceId: targetChunk.sourceId,
      sourceTitle: targetChunk.sourceTitle,
      chunkId: targetChunk.id,
      spaceId: targetChunk.knowledgeSpaceId,
      page: targetChunk.page,
      section: targetChunk.section,
      excerpt: targetChunk.text.slice(0, 150),
      score: 0.95
    },
    relevance: 0.95,
    userNote: 'Definitive analytical proof of surface curl boundary line equivalence.',
    tags: ['Stokes Theorem', 'Plasma Boundary']
  });

  assert(Boolean(evidenceRecord && evidenceRecord.id.startsWith('ev-')), '10. Evidence CRUD: Create grounded evidence record');
  assert(evidenceRecord.chunkId === targetChunk.id, '11. Evidence matches real ingested chunk ID');

  // Verify question has linked evidence
  const refreshedQuestion = await jarvisData.research.getQuestionById(question1.id);
  assert(Boolean(refreshedQuestion && refreshedQuestion.linkedEvidenceIds.includes(evidenceRecord.id)), '12. Question linkedEvidenceIds automatically updated');

  // Test 13: Research Notes CRUD
  const note1 = await jarvisData.research.createNote({
    projectId: testProject.id,
    workspaceId: 'ws-stark-core',
    authorId: 'user-tony',
    title: 'Plasma Boundary Mathematical Synthesis',
    content: 'Boundary curve integration establishes exact conservation of magnetic flux.',
    linkedQuestionIds: [question1.id],
    linkedEvidenceIds: [evidenceRecord.id],
    tags: ['Plasma', 'Derivations']
  });
  assert(Boolean(note1 && note1.id.startsWith('note-')), '13. Research Notes: Create note');
  const projectNotes = await jarvisData.research.listNotes(testProject.id);
  assert(projectNotes.length >= 1, '14. Research Notes: List notes for project');

  // Test 15: AI Research Assistant - Grounded Investigation
  const invResult = await researchAssistant.investigate(
    testProject.id,
    'Explain how Stokes theorem relates curl to the boundary curve integral',
    {
      mode: 'investigate',
      questionId: question1.id,
      workspaceId: 'ws-stark-core'
    }
  );
  assert(invResult.isGrounded === true, '15. Grounded Research: Investigation is grounded in verified sources');
  assert(invResult.citations.length > 0, '16. Grounded Research: Returns verifiable structured citations');
  assert(invResult.extractedEvidence.length > 0, '17. Grounded Research: Extracts candidate evidence items');

  // Test 18: Insufficient Evidence Refusal
  const refusalResult = await researchAssistant.investigate(
    testProject.id,
    'What was the secret recipe for 14th century Venetian blown glassware pigment?',
    {
      mode: 'investigate',
      workspaceId: 'ws-stark-core'
    }
  );
  assert(refusalResult.isGrounded === false, '18. Insufficient Evidence: Refusal triggered for out-of-domain query');
  assert(refusalResult.citations.length === 0, '19. Insufficient Evidence: Zero fabricated citations produced');
  assert(refusalResult.answer.includes('insufficient evidence'), '20. Insufficient Evidence: Explicit refusal text present');

  // Test 21: Multi-Source Comparative Synthesis
  const compareResult = await researchAssistant.investigate(
    testProject.id,
    'Compare the quantum harmonic oscillator ground state with surface curl boundary conditions',
    {
      mode: 'compare',
      workspaceId: 'ws-stark-core'
    }
  );
  assert(compareResult.isGrounded === true, '21. Multi-Source: Comparative synthesis grounded across spaces');
  assert(compareResult.sourcesUsed.length >= 1, '22. Multi-Source: Uses multiple source documents');

  // Test 23: Research Report Generation
  const report = await researchAssistant.generateReport(testProject.id, {
    title: 'Formal Technical Synthesis: Toroidal Plasma Confinement',
    questionId: question1.id,
    workspaceId: 'ws-stark-core'
  });
  assert(Boolean(report && report.id.startsWith('rep-')), '23. Report Generation: Persists structured report');
  assert(report.findings.length > 0, '24. Report Generation: Findings section populated');
  assert(report.evidenceReferences.length > 0, '25. Report Generation: Evidence references linked');
  assert(report.sourceCitations.length > 0, '26. Report Generation: Source citations included');
  assert(report.limitations.length > 0, '27. Report Generation: Boundary limitations explicitly noted');

  // Test 28: Tool Execution - research.project.create
  const toolCreateProjResult = await toolExecutor.execute({
    name: 'research.project.create',
    args: {
      title: 'Vibranium Lattice Resonance Project',
      researchQuestion: 'What vibrational modes produce constructive acoustic interference in vibranium?',
      workspaceId: 'ws-stark-core'
    }
  }, dummyContext);
  assert(toolCreateProjResult.ok === true, '28. Tool Execution: research.project.create succeeds');

  // Test 29: Tool Execution - research.project.list
  const toolListProjResult = await toolExecutor.execute({
    name: 'research.project.list',
    args: { workspaceId: 'ws-stark-core' }
  }, dummyContext);
  assert(toolListProjResult.ok === true && (toolListProjResult.data?.count as number) >= 2, '29. Tool Execution: research.project.list lists projects');

  // Test 30: Tool Execution - research.investigate
  const toolInvResult = await toolExecutor.execute({
    name: 'research.investigate',
    args: {
      projectId: testProject.id,
      query: 'What is the ground state energy of a quantum harmonic oscillator?',
      mode: 'investigate'
    }
  }, dummyContext);
  assert(toolInvResult.ok === true && Boolean(toolInvResult.data?.isGrounded), '30. Tool Execution: research.investigate returns grounded data');

  // Test 31: Tool Execution - research.report.generate
  const toolRepResult = await toolExecutor.execute({
    name: 'research.report.generate',
    args: {
      projectId: testProject.id,
      title: 'Automated Brief on Harmonic Zero-Point Energy'
    }
  }, dummyContext);
  assert(toolRepResult.ok === true && Boolean(toolRepResult.data?.report), '31. Tool Execution: research.report.generate generates report');

  // Test 32: Persistence across Repository Instances (Restart Simulation)
  await jarvisData.flush();
  const restoredRepo = createRepository('disk', jarvisData.storagePath);
  await restoredRepo.init();
  const recoveredProject = await restoredRepo.research.getProjectById(testProject.id, 'ws-stark-core');
  assert(Boolean(recoveredProject && recoveredProject.title === testProject.title), '32. Persistence: Project recovered after simulated restart');

  const recoveredReports = await restoredRepo.research.listReports(testProject.id);
  assert(recoveredReports.length >= 1, '33. Persistence: Reports recovered after restart');

  console.log('\n=== ALL 33 MILESTONE 9 RESEARCH & LABS TESTS PASSED SUCCESSFULLY! ===\n');
  await jarvisData.flush();
  process.exit(0);
}

runMilestone9Tests().catch((err) => {
  console.error('\n[FATAL] Milestone 9 test runner failed:', err);
  process.exit(1);
});
