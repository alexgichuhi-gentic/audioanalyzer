'use client';

import { useCallback, useState, useEffect } from 'react';
import { Upload, FileAudio, CheckCircle, XCircle, Loader2, X, FolderOpen } from 'lucide-react';
import { upload } from '@vercel/blob/client';

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'transcribing' | 'completed' | 'failed';
  progress: number;
  transcriptId?: string;
  error?: string;
}

interface ProfileOption {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function UploadZone({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [comment, setComment] = useState('');
  const [project, setProject] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batchId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProfiles(data);
          const defaultProfile = data.find((p: ProfileOption) => p.isDefault);
          if (defaultProfile) setSelectedProfileId(defaultProfile.id);
        }
      })
      .catch(() => {});
  }, []);

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList)
      .filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(f.name))
      .map((file) => ({ file, status: 'pending' as const, progress: 0 }));

    if (newFiles.length === 0) return;
    setFiles((prev) => [...prev, ...newFiles]);
    if (!showModal) setShowModal(true);
  }, [showModal]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (files.length === 0 || uploading) return;
    setUploading(true);

    const pendingFiles = files.filter((f) => f.status === 'pending');

    for (let i = 0; i < pendingFiles.length; i++) {
      const uploadFile = pendingFiles[i];
      const fileIndex = files.findIndex((f) => f.file === uploadFile.file);

      try {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f
          )
        );

        // 1. Upload the file directly to Vercel Blob from the browser.
        //    Bypasses the 4.5 MB serverless body limit. Supports up to 500 MB.
        const blob = await upload(uploadFile.file.name, uploadFile.file, {
          access: 'public',
          handleUploadUrl: '/api/upload/token',
          multipart: uploadFile.file.size > 8 * 1024 * 1024, // chunked for >8 MB
          contentType: uploadFile.file.type || 'application/octet-stream',
          onUploadProgress: ({ percentage }) => {
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === fileIndex
                  ? { ...f, status: 'uploading', progress: Math.round(percentage * 0.5) }
                  : f
              )
            );
          },
        });

        // 2. Tell the server the upload is done so it can create the transcript
        //    record and run transcription.
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex ? { ...f, status: 'transcribing', progress: 60 } : f
          )
        );

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blobUrl: blob.url,
            filename: uploadFile.file.name,
            fileSize: uploadFile.file.size,
            batchId,
            comment: comment || null,
            project: project || null,
            profileId: selectedProfileId || null,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed (${res.status})`);
        }

        const { transcriptId, profileId: returnedProfileId } = await res.json();

        // Check final status
        const statusRes = await fetch(`/api/transcripts/${transcriptId}`);
        const data = await statusRes.json();

        if (data.status === 'completed') {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? { ...f, status: 'completed', progress: 100, transcriptId }
                : f
            )
          );

          // Auto-analyze if profile selected
          if (returnedProfileId) {
            fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcriptId, profileId: returnedProfileId }),
            }).catch(() => {});
          }
        } else {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? { ...f, status: 'failed', error: data.error || 'Transcription failed' }
                : f
            )
          );
        }
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex ? { ...f, status: 'failed', error: err.message } : f
          )
        );
      }
    }

    setUploading(false);
    onUploadComplete();
  };

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const failedCount = files.filter((f) => f.status === 'failed').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const allDone = files.length > 0 && pendingCount === 0 && !uploading;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.length) addFiles(target.files);
    };
    input.click();
  };

  return (
    <>
      {/* Trigger button / drop area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => { if (!showModal) openFilePicker(); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
      >
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drop audio files here or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">MP3, WAV, M4A, OGG, FLAC, WebM — up to 500 MB / 60+ min</p>
      </div>

      {/* Batch Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Batch Upload</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                onClick={() => {
                  if (!uploading) {
                    setShowModal(false);
                    if (allDone) {
                      setFiles([]);
                      setComment('');
                      setProject('');
                    }
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Add more files */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={openFilePicker}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'
                }`}
              >
                <FolderOpen className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Drop more files or click to add</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5"
                    >
                      <FileAudio className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{f.file.name}</p>
                        <p className="text-xs text-gray-400">
                          {(f.file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                        {(f.status === 'uploading' || f.status === 'transcribing') && (
                          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {f.status === 'pending' && (
                          <button
                            onClick={() => removeFile(idx)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-400"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {f.status === 'uploading' && <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />}
                        {f.status === 'transcribing' && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> Transcribing
                          </span>
                        )}
                        {f.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {f.status === 'failed' && (
                          <span className="text-xs text-red-600 flex items-center gap-1" title={f.error}>
                            <XCircle className="h-4 w-4" /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Project
                </label>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Q2 Sales Calls, Customer Support, Training..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Label these files with a project name for easy identification
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description / Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={uploading}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  placeholder="What are these files for? e.g., Monday sales calls, training recordings..."
                />
              </div>

              {/* Analysis profile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Auto-Analyze with Profile
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">No auto-analysis</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? '(default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Each file will be automatically analyzed after transcription
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {completedCount > 0 && (
                  <span className="text-green-600 font-medium">{completedCount} completed</span>
                )}
                {failedCount > 0 && (
                  <span className="text-red-600 font-medium ml-2">{failedCount} failed</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!uploading) {
                      setShowModal(false);
                      if (allDone) {
                        setFiles([]);
                        setComment('');
                      setProject('');
                      }
                    }
                  }}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
                >
                  {allDone ? 'Close' : 'Cancel'}
                </button>
                {pendingCount > 0 && (
                  <button
                    onClick={handleUploadAll}
                    disabled={uploading || pendingCount === 0}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
