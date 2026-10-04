// Structured Chemistry Visualization Foundation (D.10)
// Canonical molecule models, atom topology, bonds, and CPK standard colors.

import type {
  ChemistryParameters,
  MoleculeAtom,
  MoleculeBond
} from '../../../../src/types/visualization.ts';

export const CPK_COLORS: Record<string, string> = {
  H: '#f8fafc', // White / Off-white
  C: '#334155', // Charcoal / Black
  O: '#ef4444', // Red
  N: '#3b82f6', // Blue
  Cl: '#22c55e', // Green
  F: '#10b981', // Pale green
  Br: '#991b1b', // Dark red
  I: '#7c3aed', // Purple
  S: '#eab308', // Yellow
  P: '#f97316', // Orange
  Na: '#a855f7', // Purple/Violet
  Fe: '#ea580c', // Rust/Orange
  DEFAULT: '#94a3b8'
};

export class ChemistryEngine {
  /**
   * Retrieves or builds a canonical molecule model.
   */
  public static getMolecule(identifier: string): ChemistryParameters {
    const key = identifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    switch (key) {
      case 'h2o':
      case 'water':
        return this.buildWater();
      case 'co2':
      case 'carbondioxide':
        return this.buildCarbonDioxide();
      case 'ch4':
      case 'methane':
        return this.buildMethane();
      case 'nh3':
      case 'ammonia':
        return this.buildAmmonia();
      case 'c6h6':
      case 'benzene':
        return this.buildBenzene();
      default:
        return this.buildGenericMolecule(identifier);
    }
  }

  public static buildWater(): ChemistryParameters {
    const atoms: MoleculeAtom[] = [
      { id: 'O1', element: 'O', x: 200, y: 150, label: 'O', color: CPK_COLORS.O },
      { id: 'H1', element: 'H', x: 130, y: 220, label: 'H', color: CPK_COLORS.H },
      { id: 'H2', element: 'H', x: 270, y: 220, label: 'H', color: CPK_COLORS.H }
    ];

    const bonds: MoleculeBond[] = [
      { id: 'b1', atom1Id: 'O1', atom2Id: 'H1', order: 1, type: 'covalent' },
      { id: 'b2', atom1Id: 'O1', atom2Id: 'H2', order: 1, type: 'covalent' }
    ];

    return {
      moleculeName: 'Water',
      formula: 'H₂O',
      molecularWeight: 18.015,
      atoms,
      bonds,
      geometryDescription: 'Bent molecular geometry with bond angle ~104.5°'
    };
  }

  public static buildCarbonDioxide(): ChemistryParameters {
    const atoms: MoleculeAtom[] = [
      { id: 'C1', element: 'C', x: 200, y: 180, label: 'C', color: CPK_COLORS.C },
      { id: 'O1', element: 'O', x: 100, y: 180, label: 'O', color: CPK_COLORS.O },
      { id: 'O2', element: 'O', x: 300, y: 180, label: 'O', color: CPK_COLORS.O }
    ];

    const bonds: MoleculeBond[] = [
      { id: 'b1', atom1Id: 'O1', atom2Id: 'C1', order: 2, type: 'covalent' },
      { id: 'b2', atom1Id: 'C1', atom2Id: 'O2', order: 2, type: 'covalent' }
    ];

    return {
      moleculeName: 'Carbon Dioxide',
      formula: 'CO₂',
      molecularWeight: 44.01,
      atoms,
      bonds,
      geometryDescription: 'Linear molecular geometry with 180° bond angle and two double bonds'
    };
  }

  public static buildMethane(): ChemistryParameters {
    const atoms: MoleculeAtom[] = [
      { id: 'C1', element: 'C', x: 200, y: 180, label: 'C', color: CPK_COLORS.C },
      { id: 'H1', element: 'H', x: 200, y: 90, label: 'H', color: CPK_COLORS.H },
      { id: 'H2', element: 'H', x: 110, y: 220, label: 'H', color: CPK_COLORS.H },
      { id: 'H3', element: 'H', x: 200, y: 270, label: 'H', color: CPK_COLORS.H },
      { id: 'H4', element: 'H', x: 290, y: 220, label: 'H', color: CPK_COLORS.H }
    ];

    const bonds: MoleculeBond[] = [
      { id: 'b1', atom1Id: 'C1', atom2Id: 'H1', order: 1, type: 'covalent' },
      { id: 'b2', atom1Id: 'C1', atom2Id: 'H2', order: 1, type: 'covalent' },
      { id: 'b3', atom1Id: 'C1', atom2Id: 'H3', order: 1, type: 'covalent' },
      { id: 'b4', atom1Id: 'C1', atom2Id: 'H4', order: 1, type: 'covalent' }
    ];

    return {
      moleculeName: 'Methane',
      formula: 'CH₄',
      molecularWeight: 16.04,
      atoms,
      bonds,
      geometryDescription: 'Tetrahedral geometry with sp³ hybridization and 109.5° bond angles'
    };
  }

  public static buildAmmonia(): ChemistryParameters {
    const atoms: MoleculeAtom[] = [
      { id: 'N1', element: 'N', x: 200, y: 150, label: 'N', color: CPK_COLORS.N },
      { id: 'H1', element: 'H', x: 130, y: 220, label: 'H', color: CPK_COLORS.H },
      { id: 'H2', element: 'H', x: 200, y: 250, label: 'H', color: CPK_COLORS.H },
      { id: 'H3', element: 'H', x: 270, y: 220, label: 'H', color: CPK_COLORS.H }
    ];

    const bonds: MoleculeBond[] = [
      { id: 'b1', atom1Id: 'N1', atom2Id: 'H1', order: 1, type: 'covalent' },
      { id: 'b2', atom1Id: 'N1', atom2Id: 'H2', order: 1, type: 'covalent' },
      { id: 'b3', atom1Id: 'N1', atom2Id: 'H3', order: 1, type: 'covalent' }
    ];

    return {
      moleculeName: 'Ammonia',
      formula: 'NH₃',
      molecularWeight: 17.031,
      atoms,
      bonds,
      geometryDescription: 'Trigonal pyramidal geometry with lone pair causing ~107° bond angles'
    };
  }

  public static buildBenzene(): ChemistryParameters {
    const center = { x: 200, y: 180 };
    const radius = 60;
    const atoms: MoleculeAtom[] = [];
    const bonds: MoleculeBond[] = [];

    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      atoms.push({
        id: `C${i + 1}`,
        element: 'C',
        x: Math.round(x),
        y: Math.round(y),
        label: 'C',
        color: CPK_COLORS.C
      });
    }

    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      bonds.push({
        id: `b${i + 1}`,
        atom1Id: `C${i + 1}`,
        atom2Id: `C${next + 1}`,
        order: i % 2 === 0 ? 2 : 1,
        type: 'covalent'
      });
    }

    return {
      moleculeName: 'Benzene',
      formula: 'C₆H₆',
      molecularWeight: 78.11,
      atoms,
      bonds,
      geometryDescription: 'Planar aromatic ring with delocalized pi-electron cloud'
    };
  }

  private static buildGenericMolecule(formula: string): ChemistryParameters {
    return {
      moleculeName: formula,
      formula: formula,
      atoms: [
        { id: 'A1', element: 'C', x: 160, y: 180, label: 'C', color: CPK_COLORS.C },
        { id: 'A2', element: 'O', x: 240, y: 180, label: 'O', color: CPK_COLORS.O }
      ],
      bonds: [
        { id: 'b1', atom1Id: 'A1', atom2Id: 'A2', order: 1, type: 'covalent' }
      ],
      geometryDescription: `2D topological structure for ${formula}`
    };
  }
}
