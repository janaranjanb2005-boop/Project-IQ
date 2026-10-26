import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'project_iq.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initTables(db);
  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function initTables(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      tech_stack TEXT,
      status TEXT NOT NULL,
      completion_percentage INTEGER DEFAULT 0,
      current_module_index INTEGER DEFAULT 0,
      total_modules INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      deliverables TEXT,
      estimated_days INTEGER DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'PENDING',
      completed_at TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      review_round INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      meet_link TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      admin_notes TEXT,
      demo_rating INTEGER,
      ai_evaluation TEXT,
      ai_next_steps TEXT,
      conducted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_type TEXT NOT NULL,
      content_html TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DELIVERED',
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  tech_stack?: string;
  status: string;
  completion_percentage: number;
  current_module_index: number;
  total_modules: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleRow {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  description: string;
  deliverables?: string; // JSON string
  estimated_days: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  completed_at?: string;
}

export interface ReviewRow {
  id: string;
  project_id: string;
  review_round: number;
  scheduled_date: string;
  meet_link: string;
  status: 'SCHEDULED' | 'CONDUCTING' | 'COMPLETED' | 'RESCHEDULED';
  admin_notes?: string;
  demo_rating?: number;
  ai_evaluation?: string;
  ai_next_steps?: string;
  conducted_at?: string;
  created_at: string;
}

export interface EmailLogRow {
  id: string;
  project_id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  template_type: string;
  content_html: string;
  sent_at: string;
  status: string;
}
