import { getDb, saveDb } from './db';
import crypto from 'crypto';

export interface EmailPayload {
  projectId: string;
  recipientEmail: string;
  recipientName: string;
  projectName: string;
  subject: string;
  templateType: 'INITIAL_BREAKDOWN' | 'ITERATION_UPDATE' | 'FINAL_COMPLETION';
  meetLink?: string;
  reviewDate?: string;
  reviewRound?: number;
  modules?: Array<{ title: string; deliverables: string[]; estimatedDays: number; status?: string }>;
  evaluationScore?: number;
  aiFeedback?: string;
  nextSteps?: string[];
}

export async function sendProjectEmail(payload: EmailPayload): Promise<{ id: string; success: boolean; html: string }> {
  const db = await getDb();
  const id = 'email_' + crypto.randomUUID().slice(0, 8);
  const sentAt = new Date().toISOString();

  const html = generateEmailHtml(payload);

  db.run(
    `INSERT INTO email_logs (id, project_id, recipient_email, recipient_name, subject, template_type, content_html, sent_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      payload.projectId,
      payload.recipientEmail,
      payload.recipientName,
      payload.subject,
      payload.templateType,
      html,
      sentAt,
      'DELIVERED',
    ]
  );
  saveDb();

  return { id, success: true, html };
}

function generateEmailHtml(payload: EmailPayload): string {
  const {
    recipientName,
    projectName,
    templateType,
    meetLink,
    reviewDate,
    reviewRound = 1,
    modules = [],
    evaluationScore,
    aiFeedback,
    nextSteps = [],
  } = payload;

  const formattedDate = reviewDate ? new Date(reviewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : 'TBD';

  if (templateType === 'INITIAL_BREAKDOWN') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 14px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
          .logo { font-size: 22px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; margin-bottom: 24px; display: flex; align-items: center; }
          .logo span { color: #38bdf8; }
          h1 { font-size: 20px; font-weight: 700; color: #f1f5f9; margin-top: 0; }
          p { color: #94a3b8; line-height: 1.6; font-size: 15px; }
          .highlight-card { background: #0f172a; border: 1px solid #38bdf8; border-radius: 10px; padding: 18px; margin: 20px 0; }
          .module-item { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
          .module-title { font-weight: 600; color: #38bdf8; font-size: 15px; margin-bottom: 6px; }
          .deliverable { font-size: 13px; color: #cbd5e1; margin-left: 14px; margin-bottom: 4px; }
          .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px; }
          .btn-google { background: #2563eb; }
          .footer { margin-top: 32px; border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">PROJECT <span>IQ</span> &bull; Automated Review Hub</div>
          <h1>Welcome, ${recipientName}!</h1>
          <p>Your project <strong>"${projectName}"</strong> has been successfully ingested and processed by Project IQ's AI Engine. We have generated your tailored milestone roadmap and scheduled your <strong>First Project Review</strong>.</p>
          
          <div class="highlight-card">
            <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: 700; margin-bottom: 8px;">Review Milestone #1 Scheduled</div>
            <div style="font-size: 17px; font-weight: 700; color: #f8fafc; margin-bottom: 6px;">Date: ${formattedDate}</div>
            <p style="margin: 0 0 14px 0; color: #cbd5e1; font-size: 14px;">Join your live demo review via Google Meet:</p>
            <a href="${meetLink}" target="_blank" class="btn btn-google">Join Google Meet (${meetLink})</a>
          </div>

          <h3 style="color: #f1f5f9; margin-top: 28px; font-size: 16px;">AI-Generated Project Roadmap:</h3>
          ${modules
            .map(
              (m, i) => `
            <div class="module-item">
              <div class="module-title">${m.title} <span style="font-size: 12px; color: #94a3b8; font-weight: 400;">(~${m.estimatedDays} days)</span></div>
              <ul style="margin: 6px 0 0 0; padding-left: 18px;">
                ${m.deliverables.map((d) => `<li class="deliverable">${d}</li>`).join('')}
              </ul>
            </div>
          `
            )
            .join('')}

          <p style="margin-top: 24px;">Please have your code repository ready and live demonstration prepared prior to your scheduled review time.</p>
          
          <div class="footer">
            Automated by Project IQ System &bull; Powered by Google Gemini AI & Google Meet Integration
          </div>
        </div>
      </body>
      </html>
    `;
  }

  if (templateType === 'ITERATION_UPDATE') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 14px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
          .logo { font-size: 22px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; margin-bottom: 24px; }
          .logo span { color: #38bdf8; }
          h1 { font-size: 20px; font-weight: 700; color: #f1f5f9; margin-top: 0; }
          p { color: #94a3b8; line-height: 1.6; font-size: 15px; }
          .score-badge { display: inline-block; background: #10b981; color: #ffffff; font-weight: 800; font-size: 18px; padding: 6px 14px; border-radius: 20px; }
          .card { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 18px; margin: 20px 0; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px; }
          .step-item { color: #e2e8f0; font-size: 14px; margin-bottom: 8px; }
          .footer { margin-top: 32px; border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">PROJECT <span>IQ</span> &bull; Iteration Evaluation</div>
          <h1>Review Round #${reviewRound} Evaluation Completed</h1>
          <p>Hi ${recipientName}, your live demo for <strong>"${projectName}"</strong> has been reviewed and analyzed by the AI Evaluation Pipeline.</p>
          
          <div style="margin: 16px 0;">
            <span style="font-size: 14px; color: #94a3b8; margin-right: 10px;">Review Score:</span>
            <span class="score-badge">${evaluationScore ?? 85}/100</span>
          </div>

          <div class="card" style="border-left: 4px solid #10b981;">
            <div style="font-weight: 600; color: #f8fafc; font-size: 15px; margin-bottom: 6px;">AI Evaluator Insights:</div>
            <div style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">${aiFeedback || 'Great progress demonstrated across project milestones.'}</div>
          </div>

          <div class="card">
            <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">Next Review Milestone Scheduled</div>
            <div style="font-size: 16px; font-weight: 700; color: #f8fafc; margin-bottom: 8px;">Date: ${formattedDate}</div>
            <a href="${meetLink}" target="_blank" class="btn">Join Next Google Meet (${meetLink})</a>
          </div>

          <h3 style="color: #f1f5f9; margin-top: 24px; font-size: 15px;">Target Goals for Next Review:</h3>
          <ol style="padding-left: 20px; margin-top: 8px;">
            ${nextSteps.map((step) => `<li class="step-item">${step}</li>`).join('')}
          </ol>

          <div class="footer">
            Project IQ Recursive Automation Engine &bull; Automated Dispatch
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // FINAL_COMPLETION
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
        .container { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 14px; border: 1px solid #10b981; padding: 36px; text-align: center; }
        .badge { font-size: 40px; margin-bottom: 12px; }
        h1 { font-size: 24px; font-weight: 800; color: #10b981; margin: 0 0 12px 0; }
        p { color: #cbd5e1; font-size: 15px; line-height: 1.6; }
        .cert-card { background: #0f172a; border: 2px dashed #10b981; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: left; }
        .footer { margin-top: 32px; border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge">&#127942;</div>
        <h1>Congratulations, ${recipientName}!</h1>
        <p>You have successfully completed <strong>100% of all milestones</strong> for <strong>"${projectName}"</strong> through the Project IQ automated review cycle!</p>
        
        <div class="cert-card">
          <div style="font-size: 12px; text-transform: uppercase; color: #10b981; font-weight: 700; letter-spacing: 1px;">Project IQ Milestone Completion</div>
          <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 4px;">${projectName}</div>
          <div style="font-size: 14px; color: #94a3b8; margin-top: 4px;">Developer: ${recipientName} (${payload.recipientEmail})</div>
          <div style="font-size: 14px; color: #94a3b8; margin-top: 4px;">Total Modules Validated: ${modules.length}</div>
          <div style="font-size: 14px; color: #10b981; font-weight: 600; margin-top: 8px;">Status: Production Ready & Evaluated</div>
        </div>

        <p>All review rounds have been successfully concluded. Great work engineering and demonstrating your deliverables!</p>

        <div class="footer">
          Project IQ Autonomous Review Schedule System &bull; Google AI Studio
        </div>
      </div>
    </body>
    </html>
  `;
}
