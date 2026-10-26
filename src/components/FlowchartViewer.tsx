import React from 'react';
import {
  X,
  Workflow,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  Cpu,
  Calendar,
} from 'lucide-react';
import { Project } from '../types';

interface FlowchartViewerProps {
  project: Project;
  onClose: () => void;
  onLaunchReview?: (project: Project) => void;
}

export const FlowchartViewer: React.FC<FlowchartViewerProps> = ({
  project,
  onClose,
  onLaunchReview,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-sky-400">
                  AI Architecture Decomposition & Flowchart
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Gemini 3.8 Flash
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">{project.name}</h2>
              <p className="text-xs text-slate-400">Candidate: {project.user.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Architecture Overview Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-sky-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                System Architectural Overview:
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {project.description ||
                'End-to-end development architecture prioritizing modular component boundaries, resilient data access, and recursive milestone verification.'}
            </p>
            {project.techStack && (
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-900 text-xs">
                <span className="text-slate-400 font-medium">Recommended Tech Stack:</span>
                <span className="font-mono text-sky-300 text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {project.techStack}
                </span>
              </div>
            )}
          </div>

          {/* Flowchart Horizontal Pipeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Step-by-Step Development Flowchart Pipeline:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
              {project.modules.map((mod, idx) => {
                const isCompleted = mod.status === 'COMPLETED';
                const isInProgress = mod.status === 'IN_PROGRESS';

                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl p-4 border relative flex flex-col justify-between transition-all ${
                      isCompleted
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                        : isInProgress
                        ? 'bg-sky-950/30 border-sky-500/50 shadow-sm shadow-sky-500/20 ring-1 ring-sky-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          Step 0{idx + 1}
                        </span>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isInProgress ? (
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white mb-1.5">{mod.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">~{mod.estimatedDays} days</span>
                      <span
                        className={`font-semibold ${
                          isCompleted
                            ? 'text-emerald-400'
                            : isInProgress
                            ? 'text-sky-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {mod.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Module Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Module Deliverables & Validation Criteria:
            </h3>

            <div className="space-y-3">
              {project.modules.map((mod, idx) => (
                <div
                  key={mod.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-mono text-xs font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white">{mod.title}</h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Estimated Duration: {mod.estimatedDays} Days
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 pl-8 leading-relaxed">{mod.description}</p>

                  <div className="pl-8 pt-1">
                    <div className="text-[11px] font-semibold text-slate-300 mb-1">
                      Target Deliverables:
                    </div>
                    <ul className="space-y-1">
                      {mod.deliverables.map((del, dIdx) => (
                        <li
                          key={dIdx}
                          className="text-[11px] text-slate-400 flex items-start space-x-1.5"
                        >
                          <span className="text-sky-400 font-bold">&bull;</span>
                          <span>{del}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Current Status:{' '}
            <span className="font-semibold text-white">{project.status.replace(/_/g, ' ')}</span>{' '}
            &bull; {project.completionPercentage}% Overall
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Close
            </button>
            {onLaunchReview && project.status !== 'COMPLETED' && (
              <button
                onClick={() => {
                  onClose();
                  onLaunchReview(project);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition cursor-pointer"
              >
                Launch Live Review Day Console
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
