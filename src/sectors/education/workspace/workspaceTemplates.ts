import type { WorkspaceTemplate } from '../../../types/workspace.ts';

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'tpl-lecture-notes',
    name: 'Lecture Notes',
    description: 'Structured Cornell-style layout with key concepts, lecture takeaways, and questions.',
    icon: '📝',
    category: 'Study',
    type: 'notes',
    defaultTitle: 'Lecture Notes: [Topic Name]',
    sampleTags: ['Lecture', 'Notes', 'Review'],
    blocks: [
      {
        id: 'tpl-b1',
        type: 'callout',
        content: 'Topic Overview: Summarize the core thesis and lecture objectives in 2 sentences.',
        properties: { calloutType: 'info', calloutIcon: '💡' }
      },
      {
        id: 'tpl-b2',
        type: 'heading_1',
        content: '1. Key Definitions & Core Principles'
      },
      {
        id: 'tpl-b3',
        type: 'bullet_list',
        content: 'Primary concept / theorem definition'
      },
      {
        id: 'tpl-b4',
        type: 'bullet_list',
        content: 'Boundary conditions and fundamental assumptions'
      },
      {
        id: 'tpl-b5',
        type: 'heading_2',
        content: '2. Mathematical Formulation & Derivations'
      },
      {
        id: 'tpl-b6',
        type: 'math_block',
        content: '\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{A}'
      },
      {
        id: 'tpl-b7',
        type: 'heading_2',
        content: '3. Takeaways & Questions for Next Session'
      },
      {
        id: 'tpl-b8',
        type: 'checklist',
        content: 'Derive example problem #3 independently',
        properties: { checked: false }
      },
      {
        id: 'tpl-b9',
        type: 'checklist',
        content: 'Review prerequisite unit notes before next quiz',
        properties: { checked: false }
      }
    ]
  },
  {
    id: 'tpl-chapter-revision',
    name: 'Chapter Revision',
    description: 'Comprehensive chapter breakdown with concept checklists and mastery test.',
    icon: '📚',
    category: 'Study',
    type: 'study_sheet',
    defaultTitle: 'Chapter Revision: [Unit & Chapter Title]',
    sampleTags: ['Revision', 'Exam Prep', 'Chapter'],
    blocks: [
      {
        id: 'tpl-cr1',
        type: 'heading_1',
        content: 'Chapter Objectives & Mastery Roadmap'
      },
      {
        id: 'tpl-cr2',
        type: 'callout',
        content: 'Goal: Consolidate all critical mechanics, formulas, and edge cases for this chapter.',
        properties: { calloutType: 'formula', calloutIcon: '🎯' }
      },
      {
        id: 'tpl-cr3',
        type: 'heading_2',
        content: 'Essential Concepts Checklist'
      },
      {
        id: 'tpl-cr4',
        type: 'checklist',
        content: 'Understand core physical / theoretical intuitions',
        properties: { checked: false }
      },
      {
        id: 'tpl-cr5',
        type: 'checklist',
        content: 'Memorize primary governing equations & constant units',
        properties: { checked: false }
      },
      {
        id: 'tpl-cr6',
        type: 'checklist',
        content: 'Solve past-year exam challenge problems',
        properties: { checked: false }
      },
      {
        id: 'tpl-cr7',
        type: 'heading_2',
        content: 'Critical Formulas & Limits'
      },
      {
        id: 'tpl-cr8',
        type: 'math_block',
        content: '\\hat{H} |\\psi\\rangle = E |\\psi\\rangle'
      },
      {
        id: 'tpl-cr9',
        type: 'divider',
        content: ''
      },
      {
        id: 'tpl-cr10',
        type: 'quote',
        content: 'Notice the asymptotic behavior as t approaches infinity.'
      }
    ]
  },
  {
    id: 'tpl-daily-study-plan',
    name: 'Daily Study Plan',
    description: 'Deep focus time blocks, task prioritization, and end-of-day reflection.',
    icon: '⚡',
    category: 'Planning',
    type: 'doc',
    defaultTitle: 'Daily Study Plan: [Date]',
    sampleTags: ['Daily', 'Productivity', 'Focus'],
    blocks: [
      {
        id: 'tpl-dp1',
        type: 'callout',
        content: 'Target Study Hours: 4.5 Hours | Focus Mode: Deep Work',
        properties: { calloutType: 'tip', calloutIcon: '🔥' }
      },
      {
        id: 'tpl-dp2',
        type: 'heading_1',
        content: 'High-Impact Priorities'
      },
      {
        id: 'tpl-dp3',
        type: 'checklist',
        content: 'Morning: Complete PHYS-301 Electromagnetism problem set 4',
        properties: { checked: false }
      },
      {
        id: 'tpl-dp4',
        type: 'checklist',
        content: 'Afternoon: Review MATH-240 Surface Integrals & Stokes Theorem',
        properties: { checked: false }
      },
      {
        id: 'tpl-dp5',
        type: 'checklist',
        content: 'Evening: CS-350 Distributed Consensus paper reading',
        properties: { checked: false }
      },
      {
        id: 'tpl-dp6',
        type: 'heading_2',
        content: 'Block Notes & Breakthroughs'
      },
      {
        id: 'tpl-dp7',
        type: 'paragraph',
        content: 'Record quick insights or breakthroughs during focused study intervals here.'
      }
    ]
  },
  {
    id: 'tpl-formula-sheet',
    name: 'Formula Sheet',
    description: 'Crisp mathematical references, variable definitions, and unit tables.',
    icon: '∑',
    category: 'Engineering',
    type: 'formula',
    defaultTitle: 'Formula Cheat Sheet: [Domain]',
    sampleTags: ['Formula', 'Cheat Sheet', 'Quick Reference'],
    blocks: [
      {
        id: 'tpl-fs1',
        type: 'heading_1',
        content: 'Primary Governing Equations'
      },
      {
        id: 'tpl-fs2',
        type: 'math_block',
        content: '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}, \\quad \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}'
      },
      {
        id: 'tpl-fs3',
        type: 'heading_2',
        content: 'Variable Dictionary & Dimensions'
      },
      {
        id: 'tpl-fs4',
        type: 'table',
        content: '',
        properties: {
          tableData: {
            headers: ['Symbol', 'Physical Quantity', 'SI Unit', 'Typical Value'],
            rows: [
              ['E', 'Electric Field', 'V/m or N/C', 'Varies'],
              ['B', 'Magnetic Flux Density', 'Tesla (T)', '0.5 - 2.0 T (Lab)'],
              ['ε₀', 'Vacuum Permittivity', 'F/m', '8.854 × 10⁻¹²'],
              ['μ₀', 'Vacuum Permeability', 'N/A²', '4π × 10⁻⁷']
            ]
          }
        }
      }
    ]
  },
  {
    id: 'tpl-assignment-planner',
    name: 'Assignment Planner',
    description: 'Milestone tracker, rubric checklist, and draft workspace.',
    icon: '📋',
    category: 'Planning',
    type: 'doc',
    defaultTitle: 'Assignment Plan: [Assignment Name]',
    sampleTags: ['Assignment', 'Planner', 'Milestones'],
    blocks: [
      {
        id: 'tpl-ap1',
        type: 'callout',
        content: 'Due Date: Upcoming Friday @ 23:59 | Max Score: 100 pts | Weight: 15%',
        properties: { calloutType: 'warning', calloutIcon: '⚠️' }
      },
      {
        id: 'tpl-ap2',
        type: 'heading_1',
        content: 'Milestone Execution Schedule'
      },
      {
        id: 'tpl-ap3',
        type: 'checklist',
        content: 'Deconstruct prompt & map required derivations',
        properties: { checked: true }
      },
      {
        id: 'tpl-ap4',
        type: 'checklist',
        content: 'Write computational simulation script or numerical model',
        properties: { checked: false }
      },
      {
        id: 'tpl-ap5',
        type: 'checklist',
        content: 'Draft report sections & insert formatted vector plots',
        properties: { checked: false }
      },
      {
        id: 'tpl-ap6',
        type: 'checklist',
        content: 'Perform final proofread and upload PDF to Jarvis LMS',
        properties: { checked: false }
      }
    ]
  },
  {
    id: 'tpl-research-notes',
    name: 'Research Notes',
    description: 'Literature synthesis, hypothesis formulation, and empirical logs.',
    icon: '🔬',
    category: 'Research',
    type: 'notes',
    defaultTitle: 'Research Notes: [Paper / Experiment]',
    sampleTags: ['Research', 'Paper', 'Literature'],
    blocks: [
      {
        id: 'tpl-rn1',
        type: 'heading_1',
        content: 'Citation & Abstract Synthesis'
      },
      {
        id: 'tpl-rn2',
        type: 'quote',
        content: '"We demonstrate an exponential acceleration for solving differential equations using parameterized quantum circuits."'
      },
      {
        id: 'tpl-rn3',
        type: 'heading_2',
        content: 'Methodology & Novel Contributions'
      },
      {
        id: 'tpl-rn4',
        type: 'bullet_list',
        content: 'Introduces a hybrid variational ansatz with reduced barren plateaus.'
      },
      {
        id: 'tpl-rn5',
        type: 'bullet_list',
        content: 'Evaluated against classical finite element analysis benchmarks.'
      },
      {
        id: 'tpl-rn6',
        type: 'heading_2',
        content: 'Critical Assessment & Open Questions'
      },
      {
        id: 'tpl-rn7',
        type: 'paragraph',
        content: 'How does the circuit depth scale with non-linear boundary conditions? Requires further testing with the Jarvis Quantum simulator.'
      }
    ]
  }
];
