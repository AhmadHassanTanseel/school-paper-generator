import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;
let initPromise: Promise<boolean> | null = null;

export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:school_paper_generator.db');
  }
  return dbInstance;
}

async function safeAlter(db: Database, sql: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch {
    // Column or constraint already exists
  }
}

export async function initializeDatabase(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await getDatabase();
      await db.execute('PRAGMA foreign_keys = ON;');

      await db.execute(`
        CREATE TABLE IF NOT EXISTS school_config (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          name TEXT NOT NULL DEFAULT 'My School',
          logo_path TEXT,
          address TEXT,
          phone TEXT,
          default_session TEXT NOT NULL DEFAULT '2026-2027',
          header_template TEXT NOT NULL DEFAULT 'standard',
          default_language TEXT DEFAULT 'Mixed (English & Urdu)',
          default_paper_size TEXT DEFAULT 'A4',
          is_setup_complete INTEGER DEFAULT 0,
          last_backup_date TEXT
        );

        CREATE TABLE IF NOT EXISTS teachers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          subjects TEXT,
          classes TEXT,
          papers_count INTEGER DEFAULT 0,
          questions_count INTEGER DEFAULT 0,
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT,
          is_archived INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS chapters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject_id INTEGER NOT NULL,
          class_level TEXT NOT NULL,
          title TEXT NOT NULL,
          chapter_number INTEGER,
          is_archived INTEGER DEFAULT 0,
          FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS question_bank (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER,
          subject_id INTEGER NOT NULL,
          class_level TEXT NOT NULL,
          chapter_topic TEXT NOT NULL DEFAULT 'General',
          question_type TEXT NOT NULL,
          language TEXT NOT NULL DEFAULT 'English',
          marks INTEGER NOT NULL DEFAULT 1,
          difficulty TEXT NOT NULL DEFAULT 'Medium',
          content_json TEXT NOT NULL,
          tags TEXT,
          created_by TEXT,
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
          FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS generated_papers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          subject_id INTEGER,
          class_level TEXT NOT NULL,
          test_type TEXT DEFAULT 'Class Test',
          teacher_name TEXT,
          total_marks INTEGER NOT NULL DEFAULT 25,
          time_allowed TEXT,
          duration TEXT,
          language TEXT DEFAULT 'English',
          template TEXT DEFAULT 'Monthly Test',
          chapters TEXT,
          instructions TEXT,
          status TEXT DEFAULT 'Draft',
          paper_details_json TEXT,
          questions_json TEXT NOT NULL DEFAULT '[]',
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS paper_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sections TEXT NOT NULL,
          marks INTEGER NOT NULL DEFAULT 25,
          duration TEXT NOT NULL DEFAULT '1 hr',
          language TEXT NOT NULL DEFAULT 'English',
          is_default INTEGER DEFAULT 0,
          sections_json TEXT
        );
      `);

      // Migrate legacy columns
      const migrations = [
        `ALTER TABLE school_config ADD COLUMN is_setup_complete INTEGER DEFAULT 0`,
        `ALTER TABLE school_config ADD COLUMN last_backup_date TEXT`,
        `ALTER TABLE school_config ADD COLUMN default_language TEXT`,
        `ALTER TABLE school_config ADD COLUMN default_paper_size TEXT`,
        `ALTER TABLE teachers ADD COLUMN subjects TEXT`,
        `ALTER TABLE teachers ADD COLUMN classes TEXT`,
        `ALTER TABLE teachers ADD COLUMN papers_count INTEGER DEFAULT 0`,
        `ALTER TABLE teachers ADD COLUMN questions_count INTEGER DEFAULT 0`,
        `ALTER TABLE teachers ADD COLUMN is_archived INTEGER DEFAULT 0`,
        `ALTER TABLE subjects ADD COLUMN is_archived INTEGER DEFAULT 0`,
        `ALTER TABLE question_bank ADD COLUMN chapter_topic TEXT`,
        `ALTER TABLE question_bank ADD COLUMN created_by TEXT`,
        `ALTER TABLE question_bank ADD COLUMN is_archived INTEGER DEFAULT 0`,
        `ALTER TABLE question_bank ADD COLUMN updated_at DATETIME`,
        `ALTER TABLE generated_papers ADD COLUMN test_type TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN teacher_name TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN duration TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN language TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN template TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN chapters TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN status TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN paper_details_json TEXT`,
        `ALTER TABLE generated_papers ADD COLUMN is_archived INTEGER DEFAULT 0`,
        `ALTER TABLE generated_papers ADD COLUMN updated_at DATETIME`,
        `ALTER TABLE paper_templates ADD COLUMN sections_json TEXT`,
      ];
      for (const sql of migrations) await safeAlter(db, sql);

      const checkConfig = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM school_config WHERE id = 1;');
      if (!checkConfig?.[0]?.count) {
        await db.execute(
          `INSERT INTO school_config (id, name, default_session, header_template, is_setup_complete, last_backup_date)
           VALUES (1, 'My School Name', '2026-2027', 'standard', 0, $1);`,
          [new Date().toISOString().split('T')[0]]
        );
      }

      await seedDefaultTemplates(db);
      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return false;
    }
  })();

  return initPromise;
}

async function seedDefaultTemplates(db: Database): Promise<void> {
  const existing = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM paper_templates;');
  if (existing?.[0]?.count > 0) return;

  const defaults = [
    { name: 'Class Test', sections: 'MCQs, Short', marks: 15, duration: '40 min', language: 'English', is_default: 1 },
    { name: 'Weekly Test', sections: 'MCQs, Short, Long', marks: 20, duration: '45 min', language: 'English', is_default: 0 },
    { name: 'Monthly Test', sections: 'MCQs, Short, Long', marks: 25, duration: '1 hr', language: 'English', is_default: 0 },
    { name: 'Midterm', sections: 'MCQs, Short, Long', marks: 40, duration: '1.5 hr', language: 'English', is_default: 0 },
    { name: 'Final Exam', sections: 'MCQs, Short, Long, Essay', marks: 75, duration: '3 hr', language: 'English', is_default: 0 },
    { name: 'Board Practice', sections: 'Objective, Subjective', marks: 100, duration: '3 hr', language: 'English', is_default: 0 },
  ];

  for (const t of defaults) {
    await db.execute(
      `INSERT INTO paper_templates (name, sections, marks, duration, language, is_default) VALUES ($1, $2, $3, $4, $5, $6);`,
      [t.name, t.sections, t.marks, t.duration, t.language, t.is_default]
    );
  }
}

export const CLASS_LEVELS = Array.from({ length: 10 }, (_, i) => `Grade ${i + 1}`);

export const DEFAULT_SUBJECTS = [
  'Mathematics', 'English', 'Urdu', 'Physics', 'Chemistry', 'Biology',
  'Computer', 'Islamiyat', 'Pakistan Studies', 'Arabic', 'General Science',
];

export const QUESTION_TYPES = [
  'MCQ', 'Fill in the blanks', 'True/False', 'Short Question', 'Long Question',
  'Numerical', 'Translation', 'Essay', 'Matching', 'Comprehension', 'Diagram/Image-based',
];

export const TEST_TYPES = [
  'Class Test', 'Weekly Test', 'Monthly Test', 'Midterm', 'Final Exam', 'Board Practice', 'Custom',
];
