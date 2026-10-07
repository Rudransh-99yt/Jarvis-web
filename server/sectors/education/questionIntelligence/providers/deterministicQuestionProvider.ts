import type {
  IQuestionProvider,
  Question,
  QuestionQuery,
  QuestionSourceCategory
} from '../types.ts';

/**
 * DeterministicQuestionProvider
 * Provides structured, deterministic prerequisite diagnostic questions and curriculum benchmark items.
 * Uses 0 AI tokens, guaranteeing 100% mathematical accuracy and instantaneous response.
 */
export class DeterministicQuestionProvider implements IQuestionProvider {
  readonly id = 'deterministic-question-provider';
  readonly name = 'Deterministic Curriculum Question Provider';
  readonly sourceCategory: QuestionSourceCategory = 'JARVIS_GENERATED';

  private templateQuestions: Question[] = [
    // --- Prerequisite Diagnostics for Newton's Laws ---
    {
      id: 'det-prereq-mass-inertia-1',
      subject: 'Physics',
      concept: 'Mass and Inertia',
      prerequisiteConcepts: ['Scalar Quantities', 'Matter'],
      difficulty: 'beginner',
      questionType: 'conceptual',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Distinguish between inertial mass and gravitational weight.',
      masteryContribution: 0.10,
      estimatedTime: 40,
      prompt: 'Which physical quantity represents an intrinsic measure of a body’s resistance to acceleration, independent of local gravitational field strength?',
      options: [
        'Gravitational Weight (N)',
        'Inertial Mass (kg)',
        'Kinetic Energy (J)',
        'Terminal Velocity (m/s)'
      ],
      answer: 'Inertial Mass (kg)',
      explanation: 'Mass is an intrinsic property that quantifies inertia (resistance to acceleration), whereas weight is the variable gravitational force acting on that mass (W = m * g).',
      expectedReasoningLevel: 'conceptual',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 1.0,
        pedagogicalValue: 1.0,
        verifiedGrounded: true,
        rubricCriteria: ['prerequisite_diagnosis']
      }
    },
    {
      id: 'det-prereq-vectors-1',
      subject: 'Physics',
      concept: 'Vector Decomposition',
      prerequisiteConcepts: ['Trigonometry', 'Vectors'],
      difficulty: 'beginner',
      questionType: 'numerical',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Decompose a 2D force vector into orthogonal Cartesian components.',
      masteryContribution: 0.10,
      estimatedTime: 60,
      prompt: 'A tension force of T = 100 N is directed at an angle of 30° above the horizontal ground. What is the magnitude of the horizontal component T_x in Newtons? (Use cos(30°) = 0.866)',
      answer: 86.6,
      explanation: 'T_x = T * cos(θ) = 100 N * cos(30°) = 100 * 0.866 = 86.6 N.',
      hints: ['Adjacent component uses cosine: F_x = F * cos(θ).'],
      expectedReasoningLevel: 'application',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 0.99,
        pedagogicalValue: 0.95,
        verifiedGrounded: true,
        rubricCriteria: ['prerequisite_diagnosis']
      }
    },
    {
      id: 'det-prereq-frames-1',
      subject: 'Physics',
      concept: 'Inertial Reference Frames',
      prerequisiteConcepts: ['Relative Motion'],
      difficulty: 'intermediate',
      questionType: 'conceptual',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Identify conditions under which Newton’s Laws of motion hold valid without fictitious forces.',
      masteryContribution: 0.12,
      estimatedTime: 50,
      prompt: 'In which reference frame are Newton’s Laws of Motion directly valid without introducing fictitious (pseudo) forces?',
      options: [
        'A reference frame undergoing uniform linear acceleration',
        'A rotating centrifuge reference frame',
        'An inertial reference frame moving at constant velocity or at rest',
        'A free-falling elevator frame experiencing zero gravity'
      ],
      answer: 'An inertial reference frame moving at constant velocity or at rest',
      explanation: 'Newton’s Laws of Motion are defined exclusively in inertial reference frames where acceleration with respect to cosmic background is zero.',
      expectedReasoningLevel: 'conceptual',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 0.98,
        pedagogicalValue: 0.98,
        verifiedGrounded: true
      }
    },

    // --- Core Conceptual Questions for Newton's Laws ---
    {
      id: 'det-newton-two-body-1',
      subject: 'Physics',
      concept: "Newton's Laws",
      prerequisiteConcepts: ['Vector Decomposition', 'Free Body Diagrams'],
      difficulty: 'advanced',
      questionType: 'application',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Apply Newton’s second law to coupled two-body systems with Atwood or incline configurations.',
      masteryContribution: 0.20,
      estimatedTime: 120,
      prompt: 'Two blocks of masses m1 = 3 kg and m2 = 2 kg are connected by a light string over a frictionless pulley (Atwood machine). Taking g = 9.8 m/s², what is the acceleration magnitude of the system in m/s²?',
      answer: 1.96,
      explanation: 'a = (m1 - m2)/(m1 + m2) * g = (3 - 2)/(3 + 2) * 9.8 = (1 / 5) * 9.8 = 1.96 m/s².',
      hints: ['Set up net force on system: (m1 - m2)g = (m1 + m2)a.'],
      expectedReasoningLevel: 'application',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 0.98,
        pedagogicalValue: 0.99,
        verifiedGrounded: true
      }
    },
    {
      id: 'det-newton-challenge-1',
      subject: 'Physics',
      concept: "Newton's Laws",
      prerequisiteConcepts: ['Circular Motion', 'Newton’s Laws'],
      difficulty: 'challenge',
      questionType: 'reasoning',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Synthesize Newton’s Second Law with centripetal force constraints on banked curves.',
      masteryContribution: 0.25,
      estimatedTime: 150,
      prompt: 'A highway curve of radius R is banked at angle θ. What exact condition allows a car with speed v to negotiate the turn safely without relying on any lateral tire friction?',
      options: [
        'tan(θ) = v² / (R * g)',
        'sin(θ) = v * g / R',
        'cos(θ) = R * g / v²',
        'tan(θ) = m * v / (R * g)'
      ],
      answer: 'tan(θ) = v² / (R * g)',
      explanation: 'The horizontal component of normal force provides centripetal acceleration: N * sin(θ) = m*v²/R. The vertical component balances weight: N * cos(θ) = m*g. Dividing gives tan(θ) = v² / (R*g). Mass cancels.',
      hints: ['Break normal force N into horizontal (radial) and vertical components.'],
      expectedReasoningLevel: 'analysis',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 0.99,
        pedagogicalValue: 1.0,
        verifiedGrounded: true
      }
    },

    // --- Mathematics: Calculus / Derivatives ---
    {
      id: 'det-math-power-rule-1',
      subject: 'Mathematics',
      concept: 'Power Rule',
      prerequisiteConcepts: ['Polynomials', 'Exponents'],
      difficulty: 'beginner',
      questionType: 'numerical',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Apply the power rule d/dx (x^n) = n*x^(n-1).',
      masteryContribution: 0.10,
      estimatedTime: 45,
      prompt: 'What is the derivative d/dx (5x⁴) evaluated at x = 2?',
      answer: 160,
      explanation: 'd/dx (5x⁴) = 5 * 4 * x³ = 20 * x³. At x = 2: 20 * (2)³ = 20 * 8 = 160.',
      expectedReasoningLevel: 'application',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 1.0,
        pedagogicalValue: 0.95,
        verifiedGrounded: true
      }
    }
  ];

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getQuestions(query: QuestionQuery): Promise<Question[]> {
    let result = this.templateQuestions.filter((q) => {
      if (query.subject && q.subject.toLowerCase() !== query.subject.toLowerCase()) {
        return false;
      }
      if (query.concept && !q.concept.toLowerCase().includes(query.concept.toLowerCase())) {
        // Also check if any prerequisite match
        const matchesPrereq = query.prerequisites?.some((p) =>
          q.concept.toLowerCase().includes(p.toLowerCase()) ||
          q.prerequisiteConcepts.some((c) => c.toLowerCase().includes(p.toLowerCase()))
        );
        if (!matchesPrereq) {
          return false;
        }
      }
      if (query.difficulty && q.difficulty !== query.difficulty) {
        return false;
      }
      if (query.questionTypes && query.questionTypes.length > 0 && !query.questionTypes.includes(q.questionType)) {
        return false;
      }
      if (query.excludeIds && query.excludeIds.includes(q.id)) {
        return false;
      }
      return true;
    });

    if (query.limit && query.limit > 0) {
      result = result.slice(0, query.limit);
    }

    return result;
  }
}
