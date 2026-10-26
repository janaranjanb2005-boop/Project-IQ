import React, { useState } from 'react';
import {
  X,
  Video,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  ArrowRight,
  Download,
  AlertTriangle,
  Lightbulb,
  Award,
  Check,
  Shuffle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Project, Module, Review } from '../types';

interface ReviewDashboardModalProps {
  project: Project;
  onClose: () => void;
  onReviewCompleted: () => void;
  onJoinAiMeeting?: (project: Project, review?: any) => void;
}

export const ReviewDashboardModal: React.FC<ReviewDashboardModalProps> = ({
  project,
  onClose,
  onReviewCompleted,
  onJoinAiMeeting,
}) => {
  const currentReview = project.latestReview;
  const initialCompletedIds = project.modules
    .filter((m) => m.status === 'COMPLETED')
    .map((m) => m.id);

  const [selectedCompletedIds, setSelectedCompletedIds] = useState<string[]>(initialCompletedIds);
  const [adminRating, setAdminRating] = useState<number>(4);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [overrideDays, setOverrideDays] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>(currentReview?.scheduledDate || '');
  const [meetLink, setMeetLink] = useState<string>(currentReview?.meetLink || '');
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRandomizeTiming = async () => {
    if (!currentReview) return;
    setIsRescheduling(true);
    try {
      const res = await fetch(`/api/reviews/${currentReview.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRandom: true }),
      });
      const data = await res.json();
      if (data.scheduledDate) {
        setScheduledDate(data.scheduledDate);
        setMeetLink(data.meetLink);
      }
      onReviewCompleted();
    } catch (err) {
      console.error('Failed to randomize timing', err);
    } finally {
      setIsRescheduling(false);
    }
  };

  const toggleModule = (id: string) => {
    if (selectedCompletedIds.includes(id)) {
      setSelectedCompletedIds(selectedCompletedIds.filter((mId) => mId !== id));
    } else {
      setSelectedCompletedIds([...selectedCompletedIds, id]);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentReview) {
      setError('No active review record found.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews/conduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          reviewId: currentReview.id,
          completedModuleIds: selectedCompletedIds,
          adminRating,
          adminNotes,
          overrideDaysUntilNext: overrideDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to conduct review');

      setEvaluationResult(data);

      if (data.isAllCompleted) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      onReviewCompleted();
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadIcs = () => {
    if (currentReview) {
      window.location.href = `/api/calendar/${currentReview.id}`;
    }
  };

  const completionPct = Math.round((selectedCompletedIds.length / project.modules.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-sky-400">
                  Review Day Console &bull; Round #{currentReview?.reviewRound || 1}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Live Evaluation
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">{project.name}</h2>
              <p className="text-xs text-slate-400">
                Candidate: <strong className="text-slate-200">{project.user.name}</strong> ({project.user.email})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar for Live Meeting */}
        <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Scheduled Date & Time:</span>
            <span className="font-semibold text-sky-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {scheduledDate
                ? new Date(scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Pending'}
            </span>

            <button
              onClick={handleRandomizeTiming}
              disabled={isRescheduling}
              title="Pick a new random date & time slot for this review"
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 text-[11px] font-medium transition cursor-pointer"
            >
              <Shuffle className={`w-3 h-3 ${isRescheduling ? 'animate-spin text-sky-400' : ''}`} />
              <span>Randomize Slot</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {meetLink && (
              <button
                onClick={() => onJoinAiMeeting?.(project, currentReview)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Join AI-Attended Meet Room</span>
              </button>
            )}

            <button
              onClick={handleDownloadIcs}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.ICS Invite</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {evaluationResult ? (
            /* Post-Evaluation Summary View */
            <div className="space-y-6 animate-fadeIn">
              <div
                className={`p-6 rounded-2xl border text-center ${
                  evaluationResult.isAllCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/50'
                    : 'bg-indigo-950/40 border-indigo-500/50'
                }`}
              >
                {evaluationResult.isAllCompleted ? (
                  <div className="space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Award className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">Project 100% Completed!</h3>
                    <p className="text-sm text-emerald-300 max-w-lg mx-auto">
                      All deliverables have been validated and marked complete. A congratulatory completion report has been emailed to {project.user.name}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-xs uppercase font-mono font-bold text-sky-400">
                        Review Cycle Completed &bull; Next Milestone Scheduled
                      </span>
                    </div>
                    <div className="text-4xl font-extrabold text-sky-400 font-mono">
                      {evaluationResult.evaluation.evaluationScore}
                      <span className="text-lg text-slate-400 font-normal">/100</span>
                    </div>
                    <p className="text-sm text-slate-300 max-w-xl mx-auto">
                      {evaluationResult.evaluation.feedbackSummary}
                    </p>
                  </div>
                )}
              </div>

              {/* Recursive Next Review Details */}
              {evaluationResult.nextReview && (
                <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-sky-400" />
                      <span className="text-sm font-bold text-white">
                        Round #{evaluationResult.nextReview.reviewRound} Automatically Scheduled
                      </span>
                    </div>
                    <span className="text-xs text-sky-300 font-mono">Recursive Iteration Triggered</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-400">Next Scheduled Date:</span>
                      <div className="font-semibold text-white mt-0.5 text-sm">
                        {new Date(evaluationResult.nextReview.scheduledDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Next Google Meet Link:</span>
                      <div className="mt-0.5">
                        <a
                          href={evaluationResult.nextReview.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 underline font-mono text-xs hover:text-sky-300"
                        >
                          {evaluationResult.nextReview.meetLink}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actionable Next Steps from Gemini */}
              {evaluationResult.evaluation.actionableNextSteps?.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-400">
                    <Lightbulb className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Gemini AI Recommended Next Steps:
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {evaluationResult.evaluation.actionableNextSteps.map((step: string, i: number) => (
                      <li key={i} className="flex items-start space-x-2 text-xs text-slate-300">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : (
            /* Live Evaluation Form */
            <div className="space-y-6">
              {/* Progress Summary Header */}
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Demonstrated Progress</span>
                  <div className="text-lg font-bold text-white">
                    {selectedCompletedIds.length} of {project.modules.length} Modules Verified
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium">Completion Rate</span>
                  <div className="text-xl font-extrabold text-sky-400 font-mono">{completionPct}%</div>
                </div>
              </div>

              {/* Modules Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    1. Check Off Verified Modules from Candidate Demo:
                  </label>
                  <span className="text-[11px] text-slate-400">Click to toggle status</span>
                </div>

                <div className="space-y-3">
                  {project.modules.map((mod) => {
                    const isChecked = selectedCompletedIds.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-3">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                isChecked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-600 bg-slate-900'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-white">{mod.title}</span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  (~{mod.estimatedDays} days)
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                {mod.description}
                              </p>

                              {/* Deliverables tags */}
                              {mod.deliverables?.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {mod.deliverables.map((del, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                                    >
                                      &bull; {del}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isChecked
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isChecked ? 'COMPLETED' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviewer Rating & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    2. Demo Rating (1-5 Stars)
                  </label>
                  <div className="flex items-center space-x-1 p-2 bg-slate-950 rounded-xl border border-slate-800">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setAdminRating(star)}
                        className="p-1 text-slate-500 hover:text-amber-400 transition"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= adminRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-mono font-bold text-amber-400 ml-2">
                      {adminRating} / 5
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Next Review Cadence (Days)
                  </label>
                  <select
                    value={overrideDays}
                    onChange={(e) => setOverrideDays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value={3}>3 Days (Accelerated Sprint)</option>
                    <option value={5}>5 Days (Recommended Sprint)</option>
                    <option value={7}>7 Days (1 Week Cadence)</option>
                    <option value={10}>10 Days (Extended Milestone)</option>
                    <option value={14}>14 Days (Bi-Weekly)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Auto Automation Mode
                  </label>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="text-sky-400 font-semibold flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Recursive Scheduling Active</span>
                    </div>
                    <div>Next Meet link + calendar invite + email dispatched on submit.</div>
                  </div>
                </div>
              </div>

              {/* Admin Feedback Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  3. Live Review Notes & Technical Observations:
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Demonstrated functional REST API and database schema. UI navigation is responsive. Needs error handling on edge inputs before the next milestone."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-500 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Evaluating Demo & Recursively Scheduling Next Cycle...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {selectedCompletedIds.length >= project.modules.length
                        ? 'Complete Final Review & Celebrate'
                        : `Submit Review Round #${currentReview?.reviewRound || 1} & Schedule Round #${(currentReview?.reviewRound || 1) + 1}`}
                    </span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
