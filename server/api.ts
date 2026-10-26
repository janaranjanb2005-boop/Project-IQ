import express, { Request, Response } from 'express';
import multer from 'multer';
import { getDb, saveDb } from './db';
import {
  parseExcelBuffer,
  processIngestedRecords,
  generateSampleExcelBuffer,
  IngestedRecord,
} from './excelParser';
import {
  evaluateReviewProgress,
  generateProjectDecomposition,
  generateAIMeetingInteraction,
} from './gemini';
import {
  generateGoogleMeetLink,
  calculateReviewDate,
  generateRandomReviewDate,
  generateIcsCalendar,
} from './scheduler';
import { sendProjectEmail } from './emailService';
import crypto from 'crypto';

export const apiRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 1. GET /api/projects - List all projects with user details and latest review
apiRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const query = `
      SELECT 
        p.id, p.user_id, p.name, p.description, p.tech_stack, p.status,
        p.completion_percentage, p.current_module_index, p.total_modules,
        p.created_at, p.updated_at,
        u.name as user_name, u.email as user_email
      FROM projects p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.updated_at DESC
    `;

    const projectsRes = db.exec(query);
    if (!projectsRes.length) {
      return res.json({ projects: [] });
    }

    const columns = projectsRes[0].columns;
    const rows = projectsRes[0].values;

    const projects = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });

      // Get modules for this project
      const modRes = db.exec(
        `SELECT id, order_index, title, description, deliverables, estimated_days, status, completed_at 
         FROM modules WHERE project_id = '${obj.id}' ORDER BY order_index ASC`
      );
      const modules = modRes.length
        ? modRes[0].values.map((m) => ({
            id: m[0],
            orderIndex: m[1],
            title: m[2],
            description: m[3],
            deliverables: m[4] ? JSON.parse(String(m[4])) : [],
            estimatedDays: m[5],
            status: m[6],
            completedAt: m[7],
          }))
        : [];

      // Get latest review
      const revRes = db.exec(
        `SELECT id, review_round, scheduled_date, meet_link, status, admin_notes, demo_rating, ai_evaluation, conducted_at
         FROM reviews WHERE project_id = '${obj.id}' ORDER BY review_round DESC LIMIT 1`
      );
      const latestReview = revRes.length && revRes[0].values.length
        ? {
            id: revRes[0].values[0][0],
            reviewRound: revRes[0].values[0][1],
            scheduledDate: revRes[0].values[0][2],
            meetLink: revRes[0].values[0][3],
            status: revRes[0].values[0][4],
            adminNotes: revRes[0].values[0][5],
            demoRating: revRes[0].values[0][6],
            aiEvaluation: revRes[0].values[0][7],
            conductedAt: revRes[0].values[0][8],
          }
        : null;

      // Count emails sent
      const emailRes = db.exec(`SELECT COUNT(*) FROM email_logs WHERE project_id = '${obj.id}'`);
      const emailCount = emailRes.length ? Number(emailRes[0].values[0][0]) : 0;

      return {
        id: obj.id,
        name: obj.name,
        description: obj.description,
        techStack: obj.tech_stack,
        status: obj.status,
        completionPercentage: obj.completion_percentage,
        totalModules: obj.total_modules,
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
        user: {
          id: obj.user_id,
          name: obj.user_name,
          email: obj.user_email,
        },
        modules,
        latestReview,
        emailCount,
      };
    });

    res.json({ projects });
  } catch (err: unknown) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to retrieve projects' });
  }
});

// 2. GET /api/projects/:id - Project Detail
apiRouter.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const projRes = db.exec(`
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = '${id.replace(/'/g, "''")}'
    `);

    if (!projRes.length || !projRes[0].values.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const row = projRes[0].values[0];
    const cols = projRes[0].columns;
    const project: Record<string, unknown> = {};
    cols.forEach((col, idx) => {
      project[col] = row[idx];
    });

    // Modules
    const modRes = db.exec(
      `SELECT id, order_index, title, description, deliverables, estimated_days, status, completed_at
       FROM modules WHERE project_id = '${id}' ORDER BY order_index ASC`
    );
    const modules = modRes.length
      ? modRes[0].values.map((m) => ({
          id: m[0],
          orderIndex: m[1],
          title: m[2],
          description: m[3],
          deliverables: m[4] ? JSON.parse(String(m[4])) : [],
          estimatedDays: m[5],
          status: m[6],
          completedAt: m[7],
        }))
      : [];

    // All Reviews
    const revRes = db.exec(
      `SELECT id, review_round, scheduled_date, meet_link, status, admin_notes, demo_rating, ai_evaluation, ai_next_steps, conducted_at, created_at
       FROM reviews WHERE project_id = '${id}' ORDER BY review_round ASC`
    );
    const reviews = revRes.length
      ? revRes[0].values.map((r) => ({
          id: r[0],
          reviewRound: r[1],
          scheduledDate: r[2],
          meetLink: r[3],
          status: r[4],
          adminNotes: r[5],
          demoRating: r[6],
          aiEvaluation: r[7] ? JSON.parse(String(r[7])) : null,
          aiNextSteps: r[8] ? JSON.parse(String(r[8])) : [],
          conductedAt: r[9],
          createdAt: r[10],
        }))
      : [];

    // All Emails
    const emailRes = db.exec(
      `SELECT id, recipient_email, recipient_name, subject, template_type, content_html, sent_at, status
       FROM email_logs WHERE project_id = '${id}' ORDER BY sent_at DESC`
    );
    const emails = emailRes.length
      ? emailRes[0].values.map((e) => ({
          id: e[0],
          recipientEmail: e[1],
          recipientName: e[2],
          subject: e[3],
          templateType: e[4],
          contentHtml: e[5],
          sentAt: e[6],
          status: e[7],
        }))
      : [];

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        techStack: project.tech_stack,
        status: project.status,
        completionPercentage: project.completion_percentage,
        totalModules: project.total_modules,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        user: {
          id: project.user_id,
          name: project.user_name,
          email: project.user_email,
        },
        modules,
        reviews,
        emails,
      },
    });
  } catch (err: unknown) {
    console.error('Error fetching project detail:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

// 3. POST /api/upload-excel - Ingest Excel or CSV file
apiRouter.post('/upload-excel', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let records: IngestedRecord[] = [];

    if (req.file) {
      records = parseExcelBuffer(req.file.buffer);
    } else if (req.body.records && Array.isArray(req.body.records)) {
      records = req.body.records;
    } else {
      return res.status(400).json({ error: 'Please upload an Excel/CSV file or pass JSON records.' });
    }

    if (records.length === 0) {
      return res.status(400).json({
        error:
          'No valid records found. Ensure your sheet has columns: "User Name", "Email ID", "Project Name", and "Date of Upload".',
      });
    }

    const result = await processIngestedRecords(records);
    res.json({
      message: `Successfully ingested and initiated AI pipeline for ${result.processedCount} project(s).`,
      ...result,
    });
  } catch (err: unknown) {
    console.error('Error handling upload:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to ingest file' });
  }
});

// 4. GET /api/sample-excel - Download Sample Excel template
apiRouter.get('/sample-excel', (_req: Request, res: Response) => {
  try {
    const buffer = generateSampleExcelBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="project_iq_template.xlsx"');
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to generate sample Excel' });
  }
});

// 5. POST /api/seed-demo - Instant 1-click Demo Data
apiRouter.post('/seed-demo', async (_req: Request, res: Response) => {
  try {
    const demoRecords: IngestedRecord[] = [
      {
        userName: 'Alex Rivera',
        emailId: 'alex.rivera@example.com',
        projectName: 'Smart Urban Traffic Signal Optimizer with Computer Vision',
        dateOfUpload: new Date().toISOString().split('T')[0],
      },
      {
        userName: 'Maya Chen',
        emailId: 'maya.chen@example.com',
        projectName: 'Decentralized Peer-to-Peer Renewable Energy Trading Platform',
        dateOfUpload: new Date().toISOString().split('T')[0],
      },
      {
        userName: 'David Miller',
        emailId: 'david.miller@example.com',
        projectName: 'Autonomous Warehouse Robot Fleet Dispatcher & Routing',
        dateOfUpload: new Date().toISOString().split('T')[0],
      },
    ];

    const result = await processIngestedRecords(demoRecords);
    res.json({
      message: `Successfully seeded ${result.processedCount} sample projects through Gemini AI pipeline.`,
      ...result,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to seed demo data' });
  }
});

// 6. POST /api/reviews/conduct - Interactive Review & AI Analysis & Recursive scheduling
apiRouter.post('/reviews/conduct', async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      reviewId,
      completedModuleIds = [],
      adminRating = 4,
      adminNotes = '',
      overrideDaysUntilNext,
    } = req.body;

    if (!projectId || !reviewId) {
      return res.status(400).json({ error: 'Missing projectId or reviewId' });
    }

    const db = await getDb();

    // 1. Fetch project and user
    const pRes = db.exec(`
      SELECT p.id, p.name, u.name as user_name, u.email as user_email
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = '${projectId}'
    `);
    if (!pRes.length || !pRes[0].values.length) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const [pId, projectName, userName, userEmail] = pRes[0].values[0];

    // 2. Fetch all modules
    const mRes = db.exec(
      `SELECT id, order_index, title, description, deliverables, estimated_days, status
       FROM modules WHERE project_id = '${projectId}' ORDER BY order_index ASC`
    );
    const allModules = mRes[0].values.map((m) => ({
      id: String(m[0]),
      orderIndex: Number(m[1]),
      title: String(m[2]),
      description: String(m[3]),
      deliverables: m[4] ? JSON.parse(String(m[4])) : [],
      estimatedDays: Number(m[5]),
      status: String(m[6]),
    }));

    // 3. Mark completed modules in DB
    const nowIso = new Date().toISOString();
    for (const mod of allModules) {
      const isCompleted = completedModuleIds.includes(mod.id);
      const newStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
      const completedAt = isCompleted ? nowIso : null;

      db.run(`UPDATE modules SET status = ?, completed_at = ? WHERE id = ?`, [
        newStatus,
        completedAt,
        mod.id,
      ]);
    }

    const totalCount = allModules.length;
    const completedCount = completedModuleIds.length;
    const completionPercentage = Math.round((completedCount / totalCount) * 100);
    const isAllCompleted = completedCount >= totalCount;

    // 4. Fetch current review details to get round
    const rRes = db.exec(`SELECT review_round FROM reviews WHERE id = '${reviewId}'`);
    const currentRound = rRes.length ? Number(rRes[0].values[0][0]) : 1;

    // 5. Trigger Gemini AI Evaluation
    const completedTitles = allModules
      .filter((m) => completedModuleIds.includes(m.id))
      .map((m) => m.title);
    const pendingTitles = allModules
      .filter((m) => !completedModuleIds.includes(m.id))
      .map((m) => m.title);

    const evaluation = await evaluateReviewProgress(
      String(projectName),
      completedTitles,
      pendingTitles,
      Number(adminRating),
      String(adminNotes),
      currentRound
    );

    // 6. Complete current review record
    db.run(
      `UPDATE reviews 
       SET status = 'COMPLETED', admin_notes = ?, demo_rating = ?, ai_evaluation = ?, ai_next_steps = ?, conducted_at = ?
       WHERE id = ?`,
      [
        adminNotes,
        adminRating,
        JSON.stringify(evaluation),
        JSON.stringify(evaluation.actionableNextSteps),
        nowIso,
        reviewId,
      ]
    );

    // 7. Recursive Iteration Check
    let nextReview = null;
    let newProjectStatus = 'IN_ITERATION_REVIEW';

    if (isAllCompleted) {
      // All modules complete!
      newProjectStatus = 'COMPLETED';
      db.run(
        `UPDATE projects 
         SET status = 'COMPLETED', completion_percentage = 100, updated_at = ?
         WHERE id = ?`,
        [nowIso, projectId]
      );

      // Send Congratulations Email
      await sendProjectEmail({
        projectId: String(projectId),
        recipientEmail: String(userEmail),
        recipientName: String(userName),
        projectName: String(projectName),
        subject: `🏆 [Project IQ] Final Project Verified: "${projectName}" is 100% Complete!`,
        templateType: 'FINAL_COMPLETION',
        modules: allModules,
        evaluationScore: evaluation.evaluationScore,
        aiFeedback: evaluation.feedbackSummary,
      });
    } else {
      // Schedule Next Review Round Recursively!
      const nextRound = currentRound + 1;
      const daysOffset = overrideDaysUntilNext || evaluation.suggestedDaysToNextReview || 7;
      const nextDate = calculateReviewDate(daysOffset);
      const nextMeetLink = generateGoogleMeetLink();
      const nextReviewId = 'rev_' + crypto.randomUUID().slice(0, 8);

      db.run(
        `INSERT INTO reviews (id, project_id, review_round, scheduled_date, meet_link, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nextReviewId, projectId, nextRound, nextDate, nextMeetLink, 'SCHEDULED', nowIso]
      );

      nextReview = {
        id: nextReviewId,
        reviewRound: nextRound,
        scheduledDate: nextDate,
        meetLink: nextMeetLink,
        status: 'SCHEDULED',
      };

      db.run(
        `UPDATE projects 
         SET status = 'REVIEW_SCHEDULED', completion_percentage = ?, current_module_index = ?, updated_at = ?
         WHERE id = ?`,
        [completionPercentage, completedCount, nowIso, projectId]
      );

      // Send Iteration Review Brief Email
      await sendProjectEmail({
        projectId: String(projectId),
        recipientEmail: String(userEmail),
        recipientName: String(userName),
        projectName: String(projectName),
        subject: `📈 [Project IQ] Round #${currentRound} Completed & Round #${nextRound} Scheduled`,
        templateType: 'ITERATION_UPDATE',
        meetLink: nextMeetLink,
        reviewDate: nextDate,
        reviewRound: nextRound,
        evaluationScore: evaluation.evaluationScore,
        aiFeedback: evaluation.feedbackSummary,
        nextSteps: evaluation.actionableNextSteps,
        modules: allModules,
      });
    }

    saveDb();

    res.json({
      success: true,
      isAllCompleted,
      completionPercentage,
      evaluation,
      nextReview,
      projectStatus: newProjectStatus,
    });
  } catch (err: unknown) {
    console.error('Error conducting review:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to conduct review' });
  }
});

// 7. GET /api/calendar/:reviewId.ics - Download Calendar Invite
apiRouter.get('/calendar/:reviewId', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const db = await getDb();

    const rRes = db.exec(`
      SELECT r.review_round, r.scheduled_date, r.meet_link, p.name, u.name as user_name
      FROM reviews r
      JOIN projects p ON r.project_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE r.id = '${reviewId.replace(/'/g, "''")}'
    `);

    if (!rRes.length || !rRes[0].values.length) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const [round, scheduledDate, meetLink, projectName, userName] = rRes[0].values[0];
    const title = `Project IQ Review #${round}: ${projectName}`;
    const description = `Project Review Session for ${userName} (${projectName}). Prepare repository, progress demo, and blocker discussions.`;

    const icsContent = generateIcsCalendar(
      String(title),
      String(description),
      String(meetLink),
      String(scheduledDate)
    );

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="project_iq_review_${round}.ics"`);
    res.send(icsContent);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to generate calendar invite' });
  }
});

// 8. GET /api/flowchart/:projectId - Get or regenerate Mermaid flowchart & AI breakdown
apiRouter.get('/flowchart/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const db = await getDb();

    const pRes = db.exec(`SELECT name, description, tech_stack FROM projects WHERE id = '${projectId}'`);
    if (!pRes.length || !pRes[0].values.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [name, description, techStack] = pRes[0].values[0];

    const mRes = db.exec(
      `SELECT order_index, title, description, deliverables, status FROM modules WHERE project_id = '${projectId}' ORDER BY order_index ASC`
    );

    const modules = mRes.length
      ? mRes[0].values.map((m) => ({
          order: m[0],
          title: m[1],
          description: m[2],
          deliverables: m[3] ? JSON.parse(String(m[3])) : [],
          status: m[4],
        }))
      : [];

    res.json({
      projectName: name,
      description,
      techStack,
      modules,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch flowchart' });
  }
});

// 9. POST /api/reset - Clear database
apiRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM email_logs;');
    db.run('DELETE FROM reviews;');
    db.run('DELETE FROM modules;');
    db.run('DELETE FROM projects;');
    db.run('DELETE FROM users;');
    saveDb();
    res.json({ success: true, message: 'Database reset successfully.' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// 10. POST /api/randomize-schedules - Randomize meeting date and timing for each review
apiRouter.post('/randomize-schedules', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const revRes = db.exec(`SELECT id, project_id, review_round FROM reviews WHERE status = 'SCHEDULED'`);
    if (!revRes.length || !revRes[0].values.length) {
      return res.json({ message: 'No scheduled reviews found to randomize.', updatedCount: 0 });
    }

    const rows = revRes[0].values;
    const possibleHours = [9, 10, 11, 13, 14, 15, 16];
    const possibleMinutes = [0, 15, 30, 45];
    let updatedCount = 0;

    // Stagger dates & times across business days and varied hours
    rows.forEach((row, index) => {
      const reviewId = String(row[0]);
      // Days offset: e.g. 2, 4, 6, 8, etc. with random jitter
      const daysOffset = 2 + (index * 2) + Math.floor(Math.random() * 2);
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);

      // Avoid Saturday (6) and Sunday (0)
      if (d.getDay() === 6) d.setDate(d.getDate() + 2);
      else if (d.getDay() === 0) d.setDate(d.getDate() + 1);

      const hour = possibleHours[index % possibleHours.length];
      const minute = possibleMinutes[(index * 3) % possibleMinutes.length];
      d.setHours(hour, minute, 0, 0);

      const newDateIso = d.toISOString();
      const newMeetLink = generateGoogleMeetLink();

      db.run(`UPDATE reviews SET scheduled_date = ?, meet_link = ? WHERE id = ?`, [
        newDateIso,
        newMeetLink,
        reviewId,
      ]);
      updatedCount++;
    });

    saveDb();
    res.json({
      success: true,
      message: `Successfully randomized meeting dates and timings for ${updatedCount} scheduled review(s).`,
      updatedCount,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to randomize schedules' });
  }
});

// 11. POST /api/reviews/:id/reschedule - Update specific review's date and timing
apiRouter.post('/reviews/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledDate, meetLink, isRandom } = req.body;
    const db = await getDb();

    let newDate = scheduledDate;
    let newMeet = meetLink;

    if (isRandom || !newDate) {
      newDate = generateRandomReviewDate(2, 10);
    }
    if (!newMeet) {
      newMeet = generateGoogleMeetLink();
    }

    db.run(`UPDATE reviews SET scheduled_date = ?, meet_link = ? WHERE id = ?`, [
      newDate,
      newMeet,
      id,
    ]);
    saveDb();

    res.json({
      success: true,
      message: 'Review rescheduled successfully.',
      scheduledDate: newDate,
      meetLink: newMeet,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to reschedule review' });
  }
});

// 12. POST /api/meeting/ai-interact - Live Gemini AI Reviewer meeting participant
apiRouter.post('/meeting/ai-interact', async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      reviewId,
      candidateMessage,
      conversationHistory = [],
      currentModuleId,
    } = req.body;

    const db = await getDb();

    // Fetch project and user details
    const pRes = db.exec(`
      SELECT p.name, u.name as user_name
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = '${projectId}'
    `);

    if (!pRes.length || !pRes[0].values.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [projectName, userName] = pRes[0].values[0];

    // Fetch review round
    const rRes = db.exec(`SELECT review_round FROM reviews WHERE id = '${reviewId}'`);
    const reviewRound = rRes.length && rRes[0].values.length ? Number(rRes[0].values[0][0]) : 1;

    // Fetch current module details
    let moduleTitle = 'Current Milestone Module';
    let deliverables: string[] = [];

    if (currentModuleId) {
      const mRes = db.exec(`SELECT title, deliverables FROM modules WHERE id = '${currentModuleId}'`);
      if (mRes.length && mRes[0].values.length) {
        moduleTitle = String(mRes[0].values[0][0]);
        deliverables = mRes[0].values[0][1] ? JSON.parse(String(mRes[0].values[0][1])) : [];
      }
    } else {
      // Default to first pending or in_progress module
      const mRes = db.exec(
        `SELECT title, deliverables FROM modules WHERE project_id = '${projectId}' AND status != 'COMPLETED' ORDER BY order_index ASC LIMIT 1`
      );
      if (mRes.length && mRes[0].values.length) {
        moduleTitle = String(mRes[0].values[0][0]);
        deliverables = mRes[0].values[0][1] ? JSON.parse(String(mRes[0].values[0][1])) : [];
      }
    }

    // Call Gemini AI Evaluator Bot
    const aiResponse = await generateAIMeetingInteraction(
      String(projectName),
      String(userName),
      reviewRound,
      moduleTitle,
      deliverables,
      String(candidateMessage || ''),
      conversationHistory
    );

    res.json({
      success: true,
      ...aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Error in AI meeting interaction:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI interaction failed' });
  }
});
