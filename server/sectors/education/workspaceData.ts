import { requirePrincipal } from '../../auth/principal.ts';
// Seeded Workspace Templates, Initial Nested Pages & Database Collections for My Workspace
import type {
  WorkspacePage,
  WorkspaceTemplate,
  WorkspaceDatabase,
  PageBlock
} from '../../../src/types/workspace.ts';

export const DEFAULT_WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'tmpl-lecture-notes',
    name: 'Lecture Notes',
    description: 'Structured layout with summary, theoretical principles, equations, and action items.',
    icon: '📚',
    category: 'Study',
    type: 'notes',
    defaultTitle: 'Lecture Notes: [Topic Title]',
    sampleTags: ['Lecture', 'Theory', 'In-Class'],
    blocks: [
      {
        id: 'blk-ln-1',
        type: 'callout',
        content: 'Record lecture metadata, instructor key points, and immediate review questions.',
        properties: { calloutType: 'info', calloutIcon: '💡' }
      },
      {
        id: 'blk-ln-2',
        type: 'heading_2',
        content: '1. Executive Summary & Overview'
      },
      {
        id: 'blk-ln-3',
        type: 'paragraph',
        content: 'Enter the main conceptual foundation and central thesis of today’s lecture...'
      },
      {
        id: 'blk-ln-4',
        type: 'heading_2',
        content: '2. Core Principles & Theoretical Derivation'
      },
      {
        id: 'blk-ln-5',
        type: 'bullet_list',
        content: 'Primary Postulate: State the foundational assumption clearly.'
      },
      {
        id: 'blk-ln-6',
        type: 'bullet_list',
        content: 'Mathematical Formulation: Relate variables and define boundary conditions.'
      },
      {
        id: 'blk-ln-7',
        type: 'math_block',
        content: '\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = - \\frac{\\partial}{\\partial t} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}'
      },
      {
        id: 'blk-ln-8',
        type: 'heading_2',
        content: '3. Key Concept Review Checklist'
      },
      {
        id: 'blk-ln-9',
        type: 'checklist',
        content: 'Review operator commutation algebra',
        properties: { checked: false }
      },
      {
        id: 'blk-ln-10',
        type: 'checklist',
        content: 'Solve practice problem set 2.4',
        properties: { checked: false }
      }
    ]
  },
  {
    id: 'tmpl-chapter-revision',
    name: 'Chapter Revision Guide',
    description: 'High-yield exam revision framework with formulas, common traps, and practice checks.',
    icon: '⚡',
    category: 'Study',
    type: 'study_sheet',
    defaultTitle: 'Chapter Revision: [Unit Title]',
    sampleTags: ['Revision', 'Exam Prep', 'High-Yield'],
    blocks: [
      {
        id: 'blk-cr-1',
        type: 'heading_1',
        content: 'Unit Revision Guide & Mastery Checklist'
      },
      {
        id: 'blk-cr-2',
        type: 'callout',
        content: 'Focus on core definitions, boundary condition limits, and common exam pitfalls.',
        properties: { calloutType: 'tip', calloutIcon: '🎯' }
      },
      {
        id: 'blk-cr-3',
        type: 'heading_2',
        content: 'High-Yield Concepts'
      },
      {
        id: 'blk-cr-4',
        type: 'numbered_list',
        content: 'State laws in differential and integral forms.'
      },
      {
        id: 'blk-cr-5',
        type: 'numbered_list',
        content: 'Identify symmetric coordinates and conserved quantities.'
      },
      {
        id: 'blk-cr-6',
        type: 'heading_2',
        content: 'Formula Reference Matrix'
      },
      {
        id: 'blk-cr-7',
        type: 'table',
        content: 'Formula Table',
        properties: {
          tableData: {
            headers: ['Law / Concept', 'Mathematical Form', 'Application Domain'],
            rows: [
              ['Faraday Induction', 'EMF = - d(Phi_B) / dt', 'Time-varying magnetic flux'],
              ['Lenz Law', 'Induced current opposes flux change', 'Directional sign determination'],
              ['Ladder Operator Energy', 'E_n = hbar * omega * (n + 1/2)', 'Quantum Harmonic Oscillator']
            ]
          }
        }
      }
    ]
  },
  {
    id: 'tmpl-daily-study',
    name: 'Daily Study Plan',
    description: 'Pomodoro-driven daily schedule, subject goals, and retrospective notes.',
    icon: '🗓️',
    category: 'Planning',
    type: 'doc',
    defaultTitle: 'Daily Study Plan: [Date]',
    sampleTags: ['Planning', 'Daily', 'Focus'],
    blocks: [
      {
        id: 'blk-ds-1',
        type: 'heading_2',
        content: 'Today’s Top 3 Academic Goals'
      },
      {
        id: 'blk-ds-2',
        type: 'checklist',
        content: 'Complete PHYS-301 Unit 2 Ladder Operator practice questions',
        properties: { checked: true }
      },
      {
        id: 'blk-ds-3',
        type: 'checklist',
        content: 'Write MATH-240 Stokes Theorem proofs for 2-forms',
        properties: { checked: false }
      },
      {
        id: 'blk-ds-4',
        type: 'checklist',
        content: 'Attend CS-101 Distributed Algorithms seminar at 03:00 PM',
        properties: { checked: false }
      },
      {
        id: 'blk-ds-5',
        type: 'heading_2',
        content: 'Scheduled Focus Blocks'
      },
      {
        id: 'blk-ds-6',
        type: 'bullet_list',
        content: 'Block 1 (09:00 - 10:30 AM): Quantum Harmonic Oscillators'
      },
      {
        id: 'blk-ds-7',
        type: 'bullet_list',
        content: 'Block 2 (02:00 - 03:30 PM): Differential Forms & Integrals'
      }
    ]
  },
  {
    id: 'tmpl-formula-sheet',
    name: 'Formula & Derivations Sheet',
    description: 'LaTeX mathematical derivations, definitions of variables, and limits.',
    icon: '📐',
    category: 'Engineering',
    type: 'formula',
    defaultTitle: 'Formula Sheet: [Subject/Topic]',
    sampleTags: ['Formulas', 'Math', 'CheatSheet'],
    blocks: [
      {
        id: 'blk-fs-1',
        type: 'heading_1',
        content: 'Mathematical Formulations & Derivations'
      },
      {
        id: 'blk-fs-2',
        type: 'callout',
        content: 'Commutation relations & ladder algebraic identities.',
        properties: { calloutType: 'formula', calloutIcon: '∑' }
      },
      {
        id: 'blk-fs-3',
        type: 'math_block',
        content: '[a, a^\\dagger] = a a^\\dagger - a^\\dagger a = 1'
      },
      {
        id: 'blk-fs-4',
        type: 'paragraph',
        content: 'The dimensionless creation and annihilation operators allow diagonalizing the Hamiltonian without solving spatial differential equations directly.'
      },
      {
        id: 'blk-fs-5',
        type: 'math_block',
        content: '\\hat{H} = \\hbar \\omega \\left( a^\\dagger a + \\frac{1}{2} \\right)'
      }
    ]
  }
];

export const INITIAL_WORKSPACE_PAGES: WorkspacePage[] = [
  // 1. Physics (Parent)
  {
    id: 'page-phys-root',
    title: 'Advanced Quantum & Electrodynamics',
    icon: '⚛️',
    parentId: null,
    type: 'doc',
    ownerId: 'student-1',
    ownerName: 'Alex Chen',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Physics', 'Senior Course', 'PHYS-301'],
    academicLink: {
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301',
      unitId: 'unit-phys-2',
      unitTitle: 'Unit 2: Quantum Harmonic Oscillators'
    },
    blocks: [
      {
        id: 'blk-p1',
        type: 'heading_1',
        content: 'PHYS-301: Advanced Quantum & Electrodynamics'
      },
      {
        id: 'blk-p2',
        type: 'callout',
        content: 'Master study hub containing lecture notes, mathematical proofs, and assignment solutions for PHYS-301.',
        properties: { calloutType: 'info', calloutIcon: '🌌' }
      },
      {
        id: 'blk-p3',
        type: 'embedded_resource',
        content: 'PHYS-301 Course Syllabus & Smart Classroom',
        properties: {
          academicLink: {
            type: 'course',
            targetId: 'class-phys-301',
            title: 'PHYS-301: Advanced Quantum & Electrodynamics',
            subtitle: 'Instructor: Dr. Sarah · Room: Quantum Hall 4B'
          }
        }
      },
      {
        id: 'blk-p4',
        type: 'heading_2',
        content: 'Sub-topics & Nested Chapters'
      },
      {
        id: 'blk-p5',
        type: 'bullet_list',
        content: 'Electromagnetism & Maxwell Fields'
      },
      {
        id: 'blk-p6',
        type: 'bullet_list',
        content: 'Quantum Harmonic Oscillators & Ladder Operator Algebra'
      }
    ],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-03T09:00:00.000Z'
  },
  // 1a. Child: Electromagnetism
  {
    id: 'page-phys-em',
    title: 'Electromagnetism & Maxwell Fields',
    icon: '🧲',
    parentId: 'page-phys-root',
    type: 'notes',
    ownerId: 'student-1',
    ownerName: 'Alex Chen',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Electrodynamics', 'Fields', 'Maxwell'],
    academicLink: {
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301'
    },
    blocks: [
      {
        id: 'blk-em-1',
        type: 'heading_1',
        content: 'Electromagnetism & Gauge Fields'
      },
      {
        id: 'blk-em-2',
        type: 'paragraph',
        content: 'Study notes on electromagnetic potential formulation, Lorenz gauge condition, and relativistic 4-potential covariant electrodynamics.'
      },
      {
        id: 'blk-em-3',
        type: 'math_block',
        content: '\\partial_\\mu F^{\\mu\\nu} = \\mu_0 J^\\nu, \\quad F^{\\mu\\nu} = \\partial^\\mu A^\\nu - \\partial^\\nu A^\\mu'
      }
    ],
    createdAt: '2026-10-01T08:30:00.000Z',
    updatedAt: '2026-10-02T11:00:00.000Z'
  },
  // 1a-i. Nested Child: Faraday's Law & Induction
  {
    id: 'page-phys-faraday',
    title: 'Chapter 4: Faraday’s Law & Induction Proofs',
    icon: '⚡',
    parentId: 'page-phys-em',
    type: 'study_sheet',
    ownerId: 'student-1',
    ownerName: 'Alex Chen',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Faraday', 'Induction', 'Proofs'],
    academicLink: {
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301',
      lessonId: 'les-phys-202',
      lessonTitle: 'Creation & Annihilation Operator Algebra'
    },
    blocks: [
      {
        id: 'blk-fd-1',
        type: 'heading_1',
        content: 'Faraday’s Law of Electromagnetic Induction'
      },
      {
        id: 'blk-fd-2',
        type: 'callout',
        content: 'Core Principle: The induced electromotive force in any closed circuit is equal to the negative time rate of change of magnetic flux through the circuit.',
        properties: { calloutType: 'tip', calloutIcon: '⚡' }
      },
      {
        id: 'blk-fd-3',
        type: 'heading_2',
        content: 'Integral vs Differential Form'
      },
      {
        id: 'blk-fd-4',
        type: 'math_block',
        content: '\\mathcal{E} = \\oint_C \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = - \\frac{d\\Phi_B}{dt} = - \\frac{d}{dt} \\iint_S \\mathbf{B} \\cdot d\\mathbf{A}'
      },
      {
        id: 'blk-fd-5',
        type: 'paragraph',
        content: 'Using Stokes’ theorem on the left side, we obtain the localized Maxwell-Faraday equation:'
      },
      {
        id: 'blk-fd-6',
        type: 'math_block',
        content: '\\nabla \\times \\mathbf{E} = - \\frac{\\partial \\mathbf{B}}{\\partial t}'
      },
      {
        id: 'blk-fd-7',
        type: 'heading_2',
        content: 'Derivation Steps'
      },
      {
        id: 'blk-fd-8',
        type: 'numbered_list',
        content: 'Define the magnetic flux integral over surface S bounded by contour C.'
      },
      {
        id: 'blk-fd-9',
        type: 'numbered_list',
        content: 'Apply Leibniz integral rule when boundary C moves with velocity v.'
      },
      {
        id: 'blk-fd-10',
        type: 'numbered_list',
        content: 'Incorporate motional EMF term: v x B.'
      }
    ],
    createdAt: '2026-10-02T09:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z'
  },
  // 1b. Quantum Harmonic Oscillators
  {
    id: 'page-phys-qho',
    title: 'Quantum Harmonic Oscillator Operator Algebra',
    icon: '🪜',
    parentId: 'page-phys-root',
    type: 'formula',
    ownerId: 'student-1',
    ownerName: 'Alex Chen',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Quantum', 'Harmonic Oscillator', 'Algebra'],
    academicLink: {
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301',
      unitId: 'unit-phys-2',
      unitTitle: 'Unit 2: Quantum Harmonic Oscillators',
      lessonId: 'les-phys-202',
      lessonTitle: 'Creation & Annihilation Operator Algebra'
    },
    blocks: [
      {
        id: 'blk-qho-1',
        type: 'heading_1',
        content: 'Ladder Operator Spectrum & Commutation Algebra'
      },
      {
        id: 'blk-qho-2',
        type: 'callout',
        content: 'Commutation relation [a, a†] = 1 guarantees discrete energy ladder with ground state non-zero energy.',
        properties: { calloutType: 'formula', calloutIcon: '∑' }
      },
      {
        id: 'blk-qho-3',
        type: 'math_block',
        content: 'a = \\sqrt{\\frac{m\\omega}{2\\hbar}} \\left( x + \\frac{i p}{m\\omega} \\right), \\quad a^\\dagger = \\sqrt{\\frac{m\\omega}{2\\hbar}} \\left( x - \\frac{i p}{m\\omega} \\right)'
      },
      {
        id: 'blk-qho-4',
        type: 'heading_2',
        content: 'Spectrum Table'
      },
      {
        id: 'blk-qho-5',
        type: 'table',
        content: 'Energy Spectrum',
        properties: {
          tableData: {
            headers: ['Quantum State |n>', 'Number Operator N = a† a', 'Energy Eigenvalue E_n'],
            rows: [
              ['|0> Ground State', '0', '(1/2) hbar omega'],
              ['|1> First Excited', '1', '(3/2) hbar omega'],
              ['|2> Second Excited', '2', '(5/2) hbar omega'],
              ['|n> Generic State', 'n', '(n + 1/2) hbar omega']
            ]
          }
        }
      }
    ],
    createdAt: '2026-10-02T14:00:00.000Z',
    updatedAt: '2026-10-03T10:15:00.000Z'
  },
  // 2. Mathematics (Parent)
  {
    id: 'page-math-root',
    title: 'Multivariable Calculus & Differential Forms',
    icon: '📐',
    parentId: null,
    type: 'doc',
    ownerId: 'student-1',
    ownerName: 'Alex Chen',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Mathematics', 'Calculus', 'MATH-240'],
    academicLink: {
      courseId: 'class-math-240',
      courseCode: 'MATH-240'
    },
    blocks: [
      {
        id: 'blk-m1',
        type: 'heading_1',
        content: 'MATH-240: Multivariable Calculus & Differential Forms'
      },
      {
        id: 'blk-m2',
        type: 'callout',
        content: 'Generalized Stokes Theorem: \\int_{\\partial M} \\omega = \\int_M d\\omega unifies 1D, 2D, and 3D vector calculus theorems.',
        properties: { calloutType: 'formula', calloutIcon: '∫' }
      },
      {
        id: 'blk-m3',
        type: 'paragraph',
        content: 'Differential k-forms allow coordinate-free integration over smooth manifolds with boundary.'
      }
    ],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-02T16:00:00.000Z'
  },
  // 3. Computer Science (Parent)
  {
    id: 'page-cs-root',
    title: 'Distributed Systems & Consensus Algorithms',
    icon: '💻',
    parentId: null,
    type: 'doc',
    ownerId: 'student-1',
    ownerName: 'Alex Chen',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['CS-101', 'Distributed Systems', 'Algorithms'],
    academicLink: {
      courseId: 'class-cs-101',
      courseCode: 'CS-101'
    },
    blocks: [
      {
        id: 'blk-cs1',
        type: 'heading_1',
        content: 'CS-101: Distributed Consensus & Raft Protocol'
      },
      {
        id: 'blk-cs2',
        type: 'paragraph',
        content: 'Implementation notes on leader election, log replication, and commit index safety invariants.'
      },
      {
        id: 'blk-cs3',
        type: 'code_block',
        content: `interface RaftMessage {
  term: number;
  leaderId: string;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: LogEntry[];
  leaderCommit: number;
}`,
        properties: { language: 'typescript' }
      }
    ],
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z'
  }
];

export const INITIAL_WORKSPACE_DATABASES: WorkspaceDatabase[] = [
  {
    id: 'db-study-tracker',
    title: 'Academic Study & Exam Tracker',
    icon: '📊',
    description: 'Track revision topics, mastery status, upcoming midterm dates, and priority levels.',
    defaultView: 'table',
    properties: [
      { id: 'prop-topic', name: 'Topic / Chapter', type: 'title' },
      {
        id: 'prop-subject',
        name: 'Course',
        type: 'select',
        options: [
          { id: 'opt-phys', label: 'PHYS-301 (Quantum)', color: 'cyan' },
          { id: 'opt-math', label: 'MATH-240 (Calculus)', color: 'blue' },
          { id: 'opt-cs', label: 'CS-101 (Distributed)', color: 'emerald' }
        ]
      },
      {
        id: 'prop-status',
        name: 'Status',
        type: 'status',
        options: [
          { id: 'opt-done', label: 'Mastered', color: 'emerald' },
          { id: 'opt-prog', label: 'In Progress', color: 'amber' },
          { id: 'opt-rev', label: 'Needs Review', color: 'red' }
        ]
      },
      { id: 'prop-date', name: 'Target Exam Date', type: 'date' },
      {
        id: 'prop-priority',
        name: 'Priority',
        type: 'select',
        options: [
          { id: 'opt-high', label: 'High Priority', color: 'red' },
          { id: 'opt-med', label: 'Medium', color: 'amber' },
          { id: 'opt-norm', label: 'Normal', color: 'slate' }
        ]
      }
    ],
    items: [
      {
        id: 'item-1',
        databaseId: 'db-study-tracker',
        pageId: 'page-phys-faraday',
        properties: {
          'prop-topic': 'Faraday Induction & Maxwell Differential Forms',
          'prop-subject': 'opt-phys',
          'prop-status': 'opt-done',
          'prop-date': '2026-10-24',
          'prop-priority': 'opt-high'
        },
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z'
      },
      {
        id: 'item-2',
        databaseId: 'db-study-tracker',
        pageId: 'page-phys-qho',
        properties: {
          'prop-topic': 'Quantum Harmonic Oscillator Ladder Algebra',
          'prop-subject': 'opt-phys',
          'prop-status': 'opt-prog',
          'prop-date': '2026-10-24',
          'prop-priority': 'opt-high'
        },
        createdAt: '2026-10-02T10:30:00.000Z',
        updatedAt: '2026-10-02T10:30:00.000Z'
      },
      {
        id: 'item-3',
        databaseId: 'db-study-tracker',
        pageId: 'page-math-root',
        properties: {
          'prop-topic': 'Stokes Theorem on Differential Forms',
          'prop-subject': 'opt-math',
          'prop-status': 'opt-prog',
          'prop-date': '2026-10-28',
          'prop-priority': 'opt-med'
        },
        createdAt: '2026-10-02T11:00:00.000Z',
        updatedAt: '2026-10-02T11:00:00.000Z'
      },
      {
        id: 'item-4',
        databaseId: 'db-study-tracker',
        pageId: 'page-cs-root',
        properties: {
          'prop-topic': 'Raft Consensus Safety Invariants',
          'prop-subject': 'opt-cs',
          'prop-status': 'opt-rev',
          'prop-date': '2026-11-04',
          'prop-priority': 'opt-med'
        },
        createdAt: '2026-10-02T11:30:00.000Z',
        updatedAt: '2026-10-02T11:30:00.000Z'
      }
    ],
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z'
  }
];
