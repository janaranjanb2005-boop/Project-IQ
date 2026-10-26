import React, { useState } from 'react';
import {
  Search,
  Filter,
  Video,
  Calendar,
  CheckCircle2,
  Clock,
  Workflow,
  Mail,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Download,
} from 'lucide-react';
import { Project } from '../types';

interface AllProjectsDashboardProps {
  projects: Project[];
  onLaunchReview: (project: Project) => void;
  onJoinMeeting: (project: Project, review?: any) => void;
  onViewFlowchart: (project: Project) => void;
  onViewEmails: (project: Project) => void;
  onNavigateToUpload: () => void;
  onSeedDemo: () => void;
}

export const AllProjectsDashboard: React.FC<AllProjectsDashboardProps> = ({
  projects,
  onLaunchReview,
  onJoinMeeting,
  onViewFlowchart,
  onViewEmails,
  onNavigateToUpload,
  onSeedDemo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'COMPLETED') return p.status === 'COMPLETED';
    if (statusFilter === 'SCHEDULED')
      return p.status === 'REVIEW_SCHEDULED' || p.status === 'IN_ITERATION_REVIEW';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, candidates, emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All Projects', count: projects.length },
            {
              id: 'SCHEDULED',
              label: 'Scheduled',
              count: projects.filter(
                (p) => p.status === 'REVIEW_SCHEDULED' || p.status === 'IN_ITERATION_REVIEW'
              ).length,
            },
            {
              id: 'COMPLETED',
              label: 'Completed',
              count: projects.filter((p) => p.status === 'COMPLETED').length,
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                statusFilter === item.id
                  ? 'bg-sky-500 text-white font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  statusFilter === item.id ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Projects Table */}
      {filteredProjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-sky-400 flex items-center justify-center">
            <Workflow className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No projects found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Ingest an Excel sheet of candidate submissions to trigger autonomous Gemini roadmap decomposition and review scheduling.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onNavigateToUpload}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition cursor-pointer"
            >
              Ingest Excel (.xlsx)
            </button>
            <button
              onClick={onSeedDemo}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 4 Demo Projects</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Candidate & Project</th>
                  <th className="px-5 py-3.5">Workflow Status</th>
                  <th className="px-5 py-3.5">Milestone Completion</th>
                  <th className="px-5 py-3.5">Next Review Milestone</th>
                  <th className="px-5 py-3.5">Communications</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredProjects.map((p) => {
                  const completedMods = p.modules.filter((m) => m.status === 'COMPLETED').length;
                  const latest = p.latestReview;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Project & User */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-bold text-white text-sm hover:text-sky-300 transition cursor-pointer line-clamp-1"
                             onClick={() => onViewFlowchart(p)}>
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                          <span className="font-medium text-slate-200">{p.user.name}</span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-slate-500 font-mono text-[11px]">{p.user.email}</span>
                        </div>
                        {p.techStack && (
                          <div className="mt-1.5 font-mono text-[10px] text-sky-400 truncate max-w-[260px]">
                            {p.techStack}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {p.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>COMPLETED</span>
                          </span>
                        ) : p.status === 'REVIEW_SCHEDULED' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            <span>REVIEW SCHEDULED</span>
                          </span>
                        ) : p.status === 'IN_ITERATION_REVIEW' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>IN ITERATION</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span>{p.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Milestone Progress */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="w-36 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400">
                              {completedMods}/{p.totalModules || p.modules.length} Mods
                            </span>
                            <span className="font-bold text-sky-400">{p.completionPercentage}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
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
                      </td>

                      {/* Review Details */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {latest ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 text-xs text-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="font-mono text-[11px]">
                                {new Date(latest.scheduledDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                (R#{latest.reviewRound})
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onJoinMeeting(p, latest)}
                                title="Join Live Google Meet Room attended by Dr. Sarah Vance (AI Evaluator)"
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-mono transition cursor-pointer"
                              >
                                <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span>Join AI Meet</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">No reviews</span>
                        )}
                      </td>

                      {/* Communications count */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button
                          onClick={() => onViewEmails(p)}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-sky-400" />
                          <span>{p.emailCount || 1} Email(s)</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5">
                          {latest && p.status !== 'COMPLETED' && (
                            <button
                              onClick={() => onJoinMeeting(p, latest)}
                              title="Enter live video review room with AI Evaluator"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Meet</span>
                            </button>
                          )}

                          <button
                            onClick={() => onViewFlowchart(p)}
                            title="View AI Flowchart & Modules"
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Workflow className="w-4 h-4" />
                          </button>

                          {p.status !== 'COMPLETED' ? (
                            <button
                              onClick={() => onLaunchReview(p)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-500/20 transition cursor-pointer"
                            >
                              <span>Admin Console</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onViewFlowchart(p)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-xs"
                            >
                              <span>Verified</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
