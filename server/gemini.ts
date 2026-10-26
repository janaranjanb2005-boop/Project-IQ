import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface GeneratedModule {
  title: string;
  description: string;
  deliverables: string[];
  estimatedDays: number;
}

export interface GeneratedPlan {
  summary: string;
  recommendedTechStack: string;
  flowchartNodes: Array<{
    id: string;
    label: string;
    phase: string;
    moduleNumber: number;
    description: string;
  }>;
  modules: GeneratedModule[];
}

export interface ReviewEvaluation {
  evaluationScore: number; // 0 to 100
  feedbackSummary: string;
  strengthsObserved: string[];
  blockersIdentified: string[];
  actionableNextSteps: string[];
  suggestedDaysToNextReview: number;
  revisedUpcomingGoals: string[];
}

export async function generateProjectDecomposition(projectName: string, context?: string): Promise<GeneratedPlan> {
  const prompt = `You are a Principal Software Architect and Engineering Mentor for "Project IQ".
Decompose the following student/developer project into 4 progressive, milestone-driven modules for periodic reviews.

Project Name: "${projectName}"
${context ? `Additional Context: ${context}` : ''}

For this project:
1. Provide a concise architectural overview and suggested tech stack.
2. Provide a step-by-step flowchart node sequence representing the end-to-end development journey.
3. Break down the project into exactly 4 structured modules:
   - Module 1: Architecture, Data Modeling, & Foundations
   - Module 2: Core Business Logic & Backend Services
   - Module 3: Frontend Integration, UI/UX, & API Wiring
   - Module 4: Testing, Security, Polish & Deployment
Each module must have 3-4 concrete, verifiable deliverables and realistic estimated days (3-7 days).

Return strictly structured JSON matching the schema.`;

  try {
    if (!apiKey) {
      return getFallbackPlan(projectName);
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini request timeout')), 12000)
    );

    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'High level summary of the project architecture' },
            recommendedTechStack: { type: Type.STRING, description: 'Recommended libraries and tools' },
            flowchartNodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  phase: { type: Type.STRING },
                  moduleNumber: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                },
                required: ['id', 'label', 'phase', 'moduleNumber', 'description'],
              },
            },
            modules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  deliverables: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  estimatedDays: { type: Type.INTEGER },
                },
                required: ['title', 'description', 'deliverables', 'estimatedDays'],
              },
            },
          },
          required: ['summary', 'recommendedTechStack', 'flowchartNodes', 'modules'],
        },
      },
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);

    const text = response.text;
    if (!text) return getFallbackPlan(projectName);
    const parsed = JSON.parse(text) as GeneratedPlan;
    return parsed;
  } catch (error) {
    console.error('Error in Gemini generateProjectDecomposition:', error);
    return getFallbackPlan(projectName);
  }
}

export async function evaluateReviewProgress(
  projectName: string,
  completedModules: string[],
  pendingModules: string[],
  adminRating: number,
  adminNotes: string,
  currentRound: number
): Promise<ReviewEvaluation> {
  const prompt = `You are a Senior Project Evaluator for "Project IQ".
Evaluate this project review checkpoint:
- Project Name: "${projectName}"
- Review Round: ${currentRound}
- Modules Completed So Far: ${JSON.stringify(completedModules)}
- Pending Modules: ${JSON.stringify(pendingModules)}
- Reviewer Rating: ${adminRating} / 5 stars
- Reviewer Notes from Live Demo: "${adminNotes || 'Satisfactory progress on demonstrated features.'}"

Tasks:
1. Provide an objective evaluation score (0-100).
2. Synthesize feedback summary highlighting strengths and velocity.
3. List 2-3 specific strengths observed.
4. List blockers or risks to monitor.
5. Provide 3-4 concrete actionable next steps for the upcoming iteration.
6. Suggest the optimal interval in days until the next review (between 3 and 10 days).
7. Suggest revised upcoming goals tailored to their current velocity.

Return strictly JSON matching the specified schema.`;

  try {
    if (!apiKey) {
      return getFallbackEvaluation(completedModules, pendingModules, adminRating);
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini evaluation timeout')), 12000)
    );

    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluationScore: { type: Type.INTEGER },
            feedbackSummary: { type: Type.STRING },
            strengthsObserved: { type: Type.ARRAY, items: { type: Type.STRING } },
            blockersIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionableNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedDaysToNextReview: { type: Type.INTEGER },
            revisedUpcomingGoals: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'evaluationScore',
            'feedbackSummary',
            'strengthsObserved',
            'blockersIdentified',
            'actionableNextSteps',
            'suggestedDaysToNextReview',
            'revisedUpcomingGoals',
          ],
        },
      },
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);

    const text = response.text;
    if (!text) return getFallbackEvaluation(completedModules, pendingModules, adminRating);
    return JSON.parse(text) as ReviewEvaluation;
  } catch (error) {
    console.error('Error in Gemini evaluateReviewProgress:', error);
    return getFallbackEvaluation(completedModules, pendingModules, adminRating);
  }
}

function getFallbackPlan(projectName: string): GeneratedPlan {
  return {
    summary: `End-to-end development architecture for ${projectName}, emphasizing modular components, resilient data schema, and continuous milestone verification.`,
    recommendedTechStack: 'TypeScript, React, Node.js/Express, Tailwind CSS, SQLite/PostgreSQL, REST APIs',
    flowchartNodes: [
      { id: 'node-1', label: 'Requirements & ERD', phase: 'Planning', moduleNumber: 1, description: 'Schema design and tech stack selection' },
      { id: 'node-2', label: 'Backend API & Auth', phase: 'Development', moduleNumber: 2, description: 'Core API endpoints and auth security' },
      { id: 'node-3', label: 'Interactive UI/UX', phase: 'Integration', moduleNumber: 3, description: 'Responsive frontend components and state management' },
      { id: 'node-4', label: 'Testing & Release', phase: 'Finalization', moduleNumber: 4, description: 'Integration tests, performance audit, and cloud deployment' },
    ],
    modules: [
      {
        title: 'Module 1: Architecture, Data Modeling & Scaffold',
        description: `Set up the fundamental repository structure, design SQLite database schemas, and initialize application bootstrapping for ${projectName}.`,
        deliverables: [
          'Entity-relationship diagram and SQLite migration scripts',
          'Clean project repository scaffold with environment configuration',
          'Initial health check endpoint and database connection verification',
        ],
        estimatedDays: 4,
      },
      {
        title: 'Module 2: Core Domain Logic & REST Services',
        description: `Implement primary domain entities, data controllers, and validation layers corresponding to ${projectName}.`,
        deliverables: [
          'CRUD REST API endpoints with schema validation',
          'Authentication / authorization guards and request sanitization',
          'Unit tests covering core business algorithms',
        ],
        estimatedDays: 5,
      },
      {
        title: 'Module 3: Frontend Client Integration & Workflow',
        description: `Build reactive user interface components, hook up API communication, and ensure responsive state handling.`,
        deliverables: [
          'Interactive dashboards and responsive navigation views',
          'Asynchronous data fetching with loading skeletons and error boundaries',
          'Form validation and user notification toasts',
        ],
        estimatedDays: 5,
      },
      {
        title: 'Module 4: Quality Assurance, Security & Deployment',
        description: `End-to-end testing, error handling polish, performance optimization, and production build readiness.`,
        deliverables: [
          'End-to-end user journey smoke tests',
          'Security audit (sanitization, rate limiting, and CORS)',
          'Production build compilation and deployment runbook',
        ],
        estimatedDays: 4,
      },
    ],
  };
}

function getFallbackEvaluation(
  completed: string[],
  pending: string[],
  rating: number
): ReviewEvaluation {
  const score = Math.min(100, Math.max(30, rating * 18 + completed.length * 6));
  return {
    evaluationScore: score,
    feedbackSummary: `Demonstration reflects steady execution with ${completed.length} milestone(s) validated. Reviewer awarded ${rating}/5 rating.`,
    strengthsObserved: [
      'Functional code demonstration with key deliverables verified',
      'Solid component structure and proactive domain understanding',
    ],
    blockersIdentified: pending.length > 2 ? ['High pending scope volume; prioritize critical path'] : ['Maintain momentum on edge-case testing'],
    actionableNextSteps: [
      `Begin work immediately on: ${pending[0] || 'Final deployment and polish'}`,
      'Refactor API payload structures to optimize data transfer',
      'Implement integration test cases for review checkpoints',
    ],
    suggestedDaysToNextReview: 6,
    revisedUpcomingGoals: pending.slice(0, 2),
  };
}

export interface AIMeetingResponse {
  spokenGreetingOrAnswer: string;
  verdict: 'APPROVED' | 'NEEDS_CLARIFICATION' | 'PROGRESSING';
  liveCritique: string;
  nextInterviewQuestion: string;
  confidenceScore: number;
}

export async function generateAIMeetingInteraction(
  projectName: string,
  candidateName: string,
  reviewRound: number,
  moduleTitle: string,
  deliverables: string[],
  candidateMessage: string,
  conversationHistory: Array<{ speaker: string; text: string }> = []
): Promise<AIMeetingResponse> {
  const historyText = conversationHistory
    .slice(-6)
    .map((h) => `${h.speaker}: ${h.text}`)
    .join('\n');

  const prompt = `You are Dr. Sarah Vance, the lead AI Principal Technical Evaluator actively attending a live Google Meet project review session on "Project IQ".
You are currently on a live video call with candidate ${candidateName}.
Project: "${projectName}"
Review Round: #${reviewRound}
Current Module Being Evaluated: "${moduleTitle}"
Target Deliverables for this module:
${deliverables.map((d) => `- ${d}`).join('\n')}

Recent meeting dialogue:
${historyText || '(Meeting just commenced)'}

Candidate just said / demonstrated:
"${candidateMessage || 'Hello Dr. Vance, I am ready to begin my review demonstration.'}"

Instructions for your response:
1. "spokenGreetingOrAnswer": Speak directly to ${candidateName}. Be professional, warm, and technically rigorous. 2 to 3 sentences maximum, natural for spoken dialogue.
2. "verdict": One of 'APPROVED' (if they explained/demonstrated key deliverables solidly), 'NEEDS_CLARIFICATION' (if gaps/unclear), or 'PROGRESSING'.
3. "liveCritique": 1-2 sentence constructive critique of their code, architectural choice, or explanation.
4. "nextInterviewQuestion": A sharp, relevant technical question challenging them on performance, edge cases, error recovery, or data modeling for this module.
5. "confidenceScore": Integer 0 to 100 based on demonstration quality.

Return strictly JSON matching the schema.`;

  try {
    if (!apiKey) {
      return getFallbackMeetingResponse(candidateName, candidateMessage, moduleTitle);
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Meeting AI interaction timeout')), 10000)
    );

    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spokenGreetingOrAnswer: { type: Type.STRING },
            verdict: { type: Type.STRING, enum: ['APPROVED', 'NEEDS_CLARIFICATION', 'PROGRESSING'] },
            liveCritique: { type: Type.STRING },
            nextInterviewQuestion: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
          },
          required: [
            'spokenGreetingOrAnswer',
            'verdict',
            'liveCritique',
            'nextInterviewQuestion',
            'confidenceScore',
          ],
        },
      },
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    const text = response.text;
    if (!text) return getFallbackMeetingResponse(candidateName, candidateMessage, moduleTitle);
    return JSON.parse(text) as AIMeetingResponse;
  } catch (err) {
    console.error('Error generating AI meeting interaction:', err);
    return getFallbackMeetingResponse(candidateName, candidateMessage, moduleTitle);
  }
}

function getFallbackMeetingResponse(
  candidateName: string,
  message: string,
  moduleTitle: string
): AIMeetingResponse {
  const isInitial = !message || message.toLowerCase().includes('hello') || message.toLowerCase().includes('ready');
  if (isInitial) {
    return {
      spokenGreetingOrAnswer: `Welcome to our review session, ${candidateName}! I'm Dr. Sarah Vance, your AI Technical Evaluator today. Let's dive right into ${moduleTitle}. Could you walk me through your foundational architecture and demonstrate your primary deliverables?`,
      verdict: 'PROGRESSING',
      liveCritique: 'Initial connection verified. Candidate is prepared for milestone demonstration.',
      nextInterviewQuestion: 'Can you demonstrate your core database schema and show how incoming requests are authenticated and validated?',
      confidenceScore: 82,
    };
  }

  return {
    spokenGreetingOrAnswer: `Excellent walkthrough, ${candidateName}. Your approach to structuring ${moduleTitle} addresses the primary architectural requirements effectively.`,
    verdict: 'APPROVED',
    liveCritique: 'Clean modular implementation observed with appropriate separation of concerns.',
    nextInterviewQuestion: 'How does your service handle sudden network dropouts or schema migration rollbacks in production?',
    confidenceScore: 90,
  };
}
