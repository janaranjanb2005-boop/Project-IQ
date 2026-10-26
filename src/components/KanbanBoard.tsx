import React from 'react';
import {
  Calendar,
  Video,
  Clock,
  CheckCircle2,
  Workflow,
  Mail,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Project } from '../types';

interface KanbanBoardProps {
  projects: Project[];
  onLaunchReview: (project: Project) => void;
  onJoinMeeting: (project: Project, review?: any) => void;
  onViewFlowchart: (project: Project) => void;
  onViewEmails: (project: Project) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  onLaunchReview,
  onJoinMeeting,
  onViewFlowchart,
  onViewEmails,
}) => {
  const columns = [
    {
      id: 'COL_SCHEDULED',
      title: 'Review Scheduled',
      description: 'First review milestone & Meet generated',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      filter: (p: Project) => p.status === 'REVIEW_SCHEDULED' && p.completionPercentage < 25,
    },
    {
      id: 'COL_ITERATION',
      title: 'In Iteration Review',
      description: 'Demonstrating modules & active sprint',
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      filter: (p: Project) =>
        p.status === 'IN_ITERATION_REVIEW' ||
        (p.status === 'REVIEW_SCHEDULED' && p.completionPercentage >= 25 && p.completionPercentage < 100),
    },
    {
      id: 'COL_ANALYZING',
      title: 'Ingested & AI Processing',
      description: 'Decomposing modules via Gemini',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      filter: (p: Project) => p.status === 'INGESTED' || p.status === 'ANALYZING',
    },
    {
      id: 'COL_COMPLETED',
      title: 'Fully Completed',
      description: '100% modules validated & verified',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      filter: (p: Project) => p.status === 'COMPLETED' || p.completionPercentage === 100,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {columns.map((col) => {
        const colProjects = projects.filter(col.filter);

        return (
          <div
            key={col.id}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[580px] shadow-lg"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {col.title}
                  </h3>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold border ${col.badgeColor}`}
                  >
                    {colProjects.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{col.description}</p>
              </div>
            </div>

            {/* Card List */}
            <div className="flex-1 space-y-3 mt-3 overflow-y-auto max-h-[70vh]">
              {colProjects.length === 0 ? (
                <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800/80 rounded-xl text-slate-500 text-xs text-center p-4">
                  No projects in this stage
                </div>
              ) : (
                colProjects.map((p) => {
                  const latest = p.latestReview;
                  const completedMods = p.modules.filter((m) => m.status === 'COMPLETED').length;

                  return (
                    <div
                      key={p.id}
                      className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3 hover:border-slate-700 transition shadow-md group relative"
                    >
                      {/* Project Title & Candidate */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="flex items-center space-x-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <strong className="text-slate-200">{p.user.name}</strong>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {p.user.email.split('@')[0]}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition line-clamp-2">
                          {p.name}
                        </h4>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="text-slate-400">
                            Progress: {completedMods}/{p.totalModules || p.modules.length} Mods
                          </span>
                          <span className="font-bold text-sky-400">
                            {p.completionPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              p.completionPercentage === 100
                                ? 'bg-emerald-400'
                                : 'bg-gradient-to-r from-sky-400 to-indigo-500'
                            }`}
                            style={{ width: `${p.completionPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Review Details */}
                      {latest && (
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>Round #{latest.reviewRound}</span>
                            </span>
                            <span className="font-mono text-slate-300 text-[10px]">
                              {new Date(latest.scheduledDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                            <button
                              onClick={() => onJoinMeeting(p, latest)}
                              title="Join Live Google Meet Room with Dr. Sarah Vance (AI Evaluator)"
                              className="text-sky-400 hover:text-sky-300 flex items-center space-x-1 truncate font-mono text-[10px] cursor-pointer"
                            >
                              <Video className="w-3 h-3 text-blue-400 shrink-0" />
                              <span>Join AI Meet</span>
                            </button>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                latest.status === 'COMPLETED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {latest.status}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onViewFlowchart(p)}
                            title="View AI Flowchart & Modules"
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-900 rounded-lg transition"
                          >
                            <Workflow className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onViewEmails(p)}
                            title="View Automated Email Dispatch Logs"
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-900 rounded-lg transition"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>

                        {p.status !== 'COMPLETED' && (
                          <button
                            onClick={() => onLaunchReview(p)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/20 text-xs font-semibold transition cursor-pointer"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
