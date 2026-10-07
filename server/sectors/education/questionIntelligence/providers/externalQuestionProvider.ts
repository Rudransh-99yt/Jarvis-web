import type {
  IQuestionProvider,
  Question,
  QuestionQuery,
  QuestionSourceCategory,
  ExternalQuestionQuery
} from '../types.ts';

/**
 * ExternalQuestionProvider
 * Delivers web-grounded and open educational repository questions (e.g. OpenStax, MIT OCW, NIST)
 * with strict attribution and transparent provenance.
 * Invariant: Never present web-derived information as user source material.
 */
export class ExternalQuestionProvider implements IQuestionProvider {
  readonly id = 'external-question-provider';
  readonly name = 'External Web & Open Educational Resource Provider';
  readonly sourceCategory: QuestionSourceCategory = 'WEB_RETRIEVED';

  private externalRepository: Question[] = [
    {
      id: 'ext-openstax-phys-5-1',
      subject: 'Physics',
      concept: "Newton's Laws",
      prerequisiteConcepts: ['Terminal Velocity', 'Fluid Drag'],
      difficulty: 'advanced',
      questionType: 'application',
      source: 'WEB_RETRIEVED',
      sourceReference: {
        type: 'web',
        title: 'OpenStax University Physics Vol 1 - Drag Force and Terminal Speed',
        section: 'Section 6.4: Drag Force and Terminal Speed',
        url: 'https://openstax.org/books/university-physics-volume-1/pages/6-4-drag-force-and-terminal-speed',
        snippet: 'At terminal speed v_t, the magnitude of the drag force equals the weight of the falling object: F_D = mg.',
        authorOrPublisher: 'OpenStax / Rice University (CC-BY 4.0)',
        verifiedGrounded: true
      },
      citation: 'OpenStax University Physics Vol 1, Ch 6.4 (CC-BY 4.0)',
      learningObjective: 'Apply Newton’s Second Law to an object falling in a viscous fluid at terminal velocity.',
      masteryContribution: 0.18,
      estimatedTime: 90,
      prompt: 'According to OpenStax University Physics Section 6.4, when a skydiver falls and reaches steady terminal speed v_t, what is the net vertical acceleration of the skydiver?',
      options: [
        '9.8 m/s² downwards',
        'Exactly 0.0 m/s²',
        'Dependent on air density but positive downwards',
        '-9.8 m/s² upwards'
      ],
      answer: 'Exactly 0.0 m/s²',
      distractors: [
        '9.8 m/s² downwards',
        'Dependent on air density but positive downwards',
        '-9.8 m/s² upwards'
      ],
      explanation: 'At terminal speed, the upward aerodynamic drag force exactly balances the downward gravitational force (F_net = F_D - mg = 0). By Newton’s Second Law F_net = m * a, the acceleration must be exactly zero.',
      hints: ['Terminal speed means velocity is constant.'],
      expectedReasoningLevel: 'application',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 0.99,
        pedagogicalValue: 0.97,
        verifiedGrounded: true,
        rubricCriteria: ['real_world_drag', 'openstax_grounded']
      }
    },
    {
      id: 'ext-mit-ocw-phys-orbital-1',
      subject: 'Physics',
      concept: "Newton's Laws",
      prerequisiteConcepts: ['Universal Gravitation', 'Centripetal Acceleration'],
      difficulty: 'challenge',
      questionType: 'reasoning',
      source: 'WEB_RETRIEVED',
      sourceReference: {
        type: 'web',
        title: 'MIT OpenCourseWare 8.01SC Classical Mechanics - Orbital Mechanics',
        section: 'Lecture 13: Planetary Motion and Gravitation',
        url: 'https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/',
        snippet: 'In circular orbit of radius r around mass M, G*M*m/r² = m*v²/r.',
        authorOrPublisher: 'MIT OpenCourseWare (CC-BY-NC-SA)',
        verifiedGrounded: true
      },
      citation: 'MIT OCW 8.01SC Classical Mechanics, Lecture 13',
      learningObjective: 'Derive orbital speed as a function of orbital radius using Newton’s Second Law and Law of Gravitation.',
      masteryContribution: 0.22,
      estimatedTime: 120,
      prompt: 'From MIT OCW 8.01SC Lecture 13: A satellite orbits Earth (mass M) in a stable circular path of radius r. What expression gives its orbital speed v?',
      options: [
        'v = sqrt(G * M / r)',
        'v = G * M / r²',
        'v = sqrt(2 * G * M / r)',
        'v = 2 * π * r / G'
      ],
      answer: 'v = sqrt(G * M / r)',
      distractors: [
        'v = G * M / r²',
        'v = sqrt(2 * G * M / r)',
        'v = 2 * π * r / G'
      ],
      explanation: 'Setting gravitational force equal to required centripetal force: G*M*m/r² = m*v²/r. Solving for v yields v = sqrt(G*M/r). Notice that sqrt(2GM/r) corresponds to escape velocity, not circular orbital speed.',
      hints: ['Equate gravitational force to mass times centripetal acceleration (v²/r).'],
      expectedReasoningLevel: 'analysis',
      qualityMetadata: {
        accuracyRating: 1.0,
        clarityScore: 1.0,
        pedagogicalValue: 1.0,
        verifiedGrounded: true
      }
    }
  ];

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getQuestions(query: QuestionQuery): Promise<Question[]> {
    let result = this.externalRepository.filter((q) => {
      if (query.subject && q.subject.toLowerCase() !== query.subject.toLowerCase()) return false;
      if (query.concept && !q.concept.toLowerCase().includes(query.concept.toLowerCase())) return false;
      if (query.difficulty && q.difficulty !== query.difficulty) return false;
      if (query.excludeIds && query.excludeIds.includes(q.id)) return false;
      return true;
    });

    if (query.limit && query.limit > 0) {
      result = result.slice(0, query.limit);
    }

    return result;
  }

  async queryExternalQuestions(extQuery: ExternalQuestionQuery): Promise<Question[]> {
    return this.getQuestions({
      subject: extQuery.subject,
      concept: extQuery.concept,
      difficulty: extQuery.difficulty,
      limit: extQuery.limit || 5
    });
  }
}
