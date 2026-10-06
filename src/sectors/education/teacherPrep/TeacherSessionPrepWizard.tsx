import React, { useState } from 'react';
import type {
  ClassSession,
  DesiredOutputsConfig,
  SourceMaterialRef,
  SessionLessonPlan,
  SessionPresentation,
  SessionQuiz,
  SessionFlashcards,
  SessionHomework,
  SessionTeacherNotes
} from '../../../types/classSession.ts';
import type { EducationClass } from '../../../types/education.ts';
import { authClient } from '../../../services/authClient.ts';

import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers,
  FileCheck2,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  FileText,
  HelpCircle,
  ShieldCheck,
  Calendar,
  PlayCircle,
  RotateCcw,
  Eye,
  Lock,
  Globe,
  Radio,
  ExternalLink,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';

interface TeacherSessionPrepWizardProps {
  classes: EducationClass[];
  existingSession?: ClassSession | null;
  onBackToList: () => void;
  onSessionSaved?: (session: ClassSession) => void;
  onLaunchSmartboard?: (sessionId: string) => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const TeacherSessionPrepWizard: React.FC<TeacherSessionPrepWizardProps> = ({
  classes,
  existingSession,
  onBackToList,
  onSessionSaved,
  onLaunchSmartboard,
  onNavigateToContext
}) => {
  // Wizard Steps: 1: Context -> 2: Sources -> 3: Config -> 4: Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    existingSession && existingSession.status !== 'DRAFT' ? 4 : 1
  );

  // Form State
  const [selectedClassId, setSelectedClassId] = useState<string>(
    existingSession?.classId || classes[0]?.id || 'class-phys-301'
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(existingSession?.unitId || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(existingSession?.lessonId || '');
  const [topic, setTopic] = useState<string>(
    existingSession?.topic || 'Electrostatics & Gauss Surface Flux'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    existingSession?.durationMinutes || 45
  );
  const [scheduledAt, setScheduledAt] = useState<string>(
    existingSession?.scheduledAt || new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );

  // Source Materials State
  const [sources, setSources] = useState<SourceMaterialRef[]>(
    existingSession?.sourceMaterials || [
      {
        id: 'src-1',
        title: 'NCERT Physics Class 12 - Chapter 1: Electric Charges and Fields.pdf',
        type: 'ncert_pdf',
        fileSize: '4.2 MB',
        pageCount: 38,
        extractedTextSnippet:
          'Coulomb’s Law states that force between two point charges q1 and q2 varies inversely with square of distance r and directly as product of their magnitudes: F = (1 / 4πε₀) · (|q1 q2| / r²). Gauss’s Law gives the total electric flux through a closed surface S equal to q_enclosed / ε₀.',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'src-2',
        title: 'CBSE & National Board Past Year Question Paper (2024-2025).pdf',
        type: 'question_paper',
        fileSize: '1.8 MB',
        pageCount: 12,
        extractedTextSnippet:
          'Section B (3 Marks): Derive the expression for electric field intensity due to an infinitely long straight uniformly charged wire using Gauss theorem. State the direction of the field vector.',
        uploadedAt: new Date().toISOString()
      }
    ]
  );

  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceMaterialRef['type']>('teacher_notes');
  const [newSourceText, setNewSourceText] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Output Configuration State
  const [desiredOutputs, setDesiredOutputs] = useState<DesiredOutputsConfig>(
    existingSession?.generationConfig?.desiredOutputs || {
      lessonPlan: true,
      presentation: true,
      quiz: true,
      flashcards: true,
      homework: true,
      teacherNotes: true,
      studentNotes: true,
      answerKey: true
    }
  );

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [carryForwardSignals, setCarryForwardSignals] = useState<any[]>([]);

  // Load Carry-Forward Signals from Classroom Intelligence
  React.useEffect(() => {
    let isMounted = true;
    fetch(`/api/education/intelligence/classes/${selectedClassId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.intelligence?.recommendedNextLessonActions) {
          setCarryForwardSignals(data.intelligence.recommendedNextLessonActions);
        }
      })
      .catch((err) => console.warn('Could not load carry-forward signals:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedClassId]);

  // Active Session Object State
  const [activeSession, setActiveSession] = useState<ClassSession | null>(existingSession || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');

  // Review Workspace Active Tab
  const [activeReviewTab, setActiveReviewTab] = useState<
    'lessonPlan' | 'presentation' | 'quiz' | 'flashcards' | 'homework' | 'teacherNotes' | 'studentMaterials' | 'answerKey'
  >('lessonPlan');

  // Regenerate Section Modal
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [sectionPromptTweak, setSectionPromptTweak] = useState('');

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Handler: Add Source Material
  const handleAddSource = () => {
    if (!newSourceTitle.trim()) return;
    const newRef: SourceMaterialRef = {
      id: `src-${Date.now()}`,
      title: newSourceTitle.trim(),
      type: newSourceType,
      fileSize: '0.8 MB',
      pageCount: 4,
      extractedTextSnippet: newSourceText.slice(0, 250) || 'Text extracted from source document.',
      rawText: newSourceText,
      uploadedAt: new Date().toISOString()
    };
    setSources((prev) => [...prev, newRef]);
    setNewSourceTitle('');
    setNewSourceText('');
    setIsAddingSource(false);
  };

  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  // Handler: Execute Server Generation Pipeline
  const handleTriggerGeneration = async () => {
    setIsGenerating(true);
    setGenerationStepText('Ingesting and parsing source materials...');

    try {
      // 1. Create Draft Session on Server
      const createRes = await fetch('/api/education/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass.id,
          topic,
          unitId: selectedUnitId,
          lessonId: selectedLessonId,
          durationMinutes,
          generationConfig: {
            targetDurationMinutes: durationMinutes,
            targetGradeLevel: selectedClass.gradeLevel || 'Grade 12',
            desiredOutputs,
            customInstructions: customPrompt
          }
        })
      });

      const createData = await createRes.json();
      const session = createData.session as ClassSession;

      // 2. Attach Sources
      for (const src of sources) {
        await fetch(`/api/education/sessions/${session.id}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(src)
        });
      }

      setGenerationStepText('Grounded RAG retrieval & pedagogical structuring...');

      // 3. Trigger Generation Pipeline
      const genRes = await fetch(`/api/education/sessions/${session.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desiredOutputs,
          customInstructions: customPrompt
        })
      });

      const genData = await genRes.json();
      setActiveSession(genData.session);
      if (onSessionSaved) onSessionSaved(genData.session);

      setCurrentStep(4);
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Regenerate Single Section
  const handleRegenerateSingleSection = async (sectionName: string) => {
    if (!activeSession) return;
    setIsGenerating(true);
    setGenerationStepText(`Regenerating ${sectionName}...`);

    try {
      const res = await fetch(`/api/education/sessions/${activeSession.id}/regenerate-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName,
          customPrompt: sectionPromptTweak
        })
      });

      const data = await res.json();
      setActiveSession(data.session);
      if (onSessionSaved) onSessionSaved(data.session);
      setRegeneratingSection(null);
      setSectionPromptTweak('');
    } catch (err) {
      console.error('Section regeneration failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Approve Single Section
  const handleApproveSection = async (section: string) => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/education/sessions/${activeSession.id}/approve-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section })
      });
      const data = await res.json();
      setActiveSession(data.session);
      if (onSessionSaved) onSessionSaved(data.session);
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  // Handler: Approve All Sections & Mark Approved
  const handleApproveAll = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/education/sessions/${activeSession.id}/approve-all`, {
        method: 'POST'
      });
      const data = await res.json();
      setActiveSession(data.session);
      if (onSessionSaved) onSessionSaved(data.session);
    } catch (err) {
      console.error('Approve all failed:', err);
    }
  };

  // Handler: Schedule Session
  const handleSchedule = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/education/sessions/${activeSession.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt })
      });
      const data = await res.json();
      setActiveSession(data.session);
      if (onSessionSaved) onSessionSaved(data.session);
    } catch (err) {
      console.error('Schedule failed:', err);
    }
  };

  // Handler: Toggle Release Control for Students
  const handleToggleRelease = async (key: keyof ClassSession['releaseControls']) => {
    if (!activeSession) return;
    const updatedVal = !activeSession.releaseControls[key];
    try {
      const res = await fetch(`/api/education/sessions/${activeSession.id}/release-controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: updatedVal })
      });
      const data = await res.json();
      setActiveSession(data.session);
      if (onSessionSaved) onSessionSaved(data.session);
    } catch (err) {
      console.error('Release toggle failed:', err);
    }
  };

  // Phase D: Connect across Education OS (Link All Objects)
  const [isLinkingAll, setIsLinkingAll] = useState(false);
  const [linkSuccessMessage, setLinkSuccessMessage] = useState<string | null>(null);

  const handleLinkAll = async () => {
    if (!activeSession) return;
    setIsLinkingAll(true);
    try {
      const res = await fetch(`/api/education/integration/sessions/${activeSession.id}/link-all`, {
        method: 'POST',
        headers: { ...authClient.getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        if (onSessionSaved) onSessionSaved(data.session);
        setLinkSuccessMessage('✓ All Academic Objects Connected: Workspace Page, Quiz, Assignment & Community Discussion linked!');
        setTimeout(() => setLinkSuccessMessage(null), 6000);
      }
    } catch (err) {
      console.error('Link all failed:', err);
    } finally {
      setIsLinkingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Header & Step Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Prepared Sessions</span>
          </button>
          <span aria-hidden="true" className="text-cyan-500/30">|</span>
          <div className="text-xs font-mono text-cyan-300 font-bold truncate max-w-[240px]">
            {topic || 'New Class Session'}
          </div>
        </div>

        {/* Wizard Stepper Progress */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {[
            { step: 1, label: 'Context' },
            { step: 2, label: 'Sources' },
            { step: 3, label: 'Outputs' },
            { step: 4, label: 'Review' }
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => {
                if (s.step <= currentStep || (activeSession && s.step === 4)) {
                  setCurrentStep(s.step as any);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                currentStep === s.step
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                  : currentStep > s.step
                  ? 'bg-white/5 border-cyan-500/20 text-cyan-400/70 hover:text-white'
                  : 'bg-transparent border-transparent text-cyan-400/40 opacity-50 cursor-not-allowed'
              }`}
            >
              <span>{s.step}.</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Loading State Overlay */}
      {isGenerating && (
        <div className="p-8 rounded-2xl bg-black/80 border border-cyan-400/40 backdrop-blur-xl text-center space-y-4 animate-fade-in shadow-2xl">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-cyan-300 absolute inset-0 m-auto" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-mono">Jarvis AI Preparation Pipeline Active</h2>
            <p className="text-xs text-cyan-300/80 font-mono mt-1">{generationStepText}</p>
          </div>
        </div>
      )}

      {/* 3. STEP 1: CONTEXT & CLASS SELECTION */}
      {!isGenerating && currentStep === 1 && (
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-cyan-500/20 space-y-6">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              Step 1 · Academic Target & Timetable
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Class & Curriculum Context
            </h2>
            <p className="text-xs text-cyan-100/70 font-mono mt-0.5">
              Select the course, syllabus unit, and session schedule for AI instructional planning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-cyan-300 font-semibold">Enrolled Course</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  const cls = classes.find((c) => c.id === e.target.value);
                  if (cls?.units && cls.units.length > 0) {
                    setSelectedUnitId(cls.units[0].id);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} · {cls.name} ({cls.term})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-cyan-300 font-semibold">Target Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value={45}>45 Minutes (Standard Class)</option>
                <option value={60}>60 Minutes (Block Period)</option>
                <option value={90}>90 Minutes (Laboratory / Double Period)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-cyan-300 font-semibold">Session Topic / Learning Focus</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Electrostatics & Gauss Surface Flux"
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-cyan-300 font-semibold">Scheduled Classroom Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-4 border-t border-cyan-500/10 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
            >
              <span>Next: Source Materials</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. STEP 2: SOURCE MATERIALS & GROUNDING EVIDENCE */}
      {!isGenerating && currentStep === 2 && (
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-cyan-500/20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
                Step 2 · Grounding & Evidence Documents
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Curriculum Source Materials
              </h2>
              <p className="text-xs text-cyan-100/70 font-mono mt-0.5">
                Attach textbooks, NCERT chapters, previous year question papers, or lecture notes to ground the AI.
              </p>
            </div>

            <button
              onClick={() => setIsAddingSource(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-500/30 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attach Material</span>
            </button>
          </div>

          {/* Add Source Drawer / Form */}
          {isAddingSource && (
            <div className="p-4 rounded-xl bg-black/50 border border-cyan-500/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300">Attach Source Document</span>
                <button
                  onClick={() => setIsAddingSource(false)}
                  className="text-xs font-mono text-cyan-400/60 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Document Title (e.g. NCERT Physics Ch 1.pdf)"
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white text-xs font-mono"
                />

                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value as any)}
                  className="px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white text-xs font-mono"
                >
                  <option value="ncert_pdf">NCERT Chapter PDF</option>
                  <option value="question_paper">Past Year Question Paper</option>
                  <option value="worksheet">Practice Worksheet</option>
                  <option value="teacher_notes">Teacher Lecture Notes</option>
                  <option value="curriculum_doc">Curriculum Document</option>
                </select>
              </div>

              <textarea
                rows={3}
                placeholder="Paste key textbook excerpts, formulas, or question prompts for RAG ingestion..."
                value={newSourceText}
                onChange={(e) => setNewSourceText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white text-xs font-mono"
              />

              <button
                onClick={handleAddSource}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400/50 text-white text-xs font-mono font-bold hover:bg-cyan-500/40 cursor-pointer"
              >
                Add to Grounding Context
              </button>
            </div>
          )}

          {/* Source List */}
          <div className="space-y-2">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-3 rounded-xl bg-black/40 border border-cyan-500/15 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{src.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                        {src.type}
                      </span>
                    </div>
                    {src.extractedTextSnippet && (
                      <p className="text-[11px] text-cyan-100/70 font-mono mt-1 line-clamp-2">
                        "{src.extractedTextSnippet}"
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveSource(src.id)}
                  className="p-1 text-rose-400/70 hover:text-rose-300 cursor-pointer"
                  title="Remove Source"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-cyan-500/10 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
            >
              <span>Next: Select Outputs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. STEP 3: OUTPUT COMPONENTS & GENERATION */}
      {!isGenerating && currentStep === 3 && (
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-cyan-500/20 space-y-6">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              Step 3 · Instructional Package Deliverables
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Select Desired Outputs
            </h2>
            <p className="text-xs text-cyan-100/70 font-mono mt-0.5">
              Choose which components Jarvis should generate from the attached curriculum sources.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                key: 'lessonPlan',
                label: 'Structured Lesson Plan',
                desc: 'Objectives, warmup, 4-stage sequence, worked examples, and exit ticket.'
              },
              {
                key: 'presentation',
                label: 'SmartBoard Presentation Deck',
                desc: 'Slide outlines with diagram prompts, formulas, and teacher pacing tips.'
              },
              {
                key: 'quiz',
                label: 'Grounded Formative Quiz',
                desc: 'MCQ, Numerical, and Short Answer questions with explanations & citations.'
              },
              {
                key: 'flashcards',
                label: 'Concept Flashcards',
                desc: 'Quick recall cards for key definitions, formulas, and SI dimensions.'
              },
              {
                key: 'homework',
                label: 'Homework Problem Set',
                desc: 'Multi-tiered practice questions with rubrics and point allocations.'
              },
              {
                key: 'teacherNotes',
                label: 'Teacher Blueprint & Blackboard Layout',
                desc: '3-panel chalk plan, pacing advice, and required laboratory apparatus.'
              },
              {
                key: 'studentNotes',
                label: 'Student Handout & Formula Sheet',
                desc: 'Markdown summary sheet ready for student workspace distribution.'
              },
              {
                key: 'answerKey',
                label: 'Step-by-Step Answer Key (Teacher Only)',
                desc: 'Protected solutions & marking criteria strictly hidden from students.'
              }
            ].map((item) => (
              <label
                key={item.key}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  (desiredOutputs as any)[item.key]
                    ? 'bg-cyan-950/40 border-cyan-400/50 text-white'
                    : 'bg-black/20 border-cyan-500/10 text-cyan-300/60 hover:bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={(desiredOutputs as any)[item.key]}
                  onChange={(e) =>
                    setDesiredOutputs((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked
                    }))
                  }
                  className="mt-1 rounded accent-cyan-400"
                />
                <div>
                  <div className="text-xs font-mono font-bold">{item.label}</div>
                  <div className="text-[11px] font-mono text-cyan-200/60 mt-0.5">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Carry-Forward Signals from Previous Sessions */}
          {carryForwardSignals.length > 0 && (
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Carry-Forward Teaching Signals (from Prior Class)</span>
              </div>
              <div className="space-y-1.5">
                {carryForwardSignals.map((sig, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/40 border border-purple-500/15 text-xs font-mono">
                    <div className="space-y-0.5">
                      <div className="text-white font-bold">Revisit: {sig.concept}</div>
                      <div className="text-[10px] text-purple-200/70">{sig.reason}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const directive = `Include 5-min recap on ${sig.concept} and reference board derivation.`;
                        setCustomPrompt((prev) => (prev ? `${prev} ${directive}` : directive));
                      }}
                      className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-mono font-bold border border-purple-400/30 transition-all cursor-pointer shrink-0"
                    >
                      + Include in Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-cyan-300 font-semibold">
              Optional Teacher Custom Directives
            </label>
            <input
              type="text"
              placeholder="e.g. Emphasize Gauss cylinder boundary integration and include 2 past year board numericals."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-4 border-t border-cyan-500/10 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleTriggerGeneration}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-600/30 border border-cyan-400/60 hover:from-cyan-500/40 hover:to-blue-600/40 text-white text-xs font-mono font-bold tracking-wider transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Generate Class Session Draft</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. STEP 4: TEACHER REVIEW & APPROVAL WORKSPACE */}
      {!isGenerating && currentStep === 4 && activeSession && (
        <div className="space-y-6">
          {/* Top Session Status & Action Controls */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold">{activeSession.courseCode}</span>
                <span aria-hidden="true" className="text-cyan-500/30">·</span>
                <span className="text-white font-semibold">{activeSession.topic}</span>
                <span aria-hidden="true" className="text-cyan-500/30">·</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/40 text-cyan-300">
                  {activeSession.status}
                </span>
              </div>
              <div className="text-[11px] font-mono text-cyan-400/60 mt-1">
                Teacher Review Canvas · Modify, regenerate, or approve individual instructional sections.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleApproveAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve All</span>
              </button>

              <button
                onClick={handleSchedule}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Session</span>
              </button>

              {onLaunchSmartboard && (
                <button
                  onClick={() => onLaunchSmartboard(activeSession.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-400/20 border border-cyan-300/50 hover:bg-cyan-400/30 text-white text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Launch on SmartBoard</span>
                </button>
              )}

              <button
                onClick={handleLinkAll}
                disabled={isLinkingAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/50 hover:bg-indigo-500/30 text-indigo-300 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isLinkingAll ? 'Connecting OS...' : 'Connect to Education OS'}</span>
              </button>
            </div>
          </div>

          {/* Success Message Banner */}
          {linkSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{linkSuccessMessage}</span>
              </div>
              <button onClick={() => setLinkSuccessMessage(null)} className="text-emerald-400/70 hover:text-white">✕</button>
            </div>
          )}

          {/* Phase D: Connected Learning Objects Navigation Strip */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/25 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">Connected Hub:</span>
              <span className="text-cyan-100/70 text-[11px]">Jump to linked learning surfaces</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {onNavigateToContext && (
                <>
                  <button
                    onClick={() =>
                      onNavigateToContext('workspace', {
                        classId: activeSession.classId,
                        courseCode: activeSession.courseCode,
                        classSessionId: activeSession.id
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/40 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 text-[11px] cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span>Workspace Notes</span>
                  </button>

                  <button
                    onClick={() =>
                      onNavigateToContext('classroom', {
                        classId: activeSession.classId,
                        classSessionId: activeSession.id
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-950/40 border border-blue-500/30 hover:border-blue-400 text-blue-300 text-[11px] cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3 text-blue-400" />
                    <span>Interactive Quiz</span>
                  </button>

                  <button
                    onClick={() =>
                      onNavigateToContext('assignments', {
                        classId: activeSession.classId,
                        classSessionId: activeSession.id
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 text-[11px] cursor-pointer"
                  >
                    <FileCheck2 className="w-3 h-3 text-emerald-400" />
                    <span>Assignment</span>
                  </button>

                  <button
                    onClick={() =>
                      onNavigateToContext('community', {
                        classId: activeSession.classId,
                        classSessionId: activeSession.id
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 text-[11px] cursor-pointer"
                  >
                    <Globe className="w-3 h-3 text-indigo-400" />
                    <span>Community Discussion</span>
                  </button>

                  <button
                    onClick={() =>
                      onNavigateToContext('focus', {
                        classId: activeSession.classId,
                        classSessionId: activeSession.id,
                        topic: activeSession.topic
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-[11px] cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Focus Prep</span>
                  </button>

                  <button
                    onClick={() => onNavigateToContext('calendar')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/40 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 text-[11px] cursor-pointer"
                  >
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    <span>Calendar</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono custom-scrollbar">
            {[
              { key: 'lessonPlan', label: 'Lesson Plan', hasItem: !!activeSession.lessonPlan },
              { key: 'presentation', label: 'Presentation Deck', hasItem: !!activeSession.presentation },
              { key: 'quiz', label: 'Interactive Quiz', hasItem: !!activeSession.quiz },
              { key: 'flashcards', label: 'Flashcards', hasItem: !!activeSession.flashcards },
              { key: 'homework', label: 'Homework Set', hasItem: !!activeSession.homework },
              { key: 'teacherNotes', label: 'Teacher Blueprint', hasItem: !!activeSession.teacherNotes },
              { key: 'studentMaterials', label: 'Student Notes', hasItem: !!activeSession.studentMaterials },
              { key: 'answerKey', label: 'Answer Key (Teacher Only)', hasItem: !!activeSession.answerKey }
            ].map((tab) => {
              if (!tab.hasItem) return null;
              const isActive = activeReviewTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveReviewTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                      : 'bg-black/30 border-cyan-500/15 text-cyan-300/70 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Review Canvas Body */}
          <div className="p-6 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-6">
            {/* Section Header Controls */}
            <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  {activeReviewTab === 'lessonPlan' && 'Curriculum Lesson Plan'}
                  {activeReviewTab === 'presentation' && 'SmartBoard Slide Sequence'}
                  {activeReviewTab === 'quiz' && 'Interactive Formative Quiz'}
                  {activeReviewTab === 'flashcards' && 'Concept Recall Flashcards'}
                  {activeReviewTab === 'homework' && 'Assigned Homework & Practice'}
                  {activeReviewTab === 'teacherNotes' && 'Teacher Blackboard Layouts & Pacing'}
                  {activeReviewTab === 'studentMaterials' && 'Student Reference Materials'}
                  {activeReviewTab === 'answerKey' && '🔒 Protected Teacher Answer Key'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRegeneratingSection(activeReviewTab)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-cyan-900/50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate Section</span>
                </button>

                <button
                  onClick={() => handleApproveSection(activeReviewTab)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono hover:bg-emerald-900/50 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Section</span>
                </button>
              </div>
            </div>

            {/* TAB 1: LESSON PLAN */}
            {activeReviewTab === 'lessonPlan' && activeSession.lessonPlan && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-2">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase">Learning Objectives</h3>
                  <ul className="list-disc list-inside text-xs font-mono text-cyan-100/90 space-y-1">
                    {activeSession.lessonPlan.learningObjectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>

                {/* 4-Stage Teaching Sequence */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Instructional Timeline & Checkpoints
                  </h3>
                  <div className="space-y-2.5">
                    {activeSession.lessonPlan.teachingSequence.map((seq, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/15 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white">{seq.stage}</span>
                          <span className="text-[10px] font-mono text-cyan-400/70">
                            {seq.durationMinutes} mins
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-2 rounded-lg bg-black/30 text-cyan-200">
                            <span className="text-cyan-400 font-bold block mb-0.5">Teacher Activity:</span>
                            {seq.teacherActivity}
                          </div>
                          <div className="p-2 rounded-lg bg-black/30 text-cyan-200">
                            <span className="text-cyan-400 font-bold block mb-0.5">Student Activity:</span>
                            {seq.studentActivity}
                          </div>
                        </div>
                        <div className="text-[11px] font-mono text-amber-300/90 pt-1">
                          ⚡ Mastery Checkpoint: {seq.checkPoint}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Worked Examples */}
                {activeSession.lessonPlan.workedExamples && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Worked Examples & Derivations
                    </h3>
                    {activeSession.lessonPlan.workedExamples.map((ex, i) => (
                      <div key={i} className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/15 space-y-2 text-xs font-mono">
                        <div className="font-bold text-cyan-300">Problem {i + 1}: {ex.problem}</div>
                        <div className="p-3 rounded-lg bg-black/40 text-cyan-100/90 whitespace-pre-line">
                          {ex.solution}
                        </div>
                        <div className="text-emerald-400 text-[11px]">
                          Key Intuition: {ex.keyIntuition}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PRESENTATION DECK */}
            {activeReviewTab === 'presentation' && activeSession.presentation && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSession.presentation.slides.map((slide) => (
                    <div
                      key={slide.id}
                      className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                            Slide {slide.slideNumber}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400/60">SmartBoard</span>
                        </div>
                        <h4 className="text-sm font-bold text-white font-mono">{slide.title}</h4>
                        <ul className="list-disc list-inside text-xs font-mono text-cyan-200/80 space-y-1">
                          {slide.bulletPoints.map((bp, i) => (
                            <li key={i}>{bp}</li>
                          ))}
                        </ul>
                        {slide.latexFormula && (
                          <div className="p-2 rounded-lg bg-black/40 text-xs font-mono text-amber-300">
                            {slide.latexFormula}
                          </div>
                        )}
                      </div>

                      {slide.visualInstruction && (
                        <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/15 text-[11px] font-mono text-cyan-300/80">
                          📐 Diagram: {slide.visualInstruction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: INTERACTIVE QUIZ */}
            {activeReviewTab === 'quiz' && activeSession.quiz && (
              <div className="space-y-4">
                {activeSession.quiz.questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">Q{q.questionNumber}.</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 uppercase">
                          {q.type}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400/60">
                          {q.points} pt{q.points === 1 ? '' : 's'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400/50">
                        {q.sourceReference || 'NCERT Physics'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white font-mono">{q.question}</p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        {q.options.map((opt, idx) => {
                          const optLetter = String.fromCharCode(65 + idx);
                          const isCorrect = q.correctAnswer === optLetter || q.correctAnswer === opt;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg border ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                                  : 'bg-black/30 border-cyan-500/15 text-cyan-200'
                              }`}
                            >
                              <span className="text-cyan-400 mr-2">{optLetter})</span>
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-black/40 text-[11px] font-mono text-cyan-200">
                      <span className="text-emerald-400 font-bold">Answer Explanation:</span> {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: FLASHCARDS */}
            {activeReviewTab === 'flashcards' && activeSession.flashcards && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeSession.flashcards.cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                        {card.category || 'Concept'}
                      </span>
                      <h4 className="text-xs font-bold text-white font-mono mt-2">{card.front}</h4>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 text-[11px] font-mono text-cyan-100/80 whitespace-pre-line border-t border-cyan-500/10">
                      {card.back}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 5: HOMEWORK */}
            {activeReviewTab === 'homework' && activeSession.homework && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-black/30 border border-cyan-500/15 flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300">
                    Total Questions: {activeSession.homework.questions.length} | Marks: {activeSession.homework.totalMarks}
                  </span>
                  <button
                    onClick={() => handleToggleRelease('homeworkReleased')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono cursor-pointer ${
                      activeSession.releaseControls.homeworkReleased
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-cyan-500/20 text-cyan-400'
                    }`}
                  >
                    {activeSession.releaseControls.homeworkReleased ? (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>Released to Students</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Held in Draft</span>
                      </>
                    )}
                  </button>
                </div>

                {activeSession.homework.questions.map((hw) => (
                  <div key={hw.id} className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Problem {hw.questionNumber} ({hw.type})</span>
                      <span className="text-cyan-400 font-bold">{hw.marks} Marks</span>
                    </div>
                    <p className="text-cyan-100/90">{hw.prompt}</p>
                    {hw.rubric && (
                      <div className="text-[11px] text-amber-300/80 pt-1">
                        Rubric: {hw.rubric}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 6: TEACHER NOTES */}
            {activeReviewTab === 'teacherNotes' && activeSession.teacherNotes && (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-2">
                  <h4 className="font-bold text-cyan-300 uppercase">Classroom Pacing Tips</h4>
                  <ul className="list-disc list-inside space-y-1 text-cyan-100/90">
                    {activeSession.teacherNotes.pacingTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-2">
                  <h4 className="font-bold text-cyan-300 uppercase">3-Panel Blackboard Layout Plan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {activeSession.teacherNotes.blackboardLayouts.map((board, i) => (
                      <div key={i} className="p-3 rounded-lg bg-black/40 border border-cyan-500/15 text-cyan-200">
                        {board}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: STUDENT MATERIALS */}
            {activeReviewTab === 'studentMaterials' && activeSession.studentMaterials && (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-2">
                  <h4 className="font-bold text-cyan-300 uppercase">Student Handout Markdown</h4>
                  <pre className="p-3 rounded-lg bg-black/40 text-cyan-100/90 whitespace-pre-wrap font-mono">
                    {activeSession.studentMaterials.handoutMarkdown}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 8: ANSWER KEY (TEACHER ONLY) */}
            {activeReviewTab === 'answerKey' && activeSession.answerKey && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>Confidential Teacher Answer Key · Server-side protected and never served to students.</span>
                </div>

                {activeSession.answerKey.homeworkSolutions.map((sol, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-2 text-xs font-mono">
                    <span className="font-bold text-white">Solution for Problem #{i + 1}</span>
                    <p className="text-cyan-100/90 whitespace-pre-line">{sol.stepByStepSolution}</p>
                    <div className="text-emerald-400 font-bold">Final Answer: {sol.finalAnswer}</div>
                    <div className="text-[11px] text-amber-300/80">Marking Rule: {sol.markingCriteria}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Regenerate Section Modal */}
      {regeneratingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300">
                Regenerate {regeneratingSection}
              </span>
              <button
                onClick={() => setRegeneratingSection(null)}
                className="text-cyan-400/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-mono text-cyan-100/70">
              Provide specific directives or adjustments for this section. Jarvis will preserve other approved sections.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Include 2 more past-year exam questions on cylinder Gauss surfaces..."
              value={sectionPromptTweak}
              onChange={(e) => setSectionPromptTweak(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRegeneratingSection(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-400/70 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRegenerateSingleSection(regeneratingSection)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400/50 text-white text-xs font-mono font-bold hover:bg-cyan-500/40 cursor-pointer"
              >
                Regenerate Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
