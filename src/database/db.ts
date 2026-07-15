import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  
  // Loads a standalone SQLite database file from the application's local directory
  dbInstance = await Database.load('sqlite:school_paper_generator.db');
  return dbInstance;
}

export async function initializeDatabase(): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    // Enforce strict relational integrity
    await db.execute('PRAGMA foreign_keys = ON;');
    
    // Build Version 1 Database Tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS school_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        logo_path TEXT,
        address TEXT,
        phone TEXT,
        default_session TEXT NOT NULL,
        header_template TEXT NOT NULL DEFAULT 'standard'
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS question_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        class_level TEXT NOT NULL,
        chapter_topic TEXT NOT NULL,
        question_type TEXT NOT NULL,
        language TEXT NOT NULL,
        marks INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        content_json TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        teacher_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        class_level TEXT NOT NULL,
        total_marks INTEGER NOT NULL,
        time_allowed_minutes INTEGER NOT NULL,
        paper_structure_json TEXT NOT NULL,
        is_finalized BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      );
    `);

    // Insert default school setup if empty
    const checkConfig = await db.select<any[]>('SELECT * FROM school_config WHERE id = 1;');
    if (checkConfig.length === 0) {
      await db.execute(`
        INSERT INTO school_config (id, name, default_session) 
        VALUES (1, 'My School Name', '2026-2027');
      `);
    }

    console.log('Database initialized successfully!');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}