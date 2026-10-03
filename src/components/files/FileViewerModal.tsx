import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  HardDrive,
  Hash,
  Database,
  Loader2,
  Trash2
} from 'lucide-react';
import type { FileRecord } from '../../types/storage.ts';

interface FileViewerModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (fileId: string) => void;
  canDelete?: boolean;
}

export function FileViewerModal({
  file,
  isOpen,
  onClose,
  onDelete,
  canDelete = false
}: FileViewerModalProps) {
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'ingesting' | 'done' | 'error'>('idle');
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  const isImage = file.mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(file.extension);
  const isPdf = file.mimeType === 'application/pdf' || file.extension === 'pdf';
  const downloadUrl = `/api/files/${file.id}/download`;
  const inlineUrl = `/api/files/${file.id}/download?inline=true`;

  const formatSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleIngest = async () => {
    if (!file.knowledgeSpaceId && !file.classId) {
      setIngestMsg('Please associate file with a Knowledge Space first.');
      return;
    }
    const targetSpace = file.knowledgeSpaceId || 'ks-quantum';
    setIngestStatus('ingesting');
    setIngestMsg(null);
    try {
      const res = await fetch(`/api/files/${file.id}/ingest-to-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeSpaceId: targetSpace })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Ingestion failed');
      setIngestStatus('done');
      setIngestMsg(`Successfully ingested ${data.chunksIndexed} chunks into ${targetSpace}.`);
    } catch (err: any) {
      setIngestStatus('error');
      setIngestMsg(err.message || 'Failed to ingest file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-xl border border-cyan-500/30 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/50 flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 text-cyan-400">
              {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold font-mono text-white truncate max-w-md">{file.originalName}</h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {formatSize(file.sizeBytes)} • {file.mimeType}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="rounded-lg border border-cyan-500/20 bg-slate-900/60 p-4 flex items-center justify-center min-h-[160px]">
          {isImage ? (
            <img
              src={inlineUrl}
              alt={file.originalName}
              className="max-h-72 max-w-full rounded object-contain border border-cyan-500/20 shadow-md"
            />
          ) : isPdf ? (
            <div className="text-center py-6">
              <FileText className="h-16 w-16 text-cyan-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-mono text-slate-300">PDF Document Stream Ready</p>
              <p className="text-[11px] text-slate-400 mt-1">Available for preview or local download</p>
              <a
                href={inlineUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 text-xs font-mono hover:bg-cyan-900/60"
              >
                Open PDF in Tab
              </a>
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-16 w-16 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-mono text-slate-300">Binary Object Stored</p>
              <p className="text-[11px] text-slate-400 mt-1">{file.mimeType}</p>
            </div>
          )}
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="rounded border border-cyan-500/10 bg-slate-900/40 p-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
              <HardDrive className="h-3 w-3 text-cyan-400" /> STORAGE KEY
            </div>
            <p className="text-slate-200 truncate">{file.storageKey}</p>
          </div>

          <div className="rounded border border-cyan-500/10 bg-slate-900/40 p-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
              <Hash className="h-3 w-3 text-cyan-400" /> SHA-256 CHECKSUM
            </div>
            <p className="text-slate-200 truncate font-mono text-[11px]">{file.sha256}</p>
          </div>

          <div className="rounded border border-cyan-500/10 bg-slate-900/40 p-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
              <Calendar className="h-3 w-3 text-cyan-400" /> CREATED AT
            </div>
            <p className="text-slate-200">{new Date(file.createdAt).toLocaleString()}</p>
          </div>

          <div className="rounded border border-cyan-500/10 bg-slate-900/40 p-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> DOWNLOADS & STATUS
            </div>
            <p className="text-slate-200">{file.downloadCount} downloads • Status: {file.status}</p>
          </div>
        </div>

        {/* Ingest into RAG Status */}
        {ingestMsg && (
          <div className={`p-2.5 rounded text-xs font-mono ${ingestStatus === 'done' ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/60 border border-red-500/30 text-red-300'}`}>
            {ingestMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-cyan-500/20 pt-4">
          <div className="flex items-center gap-2">
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(file.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500/30 bg-red-950/40 text-red-300 hover:bg-red-900/60 text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete File
              </button>
            )}

            {!file.knowledgeSourceId && (
              <button
                type="button"
                onClick={handleIngest}
                disabled={ingestStatus === 'ingesting'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 text-xs transition-colors cursor-pointer"
              >
                {ingestStatus === 'ingesting' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Database className="h-3.5 w-3.5" />
                )}
                Ingest to RAG
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={file.originalName}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded border border-cyan-500/50 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-semibold text-xs hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-md cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
