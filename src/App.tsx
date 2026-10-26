import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AllProjectsDashboard } from './components/AllProjectsDashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { ExcelUploader } from './components/ExcelUploader';
import { ReviewDashboardModal } from './components/ReviewDashboardModal';
import { FlowchartViewer } from './components/FlowchartViewer';
import { EmailHistoryModal } from './components/EmailHistoryModal';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { AiMeetingRoomModal } from './components/AiMeetingRoomModal';
import { Project, Review } from './types';
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'table' | 'kanban' | 'upload' | 'architecture'>('table');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [activeReviewProject, setActiveReviewProject] = useState<Project | null>(null);
  const [activeFlowchartProject, setActiveFlowchartProject] = useState<Project | null>(null);
  const [activeEmailProject, setActiveEmailProject] = useState<Project | null>(null);
  const [activeAiMeeting, setActiveAiMeeting] = useState<{ project: Project; review: Review } | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      showToast('error', 'Failed to retrieve project records from server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsLoading(true);
    showToast('success', 'Seeding demo projects and running Gemini AI decomposition...');
    try {
      const res = await fetch('/api/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed demo');

      showToast('success', data.message || 'Demo projects seeded successfully!');
      await fetchProjects();
      setCurrentTab('table');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to seed demo data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDb = async () => {
    if (!window.confirm('Are you sure you want to clear all project and review records?')) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset database');

      showToast('success', 'Database cleared successfully.');
      await fetchProjects();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reset database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomizeSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/randomize-schedules', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to randomize schedules');

      showToast('success', data.message || 'Meeting dates and timings randomized!');
      await fetchProjects();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to randomize schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewCompleted = async () => {
    await fetchProjects();
    showToast('success', 'Review completed, Gemini AI evaluated progress & next round scheduled!');
  };

  const handleJoinMeeting = (project: Project, review?: Review | null) => {
    const targetReview = review || project.latestReview;
    if (!targetReview) {
      showToast('error', 'No active review session scheduled for this project.');
      return;
    }
    setActiveAiMeeting({ project, review: targetReview });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Navbar with stats and tabs */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        projects={projects}
        onRefresh={fetchProjects}
        onSeedDemo={handleSeedDemo}
        onResetDb={handleResetDb}
        onRandomizeSchedules={handleRandomizeSchedules}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'table' && (
          <AllProjectsDashboard
            projects={projects}
            onLaunchReview={(p) => setActiveReviewProject(p)}
            onJoinMeeting={handleJoinMeeting}
            onViewFlowchart={(p) => setActiveFlowchartProject(p)}
            onViewEmails={(p) => setActiveEmailProject(p)}
            onNavigateToUpload={() => setCurrentTab('upload')}
            onSeedDemo={handleSeedDemo}
          />
        )}

        {currentTab === 'kanban' && (
          <KanbanBoard
            projects={projects}
            onLaunchReview={(p) => setActiveReviewProject(p)}
            onJoinMeeting={handleJoinMeeting}
            onViewFlowchart={(p) => setActiveFlowchartProject(p)}
            onViewEmails={(p) => setActiveEmailProject(p)}
          />
        )}

        {currentTab === 'upload' && (
          <ExcelUploader
            onSuccess={() => {
              fetchProjects();
              setCurrentTab('table');
              showToast('success', 'Candidate sheet ingested and AI milestones formulated!');
            }}
            onSeedDemo={handleSeedDemo}
          />
        )}

        {currentTab === 'architecture' && (
          <ArchitectureDocsModal
            onResetDb={handleResetDb}
            onSeedDemo={handleSeedDemo}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium transition-all duration-300 animate-slideUp bg-slate-900 border-slate-700 text-white">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Live AI-Attended Meeting Room */}
      {activeAiMeeting && (
        <AiMeetingRoomModal
          project={activeAiMeeting.project}
          review={activeAiMeeting.review}
          onClose={() => setActiveAiMeeting(null)}
          onReviewConcluded={handleReviewCompleted}
        />
      )}

      {/* Review Dashboard Modal */}
      {activeReviewProject && (
        <ReviewDashboardModal
          project={activeReviewProject}
          onClose={() => setActiveReviewProject(null)}
          onReviewCompleted={handleReviewCompleted}
          onJoinAiMeeting={(p, r) => {
            setActiveReviewProject(null);
            handleJoinMeeting(p, r);
          }}
        />
      )}

      {/* Flowchart Roadmap Modal */}
      {activeFlowchartProject && (
        <FlowchartViewer
          project={activeFlowchartProject}
          onClose={() => setActiveFlowchartProject(null)}
          onLaunchReview={(p) => {
            setActiveFlowchartProject(null);
            setActiveReviewProject(p);
          }}
        />
      )}

      {/* Email History Modal */}
      {activeEmailProject && (
        <EmailHistoryModal
          project={activeEmailProject}
          onClose={() => setActiveEmailProject(null)}
        />
      )}
    </div>
  );
}
