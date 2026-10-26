import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Database,
  PlusCircle,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelUploaderProps {
  onSuccess: () => void;
  onSeedDemo: () => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onSuccess, onSeedDemo }) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'manual'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualProject, setManualProject] = useState('');

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        setParsedPreview(json.slice(0, 5));
      } catch (err) {
        setErrorMessage('Failed to preview file contents. Ensure it is a valid .xlsx or .csv.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Parsing Excel sheet and launching Gemini AI Decomposition pipelines...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process spreadsheet.');
      }

      setStatusMessage(`Success! ${data.processedCount} project(s) decomposed into milestones, Google Meet scheduled, and invitation emails dispatched.`);
      setFile(null);
      setParsedPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during upload.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualEmail || !manualProject) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Decomposing project with Gemini AI and generating Google Meet review session...');

    try {
      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [
            {
              userName: manualName,
              emailId: manualEmail,
              projectName: manualProject,
              dateOfUpload: new Date().toISOString().split('T')[0],
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit project.');

      setStatusMessage('Project initialized! Roadmaps created & invite dispatched.');
      setManualName('');
      setManualEmail('');
      setManualProject('');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/sample-excel';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                Batch Project Data Ingestion
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Upload an Excel (<code className="text-sky-300 font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">.xlsx</code>) or CSV file with candidate submissions. Project IQ automatically parses records, invokes <strong>Google Gemini AI</strong> to break each project down into structured modules with flowcharts, generates unique <strong>Google Meet links</strong>, and dispatches automated roadmap invitation emails.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={handleDownloadTemplate}
              className="flex-1 md:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Sample .XLSX</span>
            </button>
            <button
              onClick={onSeedDemo}
              className="flex-1 md:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>1-Click Demo Seed</span>
            </button>
          </div>
        </div>

        {/* Column requirement badges */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Required Sheet Headers:</span>
          {['User Name', 'Email ID', 'Project Name', 'Date of Upload'].map((col) => (
            <span
              key={col}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-200 border border-slate-700/80 font-mono text-[11px]"
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs: File Upload vs Quick Add Single */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveMode('upload')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeMode === 'upload'
              ? 'bg-sky-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File (.xlsx / .csv)</span>
        </button>
        <button
          onClick={() => setActiveMode('manual')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeMode === 'manual'
              ? 'bg-sky-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Quick Manual Entry</span>
        </button>
      </div>

      {activeMode === 'upload' ? (
        <div className="space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all bg-slate-900/60 ${
              file
                ? 'border-sky-500/60 bg-sky-950/10'
                : 'border-slate-700/80 hover:border-slate-600 hover:bg-slate-900'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer block space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  {file ? file.name : 'Click to choose file or drag and drop'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                </p>
              </div>
              {file && (
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-xs font-mono">
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                  <span>&bull;</span>
                  <span>Ready for parsing</span>
                </div>
              )}
            </label>
          </div>

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    File Pre-scan Preview ({parsedPreview.length} sample row{parsedPreview.length > 1 ? 's' : ''})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Columns detected automatically</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                    <tr>
                      {Object.keys(parsedPreview[0]).map((h) => (
                        <th key={h} className="px-3 py-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {parsedPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className="px-3 py-2 max-w-[200px] truncate">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Process Button */}
          {file && (
            <button
              onClick={handleUploadSubmit}
              disabled={isProcessing}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Processing Records with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Ingestion & Trigger AI Roadmaps</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        /* Manual Single Record Form */
        <form
          onSubmit={handleManualSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Developer / Student Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Elena Rostova"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="elena.rostova@university.edu"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Project Name / Topic Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Autonomous Satellite Orbit Tracking and Debris Collision Alert Engine"
              value={manualProject}
              onChange={(e) => setManualProject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Gemini AI will analyze this topic to deduce system architecture, modular deliverables, and milestones.
            </p>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Generating Roadmap via Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Initialize Project & Schedule Review</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Status & Error Alerts */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{statusMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}
    </div>
  );
};
