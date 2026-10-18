// Atomic Local Disk File Store for Jarvis Persistent Storage
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSchema } from './types.ts';
import { INITIAL_DATABASE_SCHEMA } from './seedData.ts';
import { transactionStorage, mergeThreeWaySchemas } from './transaction.ts';

export interface FileStoreOptions {
  filePath?: string;
  autoSaveDelayMs?: number;
  skipProcessLock?: boolean;
}

export class JsonFileStore {
  private filePath: string;
  private autoSaveDelayMs: number;
  private skipProcessLock: boolean;
  private lockFilePath: string;
  private hasProcessLock = false;
  private exitHandler: (() => void) | null = null;
  private state: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isDirty = false;
  private isSaving = false;

  private transactionDepth = 0;
  private transactionStates: DatabaseSchema[] = [];
  private baseStates: DatabaseSchema[] = [];
  private pendingFlushPromise: Promise<void> | null = null;
  private activeTempFile: string | null = null;

  constructor(options?: FileStoreOptions) {
    const defaultDir = path.resolve(process.cwd(), 'data');
    this.filePath = options?.filePath || (process.env.JARVIS_DB_PATH ? path.resolve(process.env.JARVIS_DB_PATH) : path.join(defaultDir, 'jarvis-db.json'));
    this.autoSaveDelayMs = options?.autoSaveDelayMs ?? 100;
    this.skipProcessLock = options?.skipProcessLock ?? false;
    this.lockFilePath = `${this.filePath}.lock`;
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
  }

  getStoragePath(): string {
    return this.filePath;
  }

  getLockFilePath(): string {
    return this.lockFilePath;
  }

  isProcessLocked(): boolean {
    return this.hasProcessLock;
  }

  private acquireProcessLock(): void {
    const lockDir = path.dirname(this.lockFilePath);
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }

    const payload = JSON.stringify({
      pid: process.pid,
      createdAt: new Date().toISOString()
    });

    try {
      const fd = fs.openSync(this.lockFilePath, 'wx');
      fs.writeFileSync(fd, payload, 'utf8');
      fs.closeSync(fd);
      return;
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    // Lockfile exists - inspect lock ownership and liveness
    let existingLock: { pid?: number; createdAt?: string } | null = null;
    try {
      const raw = fs.readFileSync(this.lockFilePath, 'utf8');
      existingLock = JSON.parse(raw);
    } catch {
      // Unparseable or corrupt lock file
    }

    if (existingLock && typeof existingLock.pid === 'number') {
      if (existingLock.pid === process.pid) {
        // Re-entrant or same process; refresh payload
        try {
          fs.writeFileSync(this.lockFilePath, payload, 'utf8');
        } catch {}
        return;
      }

      // Check whether the locking process is still running
      let isAlive = false;
      try {
        process.kill(existingLock.pid, 0);
        isAlive = true;
      } catch (killErr: any) {
        if (killErr.code === 'ESRCH') {
          isAlive = false; // Process does not exist (stale lock)
        } else if (killErr.code === 'EPERM') {
          isAlive = true; // Process exists but owned by different user
        }
      }

      if (isAlive) {
        const lockErr = new Error(
          `FILE_STORE_LOCKED: Storage file '${this.filePath}' is already locked by another running process (PID ${existingLock.pid}). Simultaneous processes cannot safely access the same file-backed storage.`
        );
        (lockErr as any).code = 'FILE_STORE_LOCKED';
        (lockErr as any).lockedByPid = existingLock.pid;
        throw lockErr;
      }
    }

    // Stale or dead process lock detected - remove and re-acquire
    try {
      fs.unlinkSync(this.lockFilePath);
    } catch {}

    const fd = fs.openSync(this.lockFilePath, 'wx');
    fs.writeFileSync(fd, payload, 'utf8');
    fs.closeSync(fd);
  }

  private releaseProcessLock(): void {
    if (!this.hasProcessLock) return;
    try {
      if (fs.existsSync(this.lockFilePath)) {
        const raw = fs.readFileSync(this.lockFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.pid === process.pid) {
          fs.unlinkSync(this.lockFilePath);
        }
      }
    } catch {
      // Best-effort cleanup on shutdown
    } finally {
      this.hasProcessLock = false;
    }
  }

  close(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.exitHandler) {
      process.removeListener('exit', this.exitHandler);
      this.exitHandler = null;
    }
    this.releaseProcessLock();
  }

  async init(): Promise<void> {
    if (!this.skipProcessLock && process.env.JARVIS_SKIP_PROCESS_LOCK !== 'true') {
      this.acquireProcessLock();
      this.hasProcessLock = true;
      if (!this.exitHandler) {
        this.exitHandler = () => this.releaseProcessLock();
        process.once('exit', this.exitHandler);
      }
    }

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
            institutions: Array.isArray(parsed.institutions) ? parsed.institutions : (INITIAL_DATABASE_SCHEMA.institutions || []),
            institutionMemberships: Array.isArray(parsed.institutionMemberships) ? parsed.institutionMemberships : (INITIAL_DATABASE_SCHEMA.institutionMemberships || []),
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
            files: Array.isArray(parsed.files) && parsed.files.length > 0 ? parsed.files : (INITIAL_DATABASE_SCHEMA.files || []),
            classroomSessions: Array.isArray(parsed.classroomSessions) && parsed.classroomSessions.length > 0 ? parsed.classroomSessions : (INITIAL_DATABASE_SCHEMA.classroomSessions || []),
            classroomParticipants: Array.isArray(parsed.classroomParticipants) ? parsed.classroomParticipants : [],
            quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : (INITIAL_DATABASE_SCHEMA.quizzes || []),
            quizQuestions: Array.isArray(parsed.quizQuestions) ? parsed.quizQuestions : (INITIAL_DATABASE_SCHEMA.quizQuestions || []),
            quizResponses: Array.isArray(parsed.quizResponses) ? parsed.quizResponses : (INITIAL_DATABASE_SCHEMA.quizResponses || []),
            quizParticipantStates: Array.isArray(parsed.quizParticipantStates) ? parsed.quizParticipantStates : (INITIAL_DATABASE_SCHEMA.quizParticipantStates || []),
            videos: Array.isArray(parsed.videos) ? parsed.videos : (INITIAL_DATABASE_SCHEMA.videos || []),
            institutionInvitations: Array.isArray(parsed.institutionInvitations) ? parsed.institutionInvitations : (INITIAL_DATABASE_SCHEMA.institutionInvitations || []),
            learningLinks: Array.isArray(parsed.learningLinks) ? parsed.learningLinks : (INITIAL_DATABASE_SCHEMA.learningLinks || []),
            academicEvents: Array.isArray(parsed.academicEvents) ? parsed.academicEvents : (INITIAL_DATABASE_SCHEMA.academicEvents || []),
            academicNotifications: Array.isArray(parsed.academicNotifications) ? parsed.academicNotifications : (INITIAL_DATABASE_SCHEMA.academicNotifications || []),
            quizResults: Array.isArray(parsed.quizResults) ? parsed.quizResults : (INITIAL_DATABASE_SCHEMA.quizResults || []),
            smartboardDevices: Array.isArray(parsed.smartboardDevices) ? parsed.smartboardDevices : (INITIAL_DATABASE_SCHEMA.smartboardDevices || []),
            boardDocuments: Array.isArray(parsed.boardDocuments) ? parsed.boardDocuments : (INITIAL_DATABASE_SCHEMA.boardDocuments || []),
            meta: parsed.meta || INITIAL_DATABASE_SCHEMA.meta,
            personalIdentities: Array.isArray(parsed.personalIdentities) ? parsed.personalIdentities : (INITIAL_DATABASE_SCHEMA.personalIdentities || []),
            personalMemories: Array.isArray(parsed.personalMemories) ? parsed.personalMemories : (INITIAL_DATABASE_SCHEMA.personalMemories || []),
            personalKnowledgeStates: Array.isArray(parsed.personalKnowledgeStates) ? parsed.personalKnowledgeStates : (INITIAL_DATABASE_SCHEMA.personalKnowledgeStates || []),
            personalStudyNotes: Array.isArray(parsed.personalStudyNotes) ? parsed.personalStudyNotes : (INITIAL_DATABASE_SCHEMA.personalStudyNotes || []),
            personalFlashcards: Array.isArray(parsed.personalFlashcards) ? parsed.personalFlashcards : (INITIAL_DATABASE_SCHEMA.personalFlashcards || []),
            personalStudyPlans: Array.isArray(parsed.personalStudyPlans) ? parsed.personalStudyPlans : (INITIAL_DATABASE_SCHEMA.personalStudyPlans || []),
            activityTimeline: Array.isArray(parsed.activityTimeline) ? parsed.activityTimeline : (INITIAL_DATABASE_SCHEMA.activityTimeline || []),
            diagnosticSessions: Array.isArray(parsed.diagnosticSessions) ? parsed.diagnosticSessions : (INITIAL_DATABASE_SCHEMA.diagnosticSessions || []),
            knowledgeAssets: Array.isArray(parsed.knowledgeAssets) ? parsed.knowledgeAssets : (INITIAL_DATABASE_SCHEMA.knowledgeAssets || []),
            learnerExposures: Array.isArray(parsed.learnerExposures) ? parsed.learnerExposures : (INITIAL_DATABASE_SCHEMA.learnerExposures || []),
            authOtps: Array.isArray(parsed.authOtps) ? parsed.authOtps : []
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

  private getActiveState(): DatabaseSchema {
    const currentTx = transactionStorage.getStore();
    if (currentTx && this.transactionDepth > 0 && this.transactionStates.length > 0) {
      return this.transactionStates[this.transactionStates.length - 1];
    }
    return this.state;
  }

  getState(): DatabaseSchema {
    return this.getActiveState();
  }

  isTransactionActive(): boolean {
    return this.transactionDepth > 0;
  }

  beginTransaction(): void {
    if (this.transactionDepth === 0) {
      this.baseStates.push(JSON.parse(JSON.stringify(this.state)));
      this.transactionStates.push(JSON.parse(JSON.stringify(this.state)));
    } else {
      const parentState = this.transactionStates[this.transactionStates.length - 1];
      this.baseStates.push(JSON.parse(JSON.stringify(parentState)));
      this.transactionStates.push(JSON.parse(JSON.stringify(parentState)));
    }
    this.transactionDepth++;
  }

  rollbackTransaction(): void {
    if (this.transactionStates.length > 0) {
      this.transactionStates.pop();
    }
    if (this.baseStates.length > 0) {
      this.baseStates.pop();
    }
    this.transactionDepth = Math.max(0, this.transactionDepth - 1);
    if (this.transactionDepth === 0) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      if (this.isDirty) {
        this.flushInternal().catch((err) => {
          console.error('[JsonFileStore] Error flushing after rollback:', err);
        });
      }
    }
  }

  async commitTransaction(): Promise<void> {
    if (this.transactionStates.length === 0) {
      this.transactionDepth = Math.max(0, this.transactionDepth - 1);
      return;
    }

    const committedWorkingState = this.transactionStates.pop()!;
    const baseState = this.baseStates.pop()!;
    this.transactionDepth = Math.max(0, this.transactionDepth - 1);

    if (this.transactionDepth === 0) {
      this.state = mergeThreeWaySchemas(baseState, committedWorkingState, this.state);
      this.isDirty = true;
      await this.flushInternal();
    } else {
      const parentIdx = this.transactionStates.length - 1;
      const parentWorkingState = this.transactionStates[parentIdx];
      this.transactionStates[parentIdx] = mergeThreeWaySchemas(
        baseState,
        committedWorkingState,
        parentWorkingState
      );
    }
  }

  mutate<T>(fn: (state: DatabaseSchema) => T): T {
    const activeState = this.getActiveState();
    const result = fn(activeState);
    this.isDirty = true;
    this.scheduleAutoSave();
    return result;
  }

  private scheduleAutoSave(): void {
    if (this.transactionDepth > 0) return;
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      if (this.isDirty && this.transactionDepth === 0) {
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
    if (this.transactionDepth > 0) {
      // Stage in-memory during active transaction; flushed atomically on commit
      return;
    }
    return this.flushInternal();
  }

  private async flushInternal(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    if (this.pendingFlushPromise) {
      return this.pendingFlushPromise.then(() => {
        if (this.isDirty && this.transactionDepth === 0) {
          return this.flushInternal();
        }
      });
    }

    this.pendingFlushPromise = (async () => {
      this.isSaving = true;
      let tempFile: string | null = null;
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        tempFile = `${this.filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
        this.activeTempFile = tempFile;

        this.isDirty = false;
        const serialized = JSON.stringify(this.state, null, 2);

        await fs.promises.writeFile(tempFile, serialized, 'utf8');
        await fs.promises.rename(tempFile, this.filePath);
      } catch (err) {
        this.isDirty = true;
        if (tempFile) {
          try {
            if (fs.existsSync(tempFile)) {
              await fs.promises.unlink(tempFile);
            }
          } catch {}
        }
        throw err;
      } finally {
        this.isSaving = false;
        this.activeTempFile = null;
        this.pendingFlushPromise = null;
      }

      if (this.isDirty && this.transactionDepth === 0) {
        await this.flushInternal();
      }
    })();

    return this.pendingFlushPromise;
  }

  async reset(): Promise<void> {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
    await this.flush();
  }
}
