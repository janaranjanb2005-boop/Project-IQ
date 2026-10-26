import React, { useState } from 'react';
import {
  Database,
  Layers,
  Cpu,
  Mail,
  Video,
  Calendar,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface ArchitectureDocsModalProps {
  onResetDb: () => void;
  onSeedDemo: () => void;
  isLoading: boolean;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({
  onResetDb,
  onSeedDemo,
  isLoading,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const schemaSql = `-- PROJECT IQ RELATIONAL SQLITE SCHEMA

-- 1. Users Table (Candidates / Project Owners)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- 2. Projects Table (Master Project Record & Lifecycle State)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT,
  status TEXT NOT NULL, -- 'ANALYZING', 'REVIEW_SCHEDULED', 'IN_ITERATION_REVIEW', 'COMPLETED'
  completion_percentage INTEGER DEFAULT 0,
  current_module_index INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Modules Table (Gemini-Decomposed Milestones)
CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deliverables TEXT, -- JSON array of verifiable items
  estimated_days INTEGER DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'
  completed_at TEXT
);

-- 4. Reviews Table (Live Demo Evaluation & Recursive Scheduling)
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  review_round INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  meet_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'CONDUCTING', 'COMPLETED'
  admin_notes TEXT,
  demo_rating INTEGER, -- 1 to 5 stars
  ai_evaluation TEXT, -- JSON with score, strengths, blockers
  ai_next_steps TEXT, -- JSON array of actionable steps
  conducted_at TEXT,
  created_at TEXT NOT NULL
);

-- 5. Email Logs Table (Automated Mailer Logs with HTML Snapshot)
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'INITIAL_BREAKDOWN', 'ITERATION_UPDATE', 'FINAL_COMPLETION'
  content_html TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DELIVERED'
);`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                System Architecture & Database Specifications
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Complete architectural blueprint for <strong>Project IQ</strong>: autonomous pipeline connecting bulk Excel candidate ingestion, Google Gemini module decomposition, dynamic Google Meet room generation, and recursive iterative reviews.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSeedDemo}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Seed Demo Database
            </button>
            <button
              onClick={onResetDb}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-semibold text-xs transition cursor-pointer flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deliverable 2: System Architecture & Flowchart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 text-sky-400">
          <Layers className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Deliverable 2: End-to-End System Architecture Flow
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Step 1 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 relative">
            <div className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
              Stage 1: Ingestion
            </div>
            <div className="font-bold text-white text-sm">Excel / CSV Parser</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Admin uploads spreadsheet. SheetJS (<code className="text-sky-300 font-mono text-[10px]">xlsx</code>) parses Candidate Name, Email ID, Project Name, and Upload Date.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-sky-500/30 space-y-2 relative ring-1 ring-sky-500/20">
            <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Stage 2: AI Decomposition
            </div>
            <div className="font-bold text-white text-sm">Gemini 3.8 Flash</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gemini analyzes project topic, generates 4-phase development roadmap, defines deliverables, estimates days, and formulates technical architecture.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 relative">
            <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              Stage 3: Auto-Schedule
            </div>
            <div className="font-bold text-white text-sm">Meet & Email Pipeline</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates unique Google Meet room link, calculates review deadline date, generates iCalendar (<code className="text-sky-300 font-mono text-[10px]">.ics</code>), and dispatches automated invitation.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2 relative ring-1 ring-emerald-500/20">
            <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Stage 4: Recursive Review
            </div>
            <div className="font-bold text-white text-sm">Live Demo & Iteration</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Admin verifies completed modules during live demo. Gemini evaluates progress, calculates velocity score, and recursively schedules next review round until 100% complete.
            </p>
          </div>
        </div>
      </div>

      {/* Deliverable 1: Database Schema */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sky-400">
            <Database className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Deliverable 1: Database Schema (SQLite)
            </h3>
          </div>

          <button
            onClick={() => copyToClipboard(schemaSql, 'schema')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {copiedSection === 'schema' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied SQL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy DDL</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Normalized relational design with foreign key constraints, cascading deletes, and JSON serialization for flexible deliverables and evaluation metadata:
        </p>

        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-x-auto">
          <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre">
            {schemaSql}
          </pre>
        </div>
      </div>

      {/* Deliverable 3 & 4: Backend & Frontend Setup Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Highlights */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Cpu className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Deliverable 3: Backend Setup
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Runtime:</strong> Node.js + Express with Vite middleware mounting in development and static build delivery in production.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Google GenAI SDK:</strong> Uses modern <code className="text-sky-300 font-mono">@google/genai</code> with model <code className="text-sky-300 font-mono">gemini-3.8-flash</code> and required telemetry headers.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Excel Ingestion:</strong> Multi-format parser (<code className="text-sky-300 font-mono">.xlsx</code>, <code className="text-sky-300 font-mono">.csv</code>) with automatic column normalizer.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Calendar Sync:</strong> RFC 5545 compliant <code className="text-sky-300 font-mono">.ics</code> generator for one-click Google Calendar / Apple Calendar synchronization.</span>
            </li>
          </ul>
        </div>

        {/* Frontend Highlights */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 text-sky-400">
            <Code2 className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Deliverable 4: Frontend Setup
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Framework:</strong> React 19 (TypeScript) with Tailwind CSS v4 and responsive flex/grid layouts.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Dual View Dashboards:</strong> Instant switching between high-density Data Table view and visual Kanban board.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Interactive Review Console:</strong> Live checklist for demo verification, star rating, feedback notes, and recursive cycle triggers.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span><strong>Email Inspector:</strong> In-app sandboxed HTML previews of all automated communications sent to candidates.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
