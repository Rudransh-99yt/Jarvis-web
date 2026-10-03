import React, { useState } from 'react';
import { Sparkles, Send, Brain, HelpCircle, CheckCircle, FileText, Zap, BookOpen } from 'lucide-react';
import type { EducationRole } from '../../../types/education.ts';

interface StudyAssistantViewProps {
  currentRole: EducationRole;
  onSendMessage: (message: string) => Promise<string>;
}

export const StudyAssistantView: React.FC<StudyAssistantViewProps> = ({ currentRole, onSendMessage }) => {
  const [activeMode, setActiveMode] = useState<'explain' | 'quiz' | 'summarize' | 'flashcards'>('explain');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `Greetings. I am your Jarvis Study Companion. I can provide grounded explanations, interactive problem quizzes, concise summaries, or formula flashcards for your coursework. What concept shall we analyze?`
    }
  ]);

  const modePresets = [
    {
      id: 'explain' as const,
      name: '1. Concept Explainer',
      icon: Brain,
      placeholder: 'e.g. Explain quantum ladder operators and how they derive energy eigenstates...',
      sample: 'Explain the physical intuition behind Green\'s Theorem and why it equates circulation to curl.'
    },
    {
      id: 'quiz' as const,
      name: '2. Practice Quiz',
      icon: HelpCircle,
      placeholder: 'e.g. Quiz me with 3 conceptual questions on wave-particle duality...',
      sample: 'Generate a 3-question practice quiz on Quantum Harmonic Oscillators with step-by-step solutions.'
    },
    {
      id: 'summarize' as const,
      name: '3. Document Summarizer',
      icon: FileText,
      placeholder: 'e.g. Summarize the key theorems of multivariable vector calculus...',
      sample: 'Summarize the four Maxwell equations and their physical interpretations in differential form.'
    },
    {
      id: 'flashcards' as const,
      name: '4. Formula Flashcards',
      icon: Zap,
      placeholder: 'e.g. Create rapid-recall flashcards for Schrödinger equation operators...',
      sample: 'Create 4 flashcards for Stokes theorem and Divergence theorem parameterizations.'
    }
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const prompt = text.trim();
    setInputQuery('');
    setConversation((prev) => [...prev, { role: 'user', content: prompt }]);
    setIsLoading(true);

    try {
      const response = await onSendMessage(prompt);
      setConversation((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: 'Apologies, I encountered an issue retrieving that study synthesis. Please retry.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentPreset = modePresets.find((m) => m.id === activeMode)!;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-cyan-500/20 bg-black/40 p-4 rounded-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            Jarvis Academic // Interactive Study AI Companion
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            AI Study Partner & Curriculum Tutor
          </h1>
        </div>

        <div className="text-xs font-mono text-cyan-400/70">
          Role: <strong className="text-cyan-300 uppercase">{currentRole} Mode</strong>
        </div>
      </div>

      {/* Mode Selector Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {modePresets.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === activeMode;

          return (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setInputQuery(mode.sample);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/60 to-black/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'border-cyan-500/15 bg-black/30 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-cyan-400/70'}`} />
                <span className={`text-xs font-bold font-mono ${isActive ? 'text-white' : 'text-cyan-200'}`}>
                  {mode.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Conversation Container */}
      <div className="rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col h-[520px]">
        {/* Chat History Messages */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}

              <div
                className={`p-4 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-line max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-400/40 text-white self-end'
                    : 'bg-black/60 border border-cyan-500/20 text-cyan-100/90'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              </div>
              <div className="p-3.5 rounded-xl bg-black/60 border border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                Jarvis is synthesizing study curriculum...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-cyan-500/20 bg-black/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputQuery);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={currentPreset.placeholder}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 rounded-lg border border-cyan-500/30 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-cyan-400/40 outline-none focus:border-cyan-400 font-mono"
            />

            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              ASK JARVIS
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
