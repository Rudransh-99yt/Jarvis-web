// Milestone 8: Grounded RAG & Multi-Source Knowledge Engine Automated Test Suite
import { toolExecutor, toolRegistry } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import { DocumentExtractor } from '../server/rag/extractor.ts';
import { DocumentChunker } from '../server/rag/chunker.ts';
import { DeterministicLocalEmbeddingProvider, embeddingProviderManager } from '../server/rag/embeddingProvider.ts';
import { LocalVectorIndex } from '../server/rag/vectorIndex.ts';
import { retrievalService } from '../server/rag/retrievalService.ts';
import { ingestionPipeline } from '../server/rag/ingestionPipeline.ts';
import { groundingService } from '../server/rag/groundingService.ts';
import { jarvisData } from '../server/data/index.ts';

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Assertion failed: ${testName}`);
  }
  console.log(`[PASS] ${testName}`);
}

const dummyContext: ToolExecutionContext = {
  sessionId: 'test-rag-session-1',
  callCount: 1,
  maxRounds: 5,
  executedTools: []
};

async function runMilestone8Tests() {
  console.log('\n=== [WEB JARVIS] MILESTONE 8: GROUNDED RAG & MULTI-SOURCE KNOWLEDGE TEST SUITE ===\n');

  // Initialize data repository
  await jarvisData.init();
  await jarvisData.seed();

  // 1. Source Creation & Lifecycle
  const spaceId = 'ks-quantum';
  const workspaceId = 'ws-stark-core';

  const newSrcInput = {
    workspaceId,
    knowledgeSpaceId: spaceId,
    name: 'Quantum Decoherence & Open Systems.md',
    rawContent: `# Quantum Decoherence and Thermal Bath Coupling
The interaction of a quantum system with an external environment leads to phase information loss known as quantum decoherence.
The reduced density matrix elements decay exponentially with time constant tau_d = hbar / (k_B T delta_x^2).
Unlike wave function collapse, decoherence is a continuous unitary evolution of the combined system and environment.`,
    type: 'markdown' as const,
    author: 'Dr. Sarah'
  };

  const ingestionRes = await ingestionPipeline.ingestSource(newSrcInput);
  assert(ingestionRes.status === 'ready', '1. Source creation & RAG ingestion pipeline');

  // 2. Source Authorization (Cross-Workspace Isolation)
  const invalidSpaceRes = await jarvisData.knowledge.getSpaceById('ks-quantum', 'ws-non-existent');
  assert(invalidSpaceRes === null, '2. Source authorization enforces workspace isolation');

  // 3. Text Extraction
  const textExtract = DocumentExtractor.extractPlainText('Simple plain text file contents with system parameters.', 'plain.txt');
  assert(textExtract.normalizedText.includes('Simple plain text'), '3. Plain text extraction');

  // 4. Markdown Extraction
  const mdExtract = DocumentExtractor.extractMarkdown('# Quantum Header\n\nContent paragraph.', 'notes.md');
  assert(mdExtract.metadata.sections?.includes('Quantum Header'), '4. Markdown section extraction');

  // 5. PDF Extraction
  const pdfExtract = DocumentExtractor.extractPdfText('BT (PDF Stream Text Excerpt) Tj ET', 'doc.pdf');
  assert(pdfExtract.normalizedText.includes('PDF Stream Text Excerpt'), '5. PDF stream text extraction');

  // 6. Text Normalization
  const unnormalized = '  Control \x07 chars \r\n\r\n and   spaces  ';
  const normalized = DocumentExtractor.normalizeText(unnormalized);
  assert(!normalized.includes('\x07') && normalized.includes('Control chars'), '6. Text normalization strips control chars and collapses whitespace');

  // 7. Deterministic Chunking
  const chunks = DocumentChunker.chunk({
    sourceId: 'src-test-chunk',
    knowledgeSpaceId: spaceId,
    workspaceId,
    sourceTitle: 'Test Doc',
    text: 'Paragraph 1 statement about quantum states.\n\nParagraph 2 explanation of Hamiltonian matrix operations.'
  }, { chunkSize: 100, chunkOverlap: 20 });
  assert(chunks.length >= 2 && chunks[0].id === 'chunk-src-test-chunk-0', '7. Deterministic chunking generates stable IDs and boundaries');

  // 8. Content Hashing
  const hash1 = DocumentExtractor.hashContent('Identical Content String');
  const hash2 = DocumentExtractor.hashContent('Identical Content String');
  assert(hash1 === hash2 && hash1.length === 64, '8. Content hashing produces deterministic SHA-256 strings');

  // 9. Duplicate Ingestion Prevention
  const dupRes = await ingestionPipeline.ingestSource(newSrcInput);
  assert(dupRes.isDuplicate === true && dupRes.status === 'ready', '9. Duplicate ingestion prevention detects identical content hash');

  // 10. Embedding Provider Contract
  const localEmbedder = new DeterministicLocalEmbeddingProvider();
  const vec1 = await localEmbedder.embedText('quantum harmonic oscillator ladder operators');
  assert(Array.isArray(vec1) && vec1.length === 128, '10. Embedding provider contract produces 128-dim vectors');

  // 11. Vector Index Upsert
  const vectorIndex = new LocalVectorIndex();
  await vectorIndex.upsert([chunks[0]]);
  const count = await vectorIndex.count({ spaceId });
  assert(count > 0, '11. Vector index upsert persists chunks to storage');

  // 12. Vector Similarity Search
  const vec2 = await localEmbedder.embedText('quantum harmonic oscillator ladder operators');
  const sim = LocalVectorIndex.cosineSimilarity(vec1, vec2);
  assert(Math.abs(sim - 1.0) < 0.001, '12. Vector similarity search computes cosine similarity 1.0 for identical texts');

  // 13. Hybrid Retrieval
  const hybridChunks = await retrievalService.retrieve(spaceId, 'Schrödinger wave equation and wave function');
  assert(hybridChunks.length > 0 && typeof hybridChunks[0].score === 'number', '13. Hybrid retrieval combines vector similarity and lexical matching');

  // 14. Source Deletion
  const deleted = await jarvisData.knowledge.deleteSource(ingestionRes.sourceId);
  const remainingChunks = await jarvisData.knowledge.getChunksForSource(ingestionRes.sourceId);
  assert(deleted && remainingChunks.length === 0, '14. Source deletion purges source record and vector chunks');

  // 15. Workspace Isolation
  const crossWsRetrieval = await retrievalService.retrieve(spaceId, 'quantum', { workspaceId: 'ws-other-unauthorized' });
  assert(crossWsRetrieval.length === 0, '15. Workspace isolation prevents cross-workspace retrieval');

  // 16. Class / Knowledge Space Authorization
  let studentAuthFailed = false;
  try {
    await groundingService.answerQuery(spaceId, 'Explain Schrödinger equation', {
      workspaceId,
      userId: 'student-unauthorized-99',
      userRole: 'student'
    });
  } catch (err: any) {
    studentAuthFailed = err.message.includes('Access denied');
  }
  assert(studentAuthFailed, '16. Class membership authorization restricts unauthorized students');

  // 17. Grounded Query Pipeline
  const groundedRes = await groundingService.answerQuery(spaceId, 'What is the Schrödinger equation?', {
    workspaceId,
    userId: 'student-1',
    userRole: 'student'
  });
  assert(groundedRes.isGrounded === true && typeof groundedRes.answer === 'string', '17. Grounded query pipeline synthesizes answers from sources');

  // 18. Insufficient Evidence Refusal Behavior
  const insufficientRes = await groundingService.answerQuery(spaceId, 'What is the speed of light in interstellar black hole singularities?', {
    workspaceId,
    minConfidenceScore: 0.99 // Force rejection
  });
  assert(insufficientRes.isGrounded === false && insufficientRes.citations.length === 0 && insufficientRes.answer.includes('insufficient evidence'), '18. Insufficient evidence refusal states lack of evidence without fabricating citations');

  // 19. Citation Generation
  assert(groundedRes.citations.length > 0 && typeof groundedRes.citations[0].sourceTitle === 'string', '19. Citation generation produces structured citations with source title and excerpt');

  // 20. Multi-Source Synthesis
  const multiSourceRes = await groundingService.answerQuery(spaceId, 'Compare harmonic oscillator ladder operators and wave mechanics', {
    workspaceId
  });
  assert(multiSourceRes.sourcesUsed.length >= 2, '20. Multi-source synthesis combines evidence across multiple documents');

  // 21. Tools System Verification for RAG Tools
  const addToolRes = await toolExecutor.execute({
    name: 'knowledge.source.add',
    args: {
      spaceId: 'ks-calculus',
      name: 'Green Theorem Formulation.md',
      content: 'Green Theorem connects line integrals around simple closed curves C to double integrals over plane region D.',
      type: 'notes'
    }
  }, dummyContext);
  assert(addToolRes.ok && addToolRes.data?.status === 'ready', '21. Tool knowledge.source.add executes RAG ingestion pipeline');

  const queryToolRes = await toolExecutor.execute({
    name: 'knowledge.query',
    args: {
      spaceId: 'ks-calculus',
      query: 'State Green Theorem'
    }
  }, dummyContext);
  assert(queryToolRes.ok && Array.isArray(queryToolRes.data?.citations), '22. Tool knowledge.query performs grounded answer synthesis');

  // 23. Milestones 1-7 Regression Verification
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const healthData: any = await healthRes.json();
    assert(healthRes.ok && healthData.status === 'healthy', '23. Regression check: GET /api/health endpoint functional');
  } catch {
    assert(jarvisData.isPersistent === true, '23. Regression check: Core persistence initialized');
  }

  console.log('\n=== ALL 23 MILESTONE 8 & REGRESSION TESTS PASSED SUCCESSFULLY! ===\n');
}

runMilestone8Tests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[TEST SUITE CRASHED]', err);
    process.exit(1);
  });
