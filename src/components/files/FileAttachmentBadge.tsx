import React from 'react';
import { FileText, Image as ImageIcon, Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { FileRecord } from '../../types/storage.ts';

interface FileAttachmentBadgeProps {
  file: FileRecord | { id: string; originalName: string; mimeType: string; sizeBytes: number; extension?: string };
  onDelete?: (fileId: string) => void;
  canDelete?: boolean;
  onPreview?: (file: any) => void;
}

export function FileAttachmentBadge({
  file,
  onDelete,
  canDelete = false,
  onPreview
}: FileAttachmentBadgeProps) {
  const isImage = file.mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(file.extension || '');
  const isPdf = file.mimeType === 'application/pdf' || file.extension === 'pdf';

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const downloadUrl = `/api/files/${file.id}/download`;

  return (
    <div className="group relative flex items-center gap-2.5 rounded-lg border border-cyan-500/20 bg-slate-900/80 px-3 py-2 text-xs transition-all hover:border-cyan-500/50 hover:bg-slate-800/90 shadow-sm">
      {/* File Type Icon */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-cyan-500/30 bg-cyan-950/60 text-cyan-400">
        {isImage ? (
          <ImageIcon className="h-4 w-4" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </div>

      {/* File Details */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onPreview?.(file)}
          className="truncate font-mono font-medium text-slate-200 hover:text-cyan-300 text-left block w-full transition-colors cursor-pointer"
          title={file.originalName}
        >
          {file.originalName}
        </button>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span>{formatSize(file.sizeBytes)}</span>
          <span>•</span>
          <span className="uppercase text-cyan-400/80">{file.extension || 'file'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <a
          href={downloadUrl}
          download={file.originalName}
          className="flex h-6 w-6 items-center justify-center rounded border border-cyan-500/20 bg-black/40 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
          title="Download File"
        >
          <Download className="h-3 w-3" />
        </a>

        {canDelete && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(file.id)}
            className="flex h-6 w-6 items-center justify-center rounded border border-red-500/20 bg-black/40 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
            title="Delete File"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
