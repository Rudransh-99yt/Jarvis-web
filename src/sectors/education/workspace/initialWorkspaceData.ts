import type { WorkspacePage, WorkspaceDatabase } from '../../../types/workspace.ts';

export const INITIAL_WORKSPACE_PAGES: WorkspacePage[] = [
  // 1. Physics Subject Root
  {
    id: 'page-phys-root',
    title: 'Physics · PHYS-301 Advanced Electrodynamics',
    icon: '⚡',
    parentId: null,
    type: 'doc',
    ownerId: 'student-1',
    ownerName: 'Alex Mercer',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Physics', 'PHYS-301', 'Core Course'],
    academicLink: {
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301'
    },
    isFavorite: true,
    isDeleted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-03T09:15:00.000Z',
    blocks: [
      {
        id: 'blk-pr-1',
        type: 'callout',
        content: 'Primary Academic Link: Connected to PHYS-301 in Jarvis Education Hub. All child units and chapter derivations sync to this workspace.',
        properties: { calloutType: 'info', calloutIcon: '🌌' }
      },
      {
        id: 'blk-pr-2',
        type: 'heading_1',
        content: 'Course Overview & Syllabus Highlights'
      },
      {
        id: 'blk-pr-3',
        type: 'paragraph',
        content: 'Focuses on relativistic electrodynamics, Maxwell stress tensor, wave propagation through anisotropic media, and radiation reaction.'
      },
      {
        id: 'blk-pr-4',
        type: 'heading_2',
        content: 'Enrolled Units & Modules'
      },
      {
        id: 'blk-pr-5',
        type: 'bullet_list',
        content: 'Unit 1: Maxwell Equations & Gauge Transformations'
      },
      {
        id: 'blk-pr-6',
        type: 'bullet_list',
        content: 'Unit 2: Relativistic Potentials & Radiation'
      }
    ]
  },

  // 1.1 Nested Unit 1 Page
  {
    id: 'page-phys-unit1',
    title: 'Unit 1 · Maxwell Equations & Gauge Transformations',
    icon: '🧲',
    parentId: 'page-phys-root',
    type: 'doc',
    ownerId: 'student-1',
    ownerName: 'Alex Mercer',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Electrodynamics', 'Unit 1'],
    academicLink: {
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301',
      unitId: 'unit-em-maxwell',
      unitTitle: 'Electromagnetic Potentials'
    },
    isDeleted: false,
    createdAt: '2026-10-01T09:30:00.000Z',
    updatedAt: '2026-10-03T09:30:00.000Z',
    blocks: [
      {
        id: 'blk-pu1-1',
        type: 'heading_1',
        content: 'Unit 1 Mastery Focus'
      },
      {
        id: 'blk-pu1-2',
        type: 'callout',
        content: 'Key exam topic: Invariance of Maxwell equations under Lorenz and Coulomb gauges.',
        properties: { calloutType: 'formula', calloutIcon: '⚡' }
      },
      {
        id: 'blk-pu1-3',
        type: 'paragraph',
        content: 'See child notes below for step-by-step vector calculus derivations and Faraday induction proofs.'
      }
    ]
  },

  // 1.1.1 Nested Chapter Note (Faraday's Law)
  {
    id: 'page-phys-faraday',
    title: "Faraday's Law & Gauge Invariance Derivation",
    icon: '📄',
    parentId: 'page-phys-unit1',
    type: 'notes',
    ownerId: 'student-1',
    ownerName: 'Alex Mercer',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Derivation', 'Faraday', 'Gauge'],
    academicLink: {
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301',
      unitId: 'unit-em-maxwell',
      lessonId: 'les-em-1',
      lessonTitle: "Faraday's Induction Law & Maxwell Equation"
    },
    isFavorite: true,
    isDeleted: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-03T10:15:00.000Z',
    blocks: [
      {
        id: 'blk-fd-1',
        type: 'callout',
        content: 'Connected to Lesson: Faraday\'s Induction Law & Maxwell Equation. Click academic badge to review original lecture video.',
        properties: { calloutType: 'info', calloutIcon: '🎓' }
      },
      {
        id: 'blk-fd-2',
        type: 'heading_1',
        content: '1. Differential & Integral Forms'
      },
      {
        id: 'blk-fd-3',
        type: 'paragraph',
        content: 'The differential form of Faraday-Lenz law states that the curl of the electric field equals the negative time rate of change of the magnetic flux density.'
      },
      {
        id: 'blk-fd-4',
        type: 'math_block',
        content: '\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}'
      },
      {
        id: 'blk-fd-5',
        type: 'heading_2',
        content: '2. Lorenz Gauge Condition'
      },
      {
        id: 'blk-fd-6',
        type: 'math_block',
        content: '\\nabla \\cdot \\mathbf{A} + \\frac{1}{c^2} \\frac{\\partial \\phi}{\\partial t} = 0'
      },
      {
        id: 'blk-fd-7',
        type: 'heading_2',
        content: '3. Derivation Summary Table'
      },
      {
        id: 'blk-fd-8',
        type: 'table',
        content: '',
        properties: {
          tableData: {
            headers: ['Gauge Choice', 'Potential Constraint', 'Inhomogeneous Wave Eq'],
            rows: [
              ['Lorenz', '∇ · A + (1/c²) ∂φ/∂t = 0', '□ A^μ = μ₀ J^μ (Decoupled)'],
              ['Coulomb', '∇ · A = 0', '∇²φ = -ρ/ε₀ (Instantaneous electrostatic)']
            ]
          }
        }
      },
      {
        id: 'blk-fd-9',
        type: 'heading_2',
        content: '4. Next Steps & Study Checklist'
      },
      {
        id: 'blk-fd-10',
        type: 'checklist',
        content: 'Verify boundary condition on superconducting interface',
        properties: { checked: true }
      },
      {
        id: 'blk-fd-11',
        type: 'checklist',
        content: 'Submit Assignment 3 problem 4 before Friday',
        properties: { checked: false }
      }
    ]
  },

  // 2. Mathematics Subject Root
  {
    id: 'page-math-root',
    title: 'Mathematics · MATH-240 Multivariable Calculus',
    icon: '📐',
    parentId: null,
    type: 'doc',
    ownerId: 'student-1',
    ownerName: 'Alex Mercer',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Math', 'MATH-240', 'Vector Calculus'],
    academicLink: {
      courseId: 'class-math-240',
      courseCode: 'MATH-240'
    },
    isFavorite: false,
    isDeleted: false,
    createdAt: '2026-10-02T11:00:00.000Z',
    updatedAt: '2026-10-03T08:30:00.000Z',
    blocks: [
      {
        id: 'blk-mr-1',
        type: 'heading_1',
        content: 'Multivariable Calculus & Differential Geometry'
      },
      {
        id: 'blk-mr-2',
        type: 'paragraph',
        content: 'Covers differential forms, exterior derivatives, Stokes theorem on smooth manifolds, and boundary flux calculations.'
      }
    ]
  },

  // 2.1 Nested Stokes Theorem Note
  {
    id: 'page-math-stokes',
    title: 'Generalized Stokes Theorem & Differential Forms',
    icon: '📄',
    parentId: 'page-math-root',
    type: 'study_sheet',
    ownerId: 'student-1',
    ownerName: 'Alex Mercer',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Calculus', 'Differential Forms', 'Theorems'],
    academicLink: {
      courseId: 'class-math-240',
      courseCode: 'MATH-240',
      lessonId: 'les-math-1',
      lessonTitle: 'Differential Forms & Stokes Theorem'
    },
    isFavorite: true,
    isDeleted: false,
    createdAt: '2026-10-02T12:00:00.000Z',
    updatedAt: '2026-10-03T09:40:00.000Z',
    blocks: [
      {
        id: 'blk-st-1',
        type: 'callout',
        content: 'Universal formulation generalizing Fundamental Theorem of Calculus, Green\'s Theorem, and Divergence Theorem.',
        properties: { calloutType: 'tip', calloutIcon: '💡' }
      },
      {
        id: 'blk-st-2',
        type: 'heading_1',
        content: 'The Master Equation'
      },
      {
        id: 'blk-st-3',
        type: 'math_block',
        content: '\\int_{\\partial \\Omega} \\omega = \\int_{\\Omega} d\\omega'
      },
      {
        id: 'blk-st-4',
        type: 'heading_2',
        content: 'Specialized 1D, 2D, and 3D Manifestations'
      },
      {
        id: 'blk-st-5',
        type: 'bullet_list',
        content: '1D (FTC): ∫_{a}^{b} f\'(x) dx = f(b) - f(a)'
      },
      {
        id: 'blk-st-6',
        type: 'bullet_list',
        content: '2D (Green\'s Theorem): ∮_{C} (L dx + M dy) = ∬_{D} (∂M/∂x - ∂L/∂y) dA'
      },
      {
        id: 'blk-st-7',
        type: 'bullet_list',
        content: '3D (Gauss Divergence): ∯_{∂V} F · n dS = ∭_{V} (∇ · F) dV'
      }
    ]
  },

  // 3. Personal Productivity Hub
  {
    id: 'page-personal-plan',
    title: 'Daily Study Sprint & Milestones',
    icon: '🎯',
    parentId: null,
    type: 'doc',
    ownerId: 'student-1',
    ownerName: 'Alex Mercer',
    ownerRole: 'student',
    visibility: 'personal',
    tags: ['Productivity', 'Daily Plan'],
    isFavorite: true,
    isDeleted: false,
    createdAt: '2026-10-03T07:00:00.000Z',
    updatedAt: '2026-10-03T10:30:00.000Z',
    blocks: [
      {
        id: 'blk-pp-1',
        type: 'callout',
        content: 'October Study Sprint: Targeting 100% mastery across PHYS-301, MATH-240, and CS-350.',
        properties: { calloutType: 'tip', calloutIcon: '🚀' }
      },
      {
        id: 'blk-pp-2',
        type: 'heading_1',
        content: "Today's Active Focus Blocks"
      },
      {
        id: 'blk-pp-3',
        type: 'checklist',
        content: '09:00 - 10:30: Complete Faraday\'s Law practice derivations',
        properties: { checked: true }
      },
      {
        id: 'blk-pp-4',
        type: 'checklist',
        content: '11:00 - 12:30: Differential forms problem set review',
        properties: { checked: true }
      },
      {
        id: 'blk-pp-5',
        type: 'checklist',
        content: '14:00 - 16:00: Smart Classroom lecture replay & personal note indexing',
        properties: { checked: false }
      }
    ]
  }
];

export const INITIAL_WORKSPACE_DATABASES: WorkspaceDatabase[] = [
  {
    id: 'db-study-tracker',
    title: 'Study Mastery Tracker',
    icon: '📊',
    description: 'Track mastery progress, exam deadlines, and study priorities across enrolled courses.',
    defaultView: 'table',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-03T09:00:00.000Z',
    properties: [
      { id: 'prop-topic', name: 'Topic / Chapter', type: 'title' },
      {
        id: 'prop-subject',
        name: 'Subject',
        type: 'select',
        options: [
          { id: 'opt-phys', label: 'PHYS-301 Physics', color: 'cyan' },
          { id: 'opt-math', label: 'MATH-240 Calculus', color: 'emerald' },
          { id: 'opt-cs', label: 'CS-350 Systems', color: 'purple' }
        ]
      },
      {
        id: 'prop-status',
        name: 'Status',
        type: 'status',
        options: [
          { id: 'opt-done', label: 'Mastered', color: 'emerald' },
          { id: 'opt-prog', label: 'In Progress', color: 'amber' },
          { id: 'opt-todo', label: 'Not Started', color: 'slate' }
        ]
      },
      { id: 'prop-date', name: 'Exam / Due Date', type: 'date' },
      {
        id: 'prop-priority',
        name: 'Priority',
        type: 'select',
        options: [
          { id: 'opt-high', label: 'High Priority', color: 'rose' },
          { id: 'opt-med', label: 'Medium', color: 'amber' },
          { id: 'opt-low', label: 'Low', color: 'slate' }
        ]
      }
    ],
    items: [
      {
        id: 'item-1',
        databaseId: 'db-study-tracker',
        pageId: 'page-phys-faraday',
        properties: {
          'prop-topic': 'Faraday Induction & Gauge Invariance',
          'prop-subject': 'opt-phys',
          'prop-status': 'opt-done',
          'prop-date': '2026-10-20',
          'prop-priority': 'opt-high'
        },
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-03T08:00:00.000Z'
      },
      {
        id: 'item-2',
        databaseId: 'db-study-tracker',
        pageId: 'page-math-stokes',
        properties: {
          'prop-topic': 'Differential Forms & Stokes Theorem',
          'prop-subject': 'opt-math',
          'prop-status': 'opt-prog',
          'prop-date': '2026-10-24',
          'prop-priority': 'opt-high'
        },
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-03T08:00:00.000Z'
      },
      {
        id: 'item-3',
        databaseId: 'db-study-tracker',
        properties: {
          'prop-topic': 'Raft Consensus Protocol & Log Replication',
          'prop-subject': 'opt-cs',
          'prop-status': 'opt-prog',
          'prop-date': '2026-10-28',
          'prop-priority': 'opt-med'
        },
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-03T08:00:00.000Z'
      },
      {
        id: 'item-4',
        databaseId: 'db-study-tracker',
        properties: {
          'prop-topic': 'Harmonic Oscillators & Ladder Operators',
          'prop-subject': 'opt-phys',
          'prop-status': 'opt-todo',
          'prop-date': '2026-11-04',
          'prop-priority': 'opt-med'
        },
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-03T08:00:00.000Z'
      }
    ]
  }
];
