export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Module {
  id: string;
  orderIndex: number;
  title: string;
  description: string;
  deliverables: string[];
  estimatedDays: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  completedAt?: string;
}

export interface Review {
  id: string;
  reviewRound: number;
  scheduledDate: string;
  meetLink: string;
  status: 'SCHEDULED' | 'CONDUCTING' | 'COMPLETED' | 'RESCHEDULED';
  adminNotes?: string;
  demoRating?: number;
  aiEvaluation?: {
    evaluationScore: number;
    feedbackSummary: string;
    strengthsObserved: string[];
    blockersIdentified: string[];
    actionableNextSteps: string[];
    suggestedDaysToNextReview: number;
    revisedUpcomingGoals: string[];
  };
  aiNextSteps?: string[];
  conductedAt?: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  templateType: 'INITIAL_BREAKDOWN' | 'ITERATION_UPDATE' | 'FINAL_COMPLETION';
  contentHtml: string;
  sentAt: string;
  status: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  techStack?: string;
  status: 'INGESTED' | 'ANALYZING' | 'PENDING_MODULE_1' | 'REVIEW_SCHEDULED' | 'IN_ITERATION_REVIEW' | 'COMPLETED';
  completionPercentage: number;
  totalModules: number;
  createdAt: string;
  updatedAt: string;
  user: User;
  modules: Module[];
  latestReview?: Review | null;
  emailCount?: number;
}
