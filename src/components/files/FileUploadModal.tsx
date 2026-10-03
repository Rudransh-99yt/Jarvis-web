import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Tag
} from 'lucide-react';
import type { FileRecord } from '../../types/storage.ts';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (file: FileRecord) => void;
  workspaceId?: string;
  defaultAssociations?: {
    classId?: string;
    assignmentId?: string;
    submissionId?: string;
    knowledgeSpaceId?: string;
    researchProjectId?: string;
  };
  title?: string;
  description?: string;
}

export function FileUploadModal({
  isOpen,
  onClose,
  onSuccess,
  workspaceId = 'ws-stark-core',
  defaultAssociations = {},
  title = 'Upload Material / Attachment',
  description = 'Store files securely in the Jarvis unified vault with full encryption and access control.'
}: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'validating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit client-side before reading
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Selected file exceeds maximum allowed limit of 25 MB.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('Dropped file exceeds maximum allowed limit of 25 MB.');
        return;
      }
      setErrorMessage(null);
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setErrorMessage(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const base64Data = await base64Promise;

      setStatus('validating');

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalName: selectedFile.name,
          mimeType: selectedFile.type,
          base64Data,
          workspaceId,
          classId: defaultAssociations.classId,
          assignmentId: defaultAssociations.assignmentId,
          submissionId: defaultAssociations.submissionId,
          knowledgeSpaceId: defaultAssociations.knowledgeSpaceId,
          researchProjectId: defaultAssociations.researchProjectId,
          description: fileDescription.trim(),
          tags,
          isPublicInWorkspace: isPublic
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed.');
      }

      setStatus('success');
      setTimeout(() => {
        onSuccess(result.file);
        handleClose();
      }, 700);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'File upload encountered an unexpected error.');
    }
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileDescription('');
    setTagsInput('');
    setStatus('idle');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-xl border border-cyan-500/30 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/50 flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 text-cyan-400">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-mono tracking-wider text-white uppercase">{title}</h2>
              <p className="text-[11px] text-slate-400">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
            selectedFile
              ? 'border-cyan-500/60 bg-cyan-950/20'
              : 'border-cyan-500/30 bg-slate-900/50 hover:border-cyan-500/60 hover:bg-slate-900'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.docx"
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative h-28 w-28 rounded-lg overflow-hidden border border-cyan-500/40 shadow-md">
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            </div>
          ) : selectedFile ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/80 text-cyan-300">
              <FileText className="h-7 w-7" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-950/50 text-cyan-400">
              <UploadCloud className="h-6 w-6" />
            </div>
          )}

          <div>
            {selectedFile ? (
              <div>
                <p className="text-xs font-mono font-medium text-cyan-300">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Custom Type'}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-slate-200">
                  Click or drag and drop file to upload
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Supported: PDF, PNG, JPEG, WebP, Text, Markdown, DOCX (Max 25 MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/40 p-2.5 text-xs text-red-200 font-mono">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Optional Metadata Fields */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              placeholder="e.g. Chapter 4 Practice Set & Solutions"
              className="w-full rounded border border-cyan-500/20 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-cyan-400" /> Tags (Comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Physics, Homework, Unit 1"
              className="w-full rounded border border-cyan-500/20 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-cyan-500/40 bg-slate-900 text-cyan-500 focus:ring-0"
            />
            <label htmlFor="isPublic" className="text-[11px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer">
              <Lock className="h-3 w-3 text-cyan-400" /> Visible to authorized workspace members
            </label>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between border-t border-cyan-500/20 pt-4 mt-1">
          <div className="text-[11px] font-mono text-slate-400">
            {status === 'uploading' && <span className="flex items-center gap-1.5 text-cyan-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading bytes...</span>}
            {status === 'validating' && <span className="flex items-center gap-1.5 text-cyan-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying signature...</span>}
            {status === 'success' && <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Stored in vault!</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={status === 'uploading' || status === 'validating'}
              className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || status === 'uploading' || status === 'validating'}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded border border-cyan-500/50 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-semibold text-xs hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              {status === 'uploading' || status === 'validating' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
              Upload to Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
