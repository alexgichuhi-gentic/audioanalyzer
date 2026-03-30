'use client';

import { useCallback, useState } from 'react';
import { Upload, FileAudio, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface UploadFile {
  file: File;
  status: 'uploading' | 'transcribing' | 'completed' | 'failed';
  progress: number;
  transcriptId?: string;
  error?: string;
}

export default function UploadZone({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadFile[] = Array.from(fileList)
        .filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(f.name))
        .map((file) => ({ file, status: 'uploading' as const, progress: 0 }));

      if (newFiles.length === 0) return;
      setFiles((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < newFiles.length; i++) {
        const uploadFile = newFiles[i];
        try {
          const formData = new FormData();
          formData.append('file', uploadFile.file);

          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Upload failed (${res.status})`);
          }

          const { transcriptId } = await res.json();

          setFiles((prev) =>
            prev.map((f) =>
              f.file === uploadFile.file
                ? { ...f, status: 'transcribing', progress: 50, transcriptId }
                : f
            )
          );

          // Poll for transcription completion
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/transcripts/${transcriptId}`);
              const data = await statusRes.json();

              if (data.status === 'completed') {
                clearInterval(pollInterval);
                setFiles((prev) =>
                  prev.map((f) =>
                    f.file === uploadFile.file
                      ? { ...f, status: 'completed', progress: 100 }
                      : f
                  )
                );
                onUploadComplete();
              } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                setFiles((prev) =>
                  prev.map((f) =>
                    f.file === uploadFile.file
                      ? { ...f, status: 'failed', error: data.error || 'Transcription failed' }
                      : f
                  )
                );
              }
            } catch {
              clearInterval(pollInterval);
            }
          }, 3000);
        } catch (err: any) {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === uploadFile.file
                ? { ...f, status: 'failed', error: err.message }
                : f
            )
          );
        }
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm';
          input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files?.length) handleFiles(target.files);
          };
          input.click();
        }}
      >
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drop audio files here or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">MP3, WAV, M4A, OGG, FLAC, WebM</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3"
            >
              <FileAudio className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{f.file.name}</p>
                <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      f.status === 'failed' ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0">
                {f.status === 'uploading' && <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />}
                {f.status === 'transcribing' && (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                    <Loader2 className="h-4 w-4 animate-spin" /> Transcribing
                  </span>
                )}
                {f.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {f.status === 'failed' && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600" title={f.error}>
                    <XCircle className="h-4 w-4" /> {f.error || 'Failed'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
