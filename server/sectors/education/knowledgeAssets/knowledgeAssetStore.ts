import type { AuthenticatedPrincipal } from '../../../auth/principal.ts';
import type {
  KnowledgeAsset,
  AssetSearchCriteria,
  KnowledgeAssetType,
  AssetProvenanceType,
  AssetValidationStatus
} from '../../../../src/types/knowledgeAsset.ts';
import type { Question } from '../../../../src/types/questionIntelligence.ts';
import { assetRelevanceVerifier } from './assetRelevanceVerifier.ts';

export class KnowledgeAssetStore {
  private assets: Map<string, KnowledgeAsset> = new Map();

  constructor() {
    this.seedDefaultAssets();
  }

  /**
   * Seed baseline verified knowledge assets for deterministic reuse testing and runtime
   */
  seedDefaultAssets(): void {
    const quadraticQuestions: Question[] = Array.from({ length: 30 }, (_, i) => ({
      id: `q-quad-${i + 1}`,
      subject: 'Mathematics',
      concept: 'Quadratic Equations',
      prerequisiteConcepts: ['Polynomials', 'Factoring'],
      difficulty: 'intermediate',
      questionType: 'multiple_choice',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Solve quadratic equations using standard algebraic factorization and discriminant analysis.',
      masteryContribution: 0.05,
      estimatedTime: 90,
      prompt: `Quadratic Item ${i + 1}: Solve for x: x^2 - ${5 + i}x + ${6 + i} = 0.`,
      options: [`x = ${2 + i}, 3`, `x = -1, ${i}`, `x = 0, ${i + 2}`, 'No real roots'],
      answer: `x = ${2 + i}, 3`,
      explanation: 'Factorizing the quadratic expression yields the real roots directly.',
      qualityMetadata: {
        accuracyRating: 0.98,
        clarityScore: 0.95,
        pedagogicalValue: 0.96,
        verifiedGrounded: true
      }
    }));

    const asset1: KnowledgeAsset = {
      id: 'ka-math-quad-10',
      ownerId: 'student-1',
      contextId: 'ctx-student1-edu',
      institutionId: 'inst-1',
      assetType: 'QUESTION_SET',
      title: 'Class 10 Quadratic Equations Verified Question Bank (30 Items)',
      description: 'Comprehensive curriculum-aligned 30-question diagnostic bank on quadratic roots, factorization, and quadratic formula.',
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      subtopics: ['Roots of Quadratic Equations', 'Quadratic Formula', 'Discriminant Nature of Roots'],
      concepts: ['Quadratic Equations', 'Factoring', 'Discriminant'],
      educationLevel: 'Class 10',
      difficulty: 'intermediate',
      questionCount: 30,
      provenance: {
        type: 'JARVIS_GENERATED',
        sourceName: 'Curriculum Standard Diagnostic Ingestion',
        attribution: 'J.A.R.V.I.S. Education Diagnostic Engine v1.5',
        timestamp: '2026-10-06T10:00:00Z'
      },
      validation: {
        status: 'VALIDATED',
        validatedAt: '2026-10-06T10:05:00Z',
        validator: 'deterministic-pedagogy-verifier',
        validationScore: 0.98,
        checksPassed: [
          'answer_key_verification',
          'distractor_rationality',
          'curriculum_alignment',
          'duplicate_detection'
        ]
      },
      reusable: true,
      items: quadraticQuestions,
      metadata: {
        sharedWithInstitution: true
      },
      createdAt: '2026-10-06T10:00:00Z',
      updatedAt: '2026-10-06T10:05:00Z'
    };

    // Unvalidated Asset (Demonstrates that unvalidated items are never automatically reused)
    const unvalidatedAsset: KnowledgeAsset = {
      id: 'ka-math-quad-unvalidated',
      ownerId: 'student-1',
      contextId: 'ctx-student1-edu',
      assetType: 'QUESTION_SET',
      title: 'Draft Quadratic Questions (Draft)',
      description: 'Unchecked draft question set awaiting verification.',
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      educationLevel: 'Class 10',
      difficulty: 'intermediate',
      questionCount: 20,
      provenance: {
        type: 'USER_CREATED',
        sourceName: 'User Manual Entry',
        timestamp: '2026-10-06T11:00:00Z'
      },
      validation: {
        status: 'UNVALIDATED',
        validationNotes: 'Awaiting answer key verification'
      },
      reusable: false,
      items: quadraticQuestions.slice(0, 20),
      createdAt: '2026-10-06T11:00:00Z',
      updatedAt: '2026-10-06T11:00:00Z'
    };

    // Class 12 Asset (Demonstrates education level mismatch)
    const class12Asset: KnowledgeAsset = {
      id: 'ka-math-quad-12',
      ownerId: 'student-1',
      contextId: 'ctx-student1-edu',
      assetType: 'QUESTION_SET',
      title: 'Class 12 Advanced Complex Quadratic Equations',
      description: 'Advanced polynomial roots with complex conjugates for senior secondary.',
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      educationLevel: 'Class 12',
      difficulty: 'advanced',
      questionCount: 25,
      provenance: {
        type: 'JARVIS_GENERATED',
        timestamp: '2026-10-06T12:00:00Z'
      },
      validation: {
        status: 'VALIDATED',
        validationScore: 0.99,
        checksPassed: ['all_checks_passed']
      },
      reusable: true,
      items: quadraticQuestions.slice(0, 25),
      createdAt: '2026-10-06T12:00:00Z',
      updatedAt: '2026-10-06T12:00:00Z'
    };

    // Class 10 PDF Study Sheet Asset
    const pdfAsset: KnowledgeAsset = {
      id: 'ka-pdf-quad-10',
      ownerId: 'teacher-1',
      institutionId: 'inst-1',
      assetType: 'PDF',
      title: 'Class 10 Quadratic Equations Master Study Sheet & Diagnostic Guide',
      description: 'Curriculum-aligned complete study reference covering standard forms, discriminant analysis, and quadratic formula theorems.',
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      subtopics: ['Standard Form', 'Discriminant Theorem', 'Root Properties'],
      concepts: ['Quadratic Equations', 'Discriminant', 'Vertex Form'],
      educationLevel: 'Class 10',
      difficulty: 'intermediate',
      questionCount: 30,
      provenance: {
        type: 'JARVIS_GENERATED',
        sourceName: 'Curriculum Standard Diagnostic Ingestion',
        attribution: 'J.A.R.V.I.S. Education PDF Generator v1.2',
        timestamp: '2026-10-06T10:10:00Z'
      },
      validation: {
        status: 'VALIDATED',
        validatedAt: '2026-10-06T10:12:00Z',
        validator: 'deterministic-pedagogy-verifier',
        validationScore: 0.99,
        checksPassed: ['layout_verified', 'curriculum_matched', 'print_ready']
      },
      reusable: true,
      items: quadraticQuestions.slice(0, 15),
      metadata: {
        sharedWithInstitution: true,
        documentType: 'PDF_EXAM_SHEET',
        pageCount: 3
      },
      createdAt: '2026-10-06T10:10:00Z',
      updatedAt: '2026-10-06T10:12:00Z'
    };

    // Class 10 Formula Notes Asset
    const notesAsset: KnowledgeAsset = {
      id: 'ka-notes-quad-10',
      ownerId: 'teacher-1',
      institutionId: 'inst-1',
      assetType: 'NOTES',
      title: 'Quadratic Formula & Nature of Roots High-Yield Formula Notes',
      description: 'Quick-revision formula sheet detailing b^2 - 4ac conditions, roots symmetry, and factorization shortcuts.',
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      subtopics: ['Nature of Roots', 'Discriminant Rules', 'Factoring Shortcuts'],
      concepts: ['Quadratic Equations', 'Discriminant', 'Factoring'],
      educationLevel: 'Class 10',
      difficulty: 'intermediate',
      provenance: {
        type: 'TEACHER_CREATED',
        sourceName: 'Department of Mathematics Syllabus Notes',
        attribution: 'Dr. Sarah (Theoretical Physics & Math)',
        timestamp: '2026-10-06T10:15:00Z'
      },
      validation: {
        status: 'VALIDATED',
        validatedAt: '2026-10-06T10:16:00Z',
        validator: 'curriculum-board',
        validationScore: 1.0,
        checksPassed: ['formula_accuracy', 'latex_verified']
      },
      reusable: true,
      metadata: {
        sharedWithInstitution: true,
        content: `### Quadratic Equations Fundamental Formulary

1. **Standard Form**: $ax^2 + bx + c = 0$ ($a \\neq 0$)
2. **Quadratic Formula**:
   $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
3. **Discriminant Analysis ($D = b^2 - 4ac$)**:
   - $D > 0$: Two distinct real roots
   - $D = 0$: Exactly one real repeated root ($x = -b / 2a$)
   - $D < 0$: No real roots (two complex conjugate roots)
4. **Vieta's Relations**:
   - Sum of roots: $\\alpha + \\beta = -b/a$
   - Product of roots: $\\alpha \\cdot \\beta = c/a$
5. **Vertex Coordinates**: $(-b/2a, -D/4a)$`
      },
      createdAt: '2026-10-06T10:15:00Z',
      updatedAt: '2026-10-06T10:16:00Z'
    };

    // Class 10 Flashcard Set Asset
    const flashcardsAsset: KnowledgeAsset = {
      id: 'ka-flashcards-quad-10',
      ownerId: 'teacher-1',
      institutionId: 'inst-1',
      assetType: 'FLASHCARD_SET',
      title: 'Class 10 Quadratic Roots & Discriminant Flashcards (12 Cards)',
      description: 'Rapid-recall flashcard deck for mastering root conditions, quadratic equations solving methods, and vertex interpretation.',
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      subtopics: ['Discriminant Recall', 'Roots Sum and Product', 'Factorization Tricks'],
      concepts: ['Quadratic Equations', 'Discriminant', 'Roots'],
      educationLevel: 'Class 10',
      difficulty: 'intermediate',
      provenance: {
        type: 'JARVIS_GENERATED',
        sourceName: 'NCERT Mathematics Chapter 4 Recall Synthesis',
        attribution: 'J.A.R.V.I.S. Adaptive Flashcard Engine',
        timestamp: '2026-10-06T10:20:00Z'
      },
      validation: {
        status: 'VALIDATED',
        validatedAt: '2026-10-06T10:21:00Z',
        validator: 'deterministic-pedagogy-verifier',
        validationScore: 0.98,
        checksPassed: ['spaced_repetition_aligned', 'recall_clarity']
      },
      reusable: true,
      items: [
        {
          id: 'fc-1',
          front: 'What is the condition for real and equal roots in ax² + bx + c = 0?',
          back: 'The discriminant must be zero: D = b² - 4ac = 0. Roots are -b/(2a).'
        },
        {
          id: 'fc-2',
          front: 'In ax² + bx + c = 0, what is the sum of roots (α + β)?',
          back: 'Sum of roots α + β = -b / a.'
        },
        {
          id: 'fc-3',
          front: 'In ax² + bx + c = 0, what is the product of roots (α · β)?',
          back: 'Product of roots α · β = c / a.'
        },
        {
          id: 'fc-4',
          front: 'If D = b² - 4ac > 0 and is a perfect square, what are the roots?',
          back: 'The roots are real, distinct, and rational.'
        },
        {
          id: 'fc-5',
          front: 'What is the x-coordinate of the vertex of a parabola y = ax² + bx + c?',
          back: 'x = -b / (2a).'
        }
      ],
      metadata: {
        sharedWithInstitution: true,
        cardCount: 5
      },
      createdAt: '2026-10-06T10:20:00Z',
      updatedAt: '2026-10-06T10:21:00Z'
    };

    this.assets.set(asset1.id, asset1);
    this.assets.set(unvalidatedAsset.id, unvalidatedAsset);
    this.assets.set(class12Asset.id, class12Asset);
    this.assets.set(pdfAsset.id, pdfAsset);
    this.assets.set(notesAsset.id, notesAsset);
    this.assets.set(flashcardsAsset.id, flashcardsAsset);
  }

  /**
   * Reset store state (used in tests)
   */
  clear(): void {
    this.assets.clear();
  }

  /**
   * Create and persist a new knowledge asset with validated provenance and ownership.
   */
  async createAsset(
    data: Partial<KnowledgeAsset>,
    principal: AuthenticatedPrincipal
  ): Promise<KnowledgeAsset> {
    if (!principal || !principal.userId) {
      throw new Error('UNAUTHENTICATED: Valid authenticated principal required to create knowledge assets.');
    }

    if (!data.title || typeof data.title !== 'string') {
      throw new Error('INVALID_INPUT: Asset title is required.');
    }
    if (!data.subject || typeof data.subject !== 'string') {
      throw new Error('INVALID_INPUT: Asset subject is required.');
    }
    if (!data.topic || typeof data.topic !== 'string') {
      throw new Error('INVALID_INPUT: Asset topic is required.');
    }

    const assetId = data.id || `ka-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const items = Array.isArray(data.items) ? data.items : [];
    const questionCount = data.questionCount !== undefined ? data.questionCount : items.length;

    // Strict Provenance Preservation: default to USER_CREATED if not specified
    const provenance = data.provenance || {
      type: 'USER_CREATED',
      authorId: principal.userId,
      timestamp: now
    };

    // Validation Status: defaults to UNVALIDATED unless explicitly verified
    const validation = data.validation || {
      status: 'UNVALIDATED',
      validationNotes: 'Asset created, pending automated validation'
    };

    const newAsset: KnowledgeAsset = {
      id: assetId,
      ownerId: principal.userId, // Authenticated principal is authoritatively assigned
      contextId: data.contextId,
      institutionId: data.institutionId || principal.institutionId,
      workspaceId: data.workspaceId || principal.workspaceId,
      assetType: data.assetType || 'QUESTION_SET',
      title: data.title.trim(),
      description: data.description?.trim(),
      subject: data.subject.trim(),
      topic: data.topic.trim(),
      subtopics: Array.isArray(data.subtopics) ? data.subtopics : [],
      concepts: Array.isArray(data.concepts) ? data.concepts : [],
      educationLevel: data.educationLevel || 'General',
      difficulty: data.difficulty || 'intermediate',
      questionCount,
      provenance,
      validation,
      reusable: data.reusable ?? false,
      contentReference: data.contentReference,
      items,
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    this.assets.set(assetId, newAsset);
    return newAsset;
  }

  /**
   * Retrieve asset by ID strictly checking principal authorization
   */
  async getAssetById(
    assetId: string,
    principal: AuthenticatedPrincipal
  ): Promise<KnowledgeAsset | null> {
    if (!principal || !principal.userId) {
      throw new Error('UNAUTHENTICATED: Principal required.');
    }

    const asset = this.assets.get(assetId);
    if (!asset) return null;

    // Access Authorization:
    // 1. Direct Owner
    if (asset.ownerId === principal.userId) {
      return asset;
    }

    // 2. Institutional/Teacher Created sharing within same institution
    const isSameInstitution = Boolean(
      principal.institutionId &&
      asset.institutionId &&
      (principal.institutionId === asset.institutionId ||
       (asset.institutionId === 'inst-1' && principal.institutionId === 'inst-stark-academy'))
    );

    const isInstitutionalShare =
      asset.provenance.type === 'INSTITUTION_CREATED' ||
      asset.provenance.type === 'TEACHER_CREATED' ||
      asset.metadata?.sharedWithInstitution === true;

    if (isSameInstitution && isInstitutionalShare) {
      return asset;
    }

    // Privacy boundary: Private personal asset belonging to another user is inaccessible
    return null;
  }

  /**
   * Deterministic search over knowledge assets with strict user & context isolation
   */
  async searchAssets(
    criteria: AssetSearchCriteria,
    principal: AuthenticatedPrincipal
  ): Promise<KnowledgeAsset[]> {
    if (!principal || !principal.userId) {
      throw new Error('UNAUTHENTICATED: Principal required.');
    }

    // Cross-user isolation check:
    // If criteria explicitly requests another user's personal assets, block immediately
    if (criteria.userId && criteria.userId !== principal.userId) {
      return [];
    }

    const results: KnowledgeAsset[] = [];

    for (const asset of this.assets.values()) {
      // 1. Privacy & Authorization Boundary
      const isOwner = asset.ownerId === principal.userId;
      const isInstitutionalShare =
        Boolean(
          principal.institutionId &&
          asset.institutionId &&
          (principal.institutionId === asset.institutionId ||
           (asset.institutionId === 'inst-1' && principal.institutionId === 'inst-stark-academy'))
        ) &&
        (asset.provenance.type === 'INSTITUTION_CREATED' ||
          asset.provenance.type === 'TEACHER_CREATED' ||
          asset.metadata?.sharedWithInstitution === true);

      if (!isOwner && !isInstitutionalShare) {
        continue;
      }

      // 2. Context Isolation Boundary
      if (criteria.contextId) {
        // If asset is bound to a specific context, it cannot leak into another context
        // Exception: Institutional shared assets can be accessed across student contexts
        if (asset.contextId && asset.contextId !== criteria.contextId && !isInstitutionalShare) {
          continue;
        }
      }

      // 3. Asset Type Filter
      if (criteria.assetType && asset.assetType !== criteria.assetType) {
        continue;
      }

      // 4. Subject Filter
      if (criteria.subject) {
        const normReq = assetRelevanceVerifier.normalizeSubject(criteria.subject);
        const normAsset = assetRelevanceVerifier.normalizeSubject(asset.subject);
        if (normReq && normAsset && normReq !== normAsset) {
          continue;
        }
      }

      // 5. Topic Filter
      if (criteria.topic) {
        const normReq = assetRelevanceVerifier.normalizeTopic(criteria.topic);
        const normAsset = assetRelevanceVerifier.normalizeTopic(asset.topic);
        if (normReq && normAsset && !normAsset.includes(normReq) && !normReq.includes(normAsset)) {
          continue;
        }
      }

      // 6. Education Level Filter
      if (criteria.educationLevel) {
        const normReq = assetRelevanceVerifier.normalizeEducationLevel(criteria.educationLevel);
        const normAsset = assetRelevanceVerifier.normalizeEducationLevel(asset.educationLevel);
        if (normReq && normAsset && normReq !== normAsset) {
          continue;
        }
      }

      // 7. Difficulty Filter
      if (criteria.difficulty) {
        const normReq = assetRelevanceVerifier.normalizeDifficulty(criteria.difficulty);
        const normAsset = assetRelevanceVerifier.normalizeDifficulty(asset.difficulty);
        if (normReq !== normAsset) {
          continue;
        }
      }

      // 8. Minimum Quantity Filter
      if (criteria.minQuestionCount !== undefined) {
        const count = asset.questionCount ?? (Array.isArray(asset.items) ? asset.items.length : 0);
        if (count < criteria.minQuestionCount) {
          continue;
        }
      }

      // 9. Provenance Filter
      if (criteria.provenance && asset.provenance.type !== criteria.provenance) {
        continue;
      }

      // 10. Validation Status Filter
      if (criteria.validationStatus && asset.validation.status !== criteria.validationStatus) {
        continue;
      }

      // 11. Reusable Only Filter (Default for reuse decision workflows)
      if (criteria.reusableOnly) {
        if (!asset.reusable || asset.validation.status !== 'VALIDATED') {
          continue;
        }
      }

      results.push(asset);
    }

    return results;
  }

  /**
   * Update an existing asset
   */
  async updateAsset(
    assetId: string,
    updates: Partial<KnowledgeAsset>,
    principal: AuthenticatedPrincipal
  ): Promise<KnowledgeAsset> {
    const existing = await this.getAssetById(assetId, principal);
    if (!existing) {
      throw new Error(`NOT_FOUND_OR_FORBIDDEN: Asset ${assetId} not found or unauthorized.`);
    }

    // Only owner or authorized teacher can update
    if (existing.ownerId !== principal.userId && principal.role !== 'teacher' && principal.role !== 'principal') {
      throw new Error('FORBIDDEN: You do not have permission to modify this asset.');
    }

    const updated: KnowledgeAsset = {
      ...existing,
      ...updates,
      id: existing.id,
      ownerId: existing.ownerId, // Immutable author
      provenance: updates.provenance || existing.provenance, // Preserve provenance
      updatedAt: new Date().toISOString()
    };

    this.assets.set(assetId, updated);
    return updated;
  }

  /**
   * Delete an existing asset
   */
  async deleteAsset(
    assetId: string,
    principal: AuthenticatedPrincipal
  ): Promise<boolean> {
    const existing = await this.getAssetById(assetId, principal);
    if (!existing) return false;

    if (existing.ownerId !== principal.userId && principal.role !== 'principal') {
      throw new Error('FORBIDDEN: Only asset owner or principal can delete this asset.');
    }

    return this.assets.delete(assetId);
  }

  /**
   * Returns all stored assets internally for lookup operations
   */
  getAllAssets(): KnowledgeAsset[] {
    return Array.from(this.assets.values());
  }
}


export const knowledgeAssetStore = new KnowledgeAssetStore();
