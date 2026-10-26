import React from 'react';
import {
  Layers,
  Kanban,
  UploadCloud,
  FileCode2,
  Sparkles,
  Database,
  RefreshCw,
  PlusCircle,
  Shuffle,
} from 'lucide-react';
import { Project } from '../types';

interface NavbarProps {
  currentTab: 'table' | 'kanban' | 'upload' | 'architecture';
  setCurrentTab: (tab: 'table' | 'kanban' | 'upload' | 'architecture') => void;
  projects: Project[];
  onRefresh: () => void;
  onSeedDemo: () => void;
  onResetDb: () => void;
  onRandomizeSchedules: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  projects,
  onRefresh,
  onSeedDemo,
  onResetDb,
  onRandomizeSchedules,
  isLoading,
}) => {
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const scheduledCount = projects.filter(
    (p) => p.status === 'REVIEW_SCHEDULED' || p.status === 'IN_ITERATION_REVIEW'
  ).length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  Project<span className="text-sky-400">IQ</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Gemini Automated Reviews
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous Review Scheduling & Milestone Evaluation Engine
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden lg:flex items-center space-x-4 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-slate-400">Total:</span>
              <span className="font-semibold text-white">{projects.length}</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800" />
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-400">Scheduled:</span>
              <span className="font-semibold text-amber-400">{scheduledCount}</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800" />
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Completed:</span>
              <span className="font-semibold text-emerald-400">{completedCount}</span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh projects"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {projects.length === 0 && (
              <button
                onClick={onSeedDemo}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Load Demo Data</span>
              </button>
            )}

            {projects.length > 0 && (
              <button
                onClick={onRandomizeSchedules}
                disabled={isLoading}
                title="Randomize meeting dates and timing for each project"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Randomize Timings</span>
              </button>
            )}

            <button
              onClick={() => setCurrentTab('upload')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === 'upload'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Ingest Excel</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-t border-slate-800/80 pt-1 -mb-px overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentTab('table')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'table'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Projects Table</span>
            <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-slate-800 text-[11px] text-slate-300">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('kanban')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'kanban'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => setCurrentTab('upload')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'upload'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Excel / CSV Ingestion</span>
          </button>

          <button
            onClick={() => setCurrentTab('architecture')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'architecture'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>System Architecture & Schema</span>
          </button>
        </div>
      </div>
    </header>
  );
};
