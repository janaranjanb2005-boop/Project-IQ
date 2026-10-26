import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { getDb, saveDb } from './db';
import { generateProjectDecomposition } from './gemini';
import { generateGoogleMeetLink, calculateReviewDate } from './scheduler';
import { sendProjectEmail } from './emailService';

export interface IngestedRecord {
  userName: string;
  emailId: string;
  projectName: string;
  dateOfUpload: string;
}

export function parseExcelBuffer(buffer: Buffer): IngestedRecord[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const records: IngestedRecord[] = [];

  for (const row of rawRows) {
    const keys = Object.keys(row);

    const findKey = (candidates: string[]) => {
      const match = keys.find((k) =>
        candidates.includes(k.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      return match ? String(row[match]).trim() : '';
    };

    const userName = findKey(['username', 'name', 'studentname', 'developername']);
    const emailId = findKey(['emailid', 'email', 'mail', 'useremail']);
    const projectName = findKey(['projectname', 'project', 'title', 'topic']);
    const dateOfUpload =
      findKey(['dateofupload', 'date', 'uploaddate', 'createdat']) ||
      new Date().toISOString().split('T')[0];

    if (userName && emailId && projectName) {
      records.push({
        userName,
        emailId,
        projectName,
        dateOfUpload,
      });
    }
  }

  return records;
}

export async function processIngestedRecords(records: IngestedRecord[]): Promise<{
  processedCount: number;
  projectIds: string[];
  errors: string[];
}> {
  const db = await getDb();
  const projectIds: string[] = [];
  const errors: string[] = [];

  for (const record of records) {
    try {
      // 1. Find or create user
      const userRes = db.exec(`SELECT id FROM users WHERE email = '${record.emailId.replace(/'/g, "''")}'`);
      let userId: string;

      if (userRes.length > 0 && userRes[0].values.length > 0) {
        userId = String(userRes[0].values[0][0]);
      } else {
        userId = 'usr_' + crypto.randomUUID().slice(0, 8);
        db.run(`INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)`, [
          userId,
          record.userName,
          record.emailId,
          new Date().toISOString(),
        ]);
      }

      // 2. Create Project
      const projectId = 'proj_' + crypto.randomUUID().slice(0, 8);
      const createdAt = new Date().toISOString();

      db.run(
        `INSERT INTO projects (id, user_id, name, description, tech_stack, status, completion_percentage, current_module_index, total_modules, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          userId,
          record.projectName,
          'Analyzing project architecture...',
          '',
          'ANALYZING',
          0,
          0,
          0,
          createdAt,
          createdAt,
        ]
      );
      saveDb();

      // 3. Trigger Gemini Decomposition Pipeline
      const plan = await generateProjectDecomposition(record.projectName);

      // 4. Save Modules
      let order = 1;
      const savedModules: Array<{ title: string; deliverables: string[]; estimatedDays: number }> = [];

      for (const mod of plan.modules) {
        const modId = 'mod_' + crypto.randomUUID().slice(0, 8);
        const status = order === 1 ? 'IN_PROGRESS' : 'PENDING';
        db.run(
          `INSERT INTO modules (id, project_id, order_index, title, description, deliverables, estimated_days, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            modId,
            projectId,
            order,
            mod.title,
            mod.description,
            JSON.stringify(mod.deliverables),
            mod.estimatedDays,
            status,
          ]
        );
        savedModules.push({
          title: mod.title,
          deliverables: mod.deliverables,
          estimatedDays: mod.estimatedDays,
        });
        order++;
      }

      // 5. Automatically generate Google Meet link and schedule first review with randomized date & timing
      const meetLink = generateGoogleMeetLink();
      const firstModuleDays = plan.modules[0]?.estimatedDays || 5;
      const jitter = Math.floor(Math.random() * 4) - 1;
      const reviewDate = calculateReviewDate(Math.max(2, firstModuleDays + jitter));
      const reviewId = 'rev_' + crypto.randomUUID().slice(0, 8);

      db.run(
        `INSERT INTO reviews (id, project_id, review_round, scheduled_date, meet_link, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [reviewId, projectId, 1, reviewDate, meetLink, 'SCHEDULED', createdAt]
      );

      // 6. Update Project status
      db.run(
        `UPDATE projects
         SET description = ?, tech_stack = ?, status = 'REVIEW_SCHEDULED', total_modules = ?, updated_at = ?
         WHERE id = ?`,
        [
          plan.summary,
          plan.recommendedTechStack,
          plan.modules.length,
          new Date().toISOString(),
          projectId,
        ]
      );
      saveDb();

      // 7. Send Automated Email
      await sendProjectEmail({
        projectId,
        recipientEmail: record.emailId,
        recipientName: record.userName,
        projectName: record.projectName,
        subject: `🚀 [Project IQ] Review #1 Scheduled: Roadmap for "${record.projectName}"`,
        templateType: 'INITIAL_BREAKDOWN',
        meetLink,
        reviewDate,
        reviewRound: 1,
        modules: savedModules,
      });

      projectIds.push(projectId);
    } catch (err: unknown) {
      console.error('Error processing record:', record, err);
      errors.push(`Failed to process ${record.projectName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  saveDb();
  return {
    processedCount: projectIds.length,
    projectIds,
    errors,
  };
}

export function generateSampleExcelBuffer(): Buffer {
  const sampleData = [
    {
      'User Name': 'Alex Rivera',
      'Email ID': 'alex.rivera@example.com',
      'Project Name': 'AI-Powered Health Symptom Checker & Triage',
      'Date of Upload': '2026-10-25',
    },
    {
      'User Name': 'Maya Chen',
      'Email ID': 'maya.chen@example.com',
      'Project Name': 'Distributed Microservices Order Fulfillment Engine',
      'Date of Upload': '2026-10-25',
    },
    {
      'User Name': 'Marcus Vance',
      'Email ID': 'marcus.vance@example.com',
      'Project Name': 'Smart IoT Fleet GPS & Battery Telemetry Tracker',
      'Date of Upload': '2026-10-25',
    },
    {
      'User Name': 'Sarah Jenkins',
      'Email ID': 'sarah.jenkins@example.com',
      'Project Name': 'Real-Time Collaborative Code Editor with WebRTC',
      'Date of Upload': '2026-10-25',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
