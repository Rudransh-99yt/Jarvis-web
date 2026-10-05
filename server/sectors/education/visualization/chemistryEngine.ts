import { requirePrincipal } from '../../../auth/principal.ts';
// Safe molecular topology and 2D chemical structure validator

import type { MoleculeAtom, MoleculeBond, MoleculeVisualizationPayload } from '../../../../src/types/visualization.ts';

export const COMMON_ELEMENTS: Record<string, { name: string; valency: number; color: string; radius: number; mass: number }> = {
  H: { name: 'Hydrogen', valency: 1, color: '#f8fafc', radius: 14, mass: 1.008 },
  C: { name: 'Carbon', valency: 4, color: '#64748b', radius: 22, mass: 12.011 },
  N: { name: 'Nitrogen', valency: 3, color: '#3b82f6', radius: 20, mass: 14.007 },
  O: { name: 'Oxygen', valency: 2, color: '#ef4444', radius: 20, mass: 15.999 },
  F: { name: 'Fluorine', valency: 1, color: '#10b981', radius: 18, mass: 18.998 },
  P: { name: 'Phosphorus', valency: 5, color: '#f59e0b', radius: 24, mass: 30.974 },
  S: { name: 'Sulfur', valency: 2, color: '#eab308', radius: 24, mass: 32.06 },
  Cl: { name: 'Chlorine', valency: 1, color: '#22c55e', radius: 22, mass: 35.45 },
  Br: { name: 'Bromine', valency: 1, color: '#b91c1c', radius: 24, mass: 79.904 },
  I: { name: 'Iodine', valency: 1, color: '#7c3aed', radius: 26, mass: 126.90 },
  Na: { name: 'Sodium', valency: 1, color: '#8b5cf6', radius: 26, mass: 22.990 },
  K: { name: 'Potassium', valency: 1, color: '#a855f7', radius: 28, mass: 39.098 },
  Ca: { name: 'Calcium', valency: 2, color: '#6366f1', radius: 28, mass: 40.078 },
  Fe: { name: 'Iron', valency: 3, color: '#f97316', radius: 26, mass: 55.845 }
};

export class ChemistryEngine {
  public static validateMolecule(payload: Partial<MoleculeVisualizationPayload>): { isValid: boolean; errors: string[]; sanitized?: MoleculeVisualizationPayload } {
    const errors: string[] = [];

    if (!payload.chemicalFormula || typeof payload.chemicalFormula !== 'string') {
      errors.push('Chemical formula is required');
    }
    if (!payload.commonName || typeof payload.commonName !== 'string') {
      errors.push('Common molecule name is required');
    }

    const atoms: MoleculeAtom[] = [];
    const atomIdSet = new Set<string>();

    if (Array.isArray(payload.atoms)) {
      for (const a of payload.atoms) {
        if (!a.id || typeof a.id !== 'string') {
          errors.push('Atom ID must be a non-empty string');
          continue;
        }
        if (atomIdSet.has(a.id)) {
          errors.push(`Duplicate atom ID: ${a.id}`);
          continue;
        }
        atomIdSet.add(a.id);

        const elemSymbol = (a.element || '').trim();
        if (!elemSymbol || !/^[A-Z][a-z]?$/.test(elemSymbol)) {
          errors.push(`Invalid element symbol '${elemSymbol}' for atom ${a.id}`);
        }

        atoms.push({
          id: a.id,
          element: elemSymbol,
          x: Number(a.x) || 0,
          y: Number(a.y) || 0,
          z: a.z !== undefined ? Number(a.z) : undefined,
          label: typeof a.label === 'string' ? a.label.slice(0, 50) : undefined,
          charge: typeof a.charge === 'number' ? a.charge : undefined
        });
      }
    }

    const bonds: MoleculeBond[] = [];
    const bondIdSet = new Set<string>();

    if (Array.isArray(payload.bonds)) {
      for (const b of payload.bonds) {
        if (!b.id || typeof b.id !== 'string') {
          errors.push('Bond ID must be a non-empty string');
          continue;
        }
        if (bondIdSet.has(b.id)) {
          errors.push(`Duplicate bond ID: ${b.id}`);
          continue;
        }
        bondIdSet.add(b.id);

        if (!atomIdSet.has(b.sourceAtomId)) {
          errors.push(`Bond ${b.id} references non-existent source atom '${b.sourceAtomId}'`);
        }
        if (!atomIdSet.has(b.targetAtomId)) {
          errors.push(`Bond ${b.id} references non-existent target atom '${b.targetAtomId}'`);
        }

        bonds.push({
          id: b.id,
          sourceAtomId: b.sourceAtomId,
          targetAtomId: b.targetAtomId,
          bondType: ['single', 'double', 'triple', 'aromatic', 'hydrogen'].includes(b.bondType) ? b.bondType : 'single'
        });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const sanitized: MoleculeVisualizationPayload = {
      type: 'MOLECULE',
      title: (payload.title || payload.commonName || 'Molecule').slice(0, 100),
      chemicalFormula: (payload.chemicalFormula || '').slice(0, 50),
      commonName: (payload.commonName || '').slice(0, 100),
      iupacName: payload.iupacName ? payload.iupacName.slice(0, 150) : undefined,
      molecularWeight: payload.molecularWeight ? Number(payload.molecularWeight) : undefined,
      atoms,
      bonds,
      representation: ['ball_and_stick', 'space_filling', 'skeletal'].includes(payload.representation as string)
        ? (payload.representation as any)
        : 'ball_and_stick'
    };

    return { isValid: true, errors: [], sanitized };
  }

  /**
   * Generates standard molecular presets (e.g. H2O, CH4, CO2, C6H12O6, NH3)
   */
  public static getStandardPreset(formula: string): MoleculeVisualizationPayload | null {
    const norm = formula.trim().toUpperCase();
    if (norm === 'H2O' || norm === 'WATER') {
      return {
        type: 'MOLECULE',
        title: 'Water Molecule (H₂O)',
        chemicalFormula: 'H2O',
        commonName: 'Water',
        iupacName: 'Oxidane',
        molecularWeight: 18.015,
        representation: 'ball_and_stick',
        atoms: [
          { id: 'O1', element: 'O', x: 200, y: 150 },
          { id: 'H1', element: 'H', x: 130, y: 220 },
          { id: 'H2', element: 'H', x: 270, y: 220 }
        ],
        bonds: [
          { id: 'b1', sourceAtomId: 'O1', targetAtomId: 'H1', bondType: 'single' },
          { id: 'b2', sourceAtomId: 'O1', targetAtomId: 'H2', bondType: 'single' }
        ]
      };
    }
    if (norm === 'CO2' || norm === 'CARBON DIOXIDE') {
      return {
        type: 'MOLECULE',
        title: 'Carbon Dioxide (CO₂)',
        chemicalFormula: 'CO2',
        commonName: 'Carbon Dioxide',
        iupacName: 'Carbon Dioxide',
        molecularWeight: 44.01,
        representation: 'ball_and_stick',
        atoms: [
          { id: 'C1', element: 'C', x: 200, y: 180 },
          { id: 'O1', element: 'O', x: 90, y: 180 },
          { id: 'O2', element: 'O', x: 310, y: 180 }
        ],
        bonds: [
          { id: 'b1', sourceAtomId: 'C1', targetAtomId: 'O1', bondType: 'double' },
          { id: 'b2', sourceAtomId: 'C1', targetAtomId: 'O2', bondType: 'double' }
        ]
      };
    }
    if (norm === 'CH4' || norm === 'METHANE') {
      return {
        type: 'MOLECULE',
        title: 'Methane (CH₄)',
        chemicalFormula: 'CH4',
        commonName: 'Methane',
        molecularWeight: 16.04,
        representation: 'ball_and_stick',
        atoms: [
          { id: 'C1', element: 'C', x: 200, y: 180 },
          { id: 'H1', element: 'H', x: 200, y: 80 },
          { id: 'H2', element: 'H', x: 100, y: 240 },
          { id: 'H3', element: 'H', x: 300, y: 240 },
          { id: 'H4', element: 'H', x: 200, y: 260 }
        ],
        bonds: [
          { id: 'b1', sourceAtomId: 'C1', targetAtomId: 'H1', bondType: 'single' },
          { id: 'b2', sourceAtomId: 'C1', targetAtomId: 'H2', bondType: 'single' },
          { id: 'b3', sourceAtomId: 'C1', targetAtomId: 'H3', bondType: 'single' },
          { id: 'b4', sourceAtomId: 'C1', targetAtomId: 'H4', bondType: 'single' }
        ]
      };
    }
    return null;
  }
}
