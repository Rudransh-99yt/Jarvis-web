import { requirePrincipal } from '../../../auth/principal.ts';
import fs from 'node:fs';
import path from 'node:path';
import type {
  SmartBoardDevice,
  BoardDocument,
  BoardPage,
  BoardElement,
  SmartBoardDeviceStatus
} from '../../../../src/types/smartboard.ts';
import { jarvisData } from '../../../data/index.ts';

// Initial pre-registered SmartBoard Devices across Stark Academy classrooms
export const INITIAL_SMARTBOARD_DEVICES: SmartBoardDevice[] = [
  {
    id: 'board-phys-01',
    institutionId: 'inst-stark-academy',
    classroomId: 'class-phys-301',
    classroomName: 'Physics Lab Hall C-104',
    displayName: 'SmartBoard 01 — Physics Lab',
    modelNumber: 'Stark Surface-86X 4K HDR',
    status: 'AVAILABLE',
    capabilities: {
      touch: true,
      pen: true,
      multiTouch: true,
      maxResolution: '3840x2160',
      audio: true,
      camera: true
    },
    pairingState: {
      isPaired: false
    },
    lastSeen: new Date().toISOString(),
    currentSessionId: null,
    currentCourseCode: 'PHYS-301',
    currentTopic: 'Electrostatics & Electric Fields',
    ipAddress: '10.0.4.12',
    firmwareVersion: 'v4.2.0-stark-os',
    location: 'Building A, Room C-104'
  },
  {
    id: 'board-chem-01',
    institutionId: 'inst-stark-academy',
    classroomId: 'class-chem-201',
    classroomName: 'Chemistry Lab B-202',
    displayName: 'SmartBoard 02 — Chemistry Lab',
    modelNumber: 'Stark Surface-75X 4K',
    status: 'AVAILABLE',
    capabilities: {
      touch: true,
      pen: true,
      multiTouch: true,
      maxResolution: '3840x2160',
      audio: true,
      camera: false
    },
    pairingState: {
      isPaired: false
    },
    lastSeen: new Date().toISOString(),
    currentSessionId: null,
    currentCourseCode: 'CHEM-201',
    currentTopic: 'Organic Reaction Mechanisms',
    ipAddress: '10.0.4.15',
    firmwareVersion: 'v4.2.0-stark-os',
    location: 'Building B, Room B-202'
  },
  {
    id: 'board-math-01',
    institutionId: 'inst-stark-academy',
    classroomId: 'class-math-201',
    classroomName: 'Mathematics Hall M-101',
    displayName: 'SmartBoard 03 — Math Hall',
    modelNumber: 'Stark Surface-86X 4K HDR',
    status: 'AVAILABLE',
    capabilities: {
      touch: true,
      pen: true,
      multiTouch: true,
      maxResolution: '3840x2160',
      audio: true,
      camera: true
    },
    pairingState: {
      isPaired: false
    },
    lastSeen: new Date().toISOString(),
    currentSessionId: null,
    currentCourseCode: 'MATH-201',
    currentTopic: 'Differential Equations',
    ipAddress: '10.0.4.20',
    firmwareVersion: 'v4.2.0-stark-os',
    location: 'Building M, Room M-101'
  }
];

// Initial pre-seeded realistic BoardDocument for Physics 301
export const INITIAL_BOARD_DOCUMENTS: BoardDocument[] = [
  {
    id: 'bdoc-phys-101',
    institutionId: 'inst-stark-academy',
    classroomId: 'class-phys-301',
    classroomName: 'Physics Lab Hall C-104',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    courseName: 'Advanced Quantum & Classical Electrodynamics',
    unitId: 'unit-em-maxwell',
    unitTitle: 'Unit 1: Electrostatics & Field Potentials',
    lessonId: 'les-em-1',
    lessonTitle: "Coulomb's Law, Electric Fields & Gauss Surface Flux",
    classSessionId: 'session-phys-101',
    teacherId: 'teacher-1',
    teacherName: 'Dr. Helen Cho',
    title: "Electrostatics & Faraday-Gauss Board Notes",
    version: 1,
    isReleasedToStudents: true,
    releasedAt: new Date(Date.now() - 3600000).toISOString(),
    activePageIndex: 0,
    pages: [
      {
        pageId: 'page-p1-1',
        pageIndex: 0,
        title: 'Gauss Law & Flux Geometry',
        background: 'dark_grid',
        slideReferenceIndex: 0,
        elements: [
          {
            id: 'elem-t1',
            type: 'text',
            text: 'Gauss’s Law: \\oint \\vec{E} \\cdot d\\vec{A} = \\frac{q_{\\text{enc}}}{\\varepsilon_0}',
            fontSize: 24,
            fontFamily: 'font-mono',
            x: 60,
            y: 40,
            color: '#38bdf8',
            semanticTag: 'formula',
            latexFormula: '\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{q_{\\text{enc}}}{\\varepsilon_0}',
            zIndex: 1,
            createdAt: '2026-10-02T16:00:00.000Z',
            updatedAt: '2026-10-02T16:00:00.000Z'
          },
          {
            id: 'elem-s1',
            type: 'shape',
            shapeType: 'circle',
            x: 120,
            y: 140,
            widthPx: 160,
            heightPx: 160,
            strokeColor: '#00f2fe',
            fillColor: 'rgba(6, 182, 212, 0.1)',
            label: 'Gaussian Sphere Radius r',
            semanticTag: 'diagram_label',
            zIndex: 2,
            createdAt: '2026-10-02T16:02:00.000Z',
            updatedAt: '2026-10-02T16:02:00.000Z'
          },
          {
            id: 'elem-str1',
            type: 'stroke',
            tool: 'pen',
            color: '#f59e0b',
            width: 3,
            points: [
              { x: 120, y: 140, pressure: 0.5 },
              { x: 180, y: 140, pressure: 0.7 },
              { x: 200, y: 140, pressure: 0.6 }
            ],
            semanticTag: 'derivation_step',
            zIndex: 3,
            createdAt: '2026-10-02T16:05:00.000Z',
            updatedAt: '2026-10-02T16:05:00.000Z'
          },
          {
            id: 'elem-t2',
            type: 'text',
            text: 'Key Intuition: Surface area of sphere = 4\\pi r^2 \\implies E(4\\pi r^2) = \\frac{q}{\\varepsilon_0} \\implies E = \\frac{q}{4\\pi\\varepsilon_0 r^2}',
            fontSize: 18,
            fontFamily: 'font-mono',
            x: 60,
            y: 330,
            color: '#a78bfa',
            semanticTag: 'worked_solution',
            latexFormula: 'E = \\frac{1}{4\\pi\\varepsilon_0} \\frac{q}{r^2}',
            zIndex: 4,
            createdAt: '2026-10-02T16:08:00.000Z',
            updatedAt: '2026-10-02T16:08:00.000Z'
          }
        ],
        createdAt: '2026-10-02T16:00:00.000Z',
        updatedAt: '2026-10-02T16:08:00.000Z'
      },
      {
        pageId: 'page-p1-2',
        pageIndex: 1,
        title: 'Cylindrical Symmetry Derivation',
        background: 'dark_grid',
        slideReferenceIndex: 1,
        elements: [
          {
            id: 'elem-p2-t1',
            type: 'text',
            text: 'Infinite Line Charge Linear Density \\lambda = \\frac{q}{L}',
            fontSize: 20,
            fontFamily: 'font-mono',
            x: 60,
            y: 40,
            color: '#34d399',
            semanticTag: 'formula',
            latexFormula: '\\lambda = \\frac{q}{L}',
            zIndex: 1,
            createdAt: '2026-10-02T16:12:00.000Z',
            updatedAt: '2026-10-02T16:12:00.000Z'
          },
          {
            id: 'elem-p2-t2',
            type: 'text',
            text: 'Result: E = \\frac{\\lambda}{2\\pi \\varepsilon_0 r} (radial outwards)',
            fontSize: 22,
            fontFamily: 'font-mono',
            x: 60,
            y: 120,
            color: '#38bdf8',
            semanticTag: 'worked_solution',
            latexFormula: 'E = \\frac{\\lambda}{2\\pi\\varepsilon_0 r}',
            zIndex: 2,
            createdAt: '2026-10-02T16:18:00.000Z',
            updatedAt: '2026-10-02T16:18:00.000Z'
          }
        ],
        createdAt: '2026-10-02T16:12:00.000Z',
        updatedAt: '2026-10-02T16:18:00.000Z'
      }
    ],
    timestamps: {
      createdAt: '2026-10-02T16:00:00.000Z',
      updatedAt: '2026-10-02T16:20:00.000Z',
      lastAutosavedAt: '2026-10-02T16:20:00.000Z',
      completedAt: '2026-10-02T16:45:00.000Z'
    },
    ragIndexed: true,
    ragSummary: 'Board notes covering Gauss’s Law derivation for spherical and cylindrical Gaussian surfaces with Coulomb inverse-square relationship.'
  }
];

export class SmartBoardStore {
  private devices: Map<string, SmartBoardDevice> = new Map();
  private documents: Map<string, BoardDocument> = new Map();
  private storageFilePath: string;

  constructor(customStoragePath?: string) {
    const defaultDir = path.resolve(process.cwd(), 'data');
    this.storageFilePath = customStoragePath || process.env.SMARTBOARD_STORE_FILE || path.join(defaultDir, 'smartboard-store.json');
    if (!this.loadFromDisk()) {
      this.resetToDefaults();
    }
  }

  private loadFromDisk(): boolean {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.devices) && Array.isArray(parsed.documents)) {
          this.devices.clear();
          this.documents.clear();
          parsed.devices.forEach((d: SmartBoardDevice) => this.devices.set(d.id, d));
          parsed.documents.forEach((doc: BoardDocument) => this.documents.set(doc.id, doc));
          return true;
        }
      }
    } catch (err) {
      console.warn('[SmartBoardStore] Failed to load from disk, resetting to defaults:', err);
    }
    return false;
  }

  public persistToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        version: 1,
        updatedAt: new Date().toISOString(),
        devices: Array.from(this.devices.values()),
        documents: Array.from(this.documents.values())
      };
      const tmpPath = `${this.storageFilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.storageFilePath);
    } catch (err) {
      console.warn('[SmartBoardStore] Warning: Could not persist state to disk:', err);
    }
  }

  resetToDefaults(): void {
    this.devices.clear();
    this.documents.clear();
    INITIAL_SMARTBOARD_DEVICES.forEach((d) => this.devices.set(d.id, JSON.parse(JSON.stringify(d))));
    INITIAL_BOARD_DOCUMENTS.forEach((doc) => this.documents.set(doc.id, JSON.parse(JSON.stringify(doc))));
    this.persistToDisk();
  }

  // --- Device Management ---
  listDevices(institutionId?: string, classroomId?: string): SmartBoardDevice[] {
    return Array.from(this.devices.values()).filter((d) => {
      const matchInst = !institutionId || d.institutionId === institutionId;
      const matchClassroom = !classroomId || d.classroomId === classroomId;
      return matchInst && matchClassroom;
    });
  }

  getDevice(id: string): SmartBoardDevice | undefined {
    const dev = this.devices.get(id);
    return dev ? JSON.parse(JSON.stringify(dev)) : undefined;
  }

  registerDevice(device: SmartBoardDevice): SmartBoardDevice {
    this.devices.set(device.id, JSON.parse(JSON.stringify(device)));
    return JSON.parse(JSON.stringify(device));
  }

  updateDeviceStatus(
    id: string,
    status: SmartBoardDeviceStatus,
    patch?: Partial<SmartBoardDevice>
  ): SmartBoardDevice {
    const existing = this.devices.get(id);
    if (!existing) {
      throw new Error(`SmartBoard device '${id}' not found.`);
    }

    const updated: SmartBoardDevice = {
      ...existing,
      ...patch,
      status,
      lastSeen: new Date().toISOString()
    };

    this.devices.set(id, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  generatePairCode(boardId: string): { pairCode: string; expiresAt: number } {
    const board = this.devices.get(boardId);
    if (!board) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    // Generate random 6-character alphanumeric PIN
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

    board.pairingState = {
      isPaired: false,
      pairCode: code,
      pairCodeExpiresAt: expiresAt
    };
    board.status = 'PAIRING';
    board.lastSeen = new Date().toISOString();

    return { pairCode: code, expiresAt };
  }

  pairDevice(
    boardId: string,
    teacherId: string,
    teacherName: string,
    ticketId: string,
    sessionId?: string
  ): SmartBoardDevice {
    const board = this.devices.get(boardId);
    if (!board) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    board.pairingState = {
      isPaired: true,
      pairedTeacherId: teacherId,
      pairedTeacherName: teacherName,
      pairedAt: new Date().toISOString(),
      ticketId,
      sessionId
    };
    board.status = sessionId ? 'LIVE' : 'READY';
    if (sessionId) {
      board.currentSessionId = sessionId;
    }
    board.lastSeen = new Date().toISOString();

    return JSON.parse(JSON.stringify(board));
  }

  disconnectDevice(boardId: string): SmartBoardDevice {
    const board = this.devices.get(boardId);
    if (!board) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    board.pairingState = {
      isPaired: false
    };
    board.status = 'AVAILABLE';
    board.currentSessionId = null;
    board.lastSeen = new Date().toISOString();

    return JSON.parse(JSON.stringify(board));
  }

  // --- BoardDocument Management ---
  getBoardDocument(id: string): BoardDocument | undefined {
    const doc = this.documents.get(id);
    return doc ? JSON.parse(JSON.stringify(doc)) : undefined;
  }

  getBoardDocumentForSession(sessionId: string): BoardDocument | undefined {
    const found = Array.from(this.documents.values()).find((d) => d.classSessionId === sessionId);
    return found ? JSON.parse(JSON.stringify(found)) : undefined;
  }

  listDocumentsForClass(classId: string, onlyReleased = false): BoardDocument[] {
    return Array.from(this.documents.values())
      .filter((d) => d.classId === classId && (!onlyReleased || d.isReleasedToStudents))
      .sort((a, b) => new Date(b.timestamps.updatedAt).getTime() - new Date(a.timestamps.updatedAt).getTime());
  }

  listAllDocuments(onlyReleased = false): BoardDocument[] {
    return Array.from(this.documents.values())
      .filter((d) => !onlyReleased || d.isReleasedToStudents)
      .sort((a, b) => new Date(b.timestamps.updatedAt).getTime() - new Date(a.timestamps.updatedAt).getTime());
  }

  createOrGetDocumentForSession(params: {
    sessionId: string;
    classId: string;
    courseCode: string;
    courseName: string;
    unitId?: string;
    unitTitle?: string;
    lessonId?: string;
    lessonTitle?: string;
    teacherId: string;
    teacherName: string;
    title: string;
    classroomId: string;
    classroomName: string;
    institutionId: string;
  }): BoardDocument {
    const existing = this.getBoardDocumentForSession(params.sessionId);
    if (existing) {
      return existing;
    }

    const newDoc: BoardDocument = {
      id: `bdoc-${params.sessionId}`,
      institutionId: params.institutionId,
      classroomId: params.classroomId,
      classroomName: params.classroomName,
      classId: params.classId,
      courseCode: params.courseCode,
      courseName: params.courseName,
      unitId: params.unitId,
      unitTitle: params.unitTitle,
      lessonId: params.lessonId,
      lessonTitle: params.lessonTitle,
      classSessionId: params.sessionId,
      teacherId: params.teacherId,
      teacherName: params.teacherName,
      title: params.title || `${params.courseCode} Board Notes`,
      version: 1,
      isReleasedToStudents: false,
      activePageIndex: 0,
      pages: [
        {
          pageId: `page-${params.sessionId}-1`,
          pageIndex: 0,
          title: params.lessonTitle || 'Main Canvas',
          background: 'dark_grid',
          elements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAutosavedAt: new Date().toISOString()
      },
      ragIndexed: false
    };

    this.documents.set(newDoc.id, JSON.parse(JSON.stringify(newDoc)));
    return JSON.parse(JSON.stringify(newDoc));
  }

  autosaveDocument(
    docId: string,
    updates: Partial<BoardDocument> & { pages?: BoardPage[]; activePageIndex?: number; expectedVersion?: number }
  ): BoardDocument {
    const existing = this.documents.get(docId);
    if (!existing) {
      throw new Error(`BoardDocument '${docId}' not found.`);
    }

    // Strict Stale-Write Protection (409 Conflict)
    if (updates.expectedVersion !== undefined && updates.expectedVersion !== existing.version) {
      const conflictErr: any = new Error(
        `Version conflict on BoardDocument '${docId}': Expected version ${updates.expectedVersion}, but current version is ${existing.version}. Stale or mismatched writes are strictly rejected to prevent data loss.`
      );
      conflictErr.statusCode = 409;
      conflictErr.code = 'VERSION_CONFLICT';
      conflictErr.currentVersion = existing.version;
      throw conflictErr;
    }

    const updated: BoardDocument = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      timestamps: {
        ...existing.timestamps,
        updatedAt: new Date().toISOString(),
        lastAutosavedAt: new Date().toISOString()
      }
    };

    this.documents.set(docId, JSON.parse(JSON.stringify(updated)));
    this.persistToDisk();
    return JSON.parse(JSON.stringify(updated));
  }

  releaseDocument(docId: string, isReleasedToStudents = true): BoardDocument {
    const existing = this.documents.get(docId);
    if (!existing) {
      throw new Error(`BoardDocument '${docId}' not found.`);
    }

    const updated: BoardDocument = {
      ...existing,
      isReleasedToStudents,
      releasedAt: isReleasedToStudents ? new Date().toISOString() : undefined,
      timestamps: {
        ...existing.timestamps,
        updatedAt: new Date().toISOString()
      }
    };

    this.documents.set(docId, JSON.parse(JSON.stringify(updated)));
    this.persistToDisk();
    return JSON.parse(JSON.stringify(updated));
  }

  completeSession(sessionId: string): { board?: SmartBoardDevice; document?: BoardDocument } {
    let board: SmartBoardDevice | undefined;
    for (const b of this.devices.values()) {
      if (b.currentSessionId === sessionId) {
        b.status = 'AVAILABLE';
        b.currentSessionId = null;
        b.pairingState = { isPaired: false };
        b.lastSeen = new Date().toISOString();
        board = JSON.parse(JSON.stringify(b));
      }
    }

    const doc = this.getBoardDocumentForSession(sessionId);
    if (doc) {
      doc.timestamps.completedAt = new Date().toISOString();
      doc.timestamps.updatedAt = new Date().toISOString();
      this.documents.set(doc.id, doc);
    }

    return { board, document: doc };
  }
}

export const smartboardStore = new SmartBoardStore();
