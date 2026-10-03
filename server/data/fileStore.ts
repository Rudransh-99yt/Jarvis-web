// Atomic Local Disk File Store for Jarvis Persistent Storage
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSchema } from './types.ts';
import { INITIAL_DATABASE_SCHEMA } from './seedData.ts';

export interface FileStoreOptions {
  filePath?: string;
  autoSaveDelayMs?: number;
}

export class JsonFileStore {
  private filePath: string;
  private autoSaveDelayMs: number;
  private state: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isDirty = false;
  private isSaving = false;

  constructor(options?: FileStoreOptions) {
    const defaultDir = path.resolve(process.cwd(), 'data');
    this.filePath = options?.filePath || path.join(defaultDir, 'jarvis-db.json');
    this.autoSaveDelayMs = options?.autoSaveDelayMs ?? 100;
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
  }

  getStoragePath(): string {
    return this.filePath;
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && typeof parsed.version === 'number') {
          // Merge loaded state with schema defaults to guarantee missing arrays exist
          this.state = {
            version: parsed.version || 1,
            users: Array.isArray(parsed.users) ? parsed.users : [],
            workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
            memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
            conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
            messages: Array.isArray(parsed.messages) ? parsed.messages : [],
            knowledgeSpaces: Array.isArray(parsed.knowledgeSpaces) ? parsed.knowledgeSpaces : [],
            knowledgeSources: Array.isArray(parsed.knowledgeSources) ? parsed.knowledgeSources : [],
            knowledgeChunks: Array.isArray(parsed.knowledgeChunks) ? parsed.knowledgeChunks : [],
            classes: Array.isArray(parsed.classes) ? parsed.classes : [],
            assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
            submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
            studyArtifacts: Array.isArray(parsed.studyArtifacts) ? parsed.studyArtifacts : [],
            auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
            researchProjects: Array.isArray(parsed.researchProjects) && parsed.researchProjects.length > 0 ? parsed.researchProjects : (INITIAL_DATABASE_SCHEMA.researchProjects || []),
            researchQuestions: Array.isArray(parsed.researchQuestions) && parsed.researchQuestions.length > 0 ? parsed.researchQuestions : (INITIAL_DATABASE_SCHEMA.researchQuestions || []),
            evidenceRecords: Array.isArray(parsed.evidenceRecords) && parsed.evidenceRecords.length > 0 ? parsed.evidenceRecords : (INITIAL_DATABASE_SCHEMA.evidenceRecords || []),
            researchNotes: Array.isArray(parsed.researchNotes) && parsed.researchNotes.length > 0 ? parsed.researchNotes : (INITIAL_DATABASE_SCHEMA.researchNotes || []),
            researchReports: Array.isArray(parsed.researchReports) && parsed.researchReports.length > 0 ? parsed.researchReports : (INITIAL_DATABASE_SCHEMA.researchReports || []),
            files: Array.isArray(parsed.files) && parsed.files.length > 0 ? parsed.files : (INITIAL_DATABASE_SCHEMA.files || [])
          };
          return;
        }
      } catch (err) {
        console.warn(`[JsonFileStore] Could not parse existing database file at ${this.filePath}. Initializing fresh schema.`, err);
      }
    }

    // Initialize with seed data and flush to disk
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
    await this.flush();
  }

  getState(): DatabaseSchema {
    return this.state;
  }

  mutate<T>(fn: (state: DatabaseSchema) => T): T {
    const result = fn(this.state);
    this.isDirty = true;
    this.scheduleAutoSave();
    return result;
  }

  private scheduleAutoSave(): void {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      if (this.isDirty) {
        this.flush().catch((err) => {
          console.error('[JsonFileStore] Auto-save error:', err);
        });
      }
    }, this.autoSaveDelayMs);
    if (this.saveTimeout && typeof this.saveTimeout.unref === 'function') {
      this.saveTimeout.unref();
    }
  }

  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    if (this.isSaving) return;
    this.isSaving = true;

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tempFile = `${this.filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
      const serialized = JSON.stringify(this.state, null, 2);
      
      await fs.promises.writeFile(tempFile, serialized, 'utf8');
      await fs.promises.rename(tempFile, this.filePath);
      this.isDirty = false;
    } finally {
      this.isSaving = false;
    }
  }

  async reset(): Promise<void> {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
    await this.flush();
  }
}
