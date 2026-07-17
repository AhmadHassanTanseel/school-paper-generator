import { getDatabase, DEFAULT_SUBJECTS, CLASS_LEVELS } from '../database/db';
import type { Subject, Chapter } from '../types';

export async function getSubjects(includeArchived = false): Promise<Subject[]> {
  const db = await getDatabase();
  const sql = includeArchived
    ? 'SELECT * FROM subjects ORDER BY name ASC;'
    : 'SELECT * FROM subjects WHERE is_archived = 0 OR is_archived IS NULL ORDER BY name ASC;';
  const res = await db.select<Subject[]>(sql);
  return res ?? [];
}

export async function getChapters(subjectId?: number, classLevel?: string): Promise<Chapter[]> {
  const db = await getDatabase();
  let sql = 'SELECT * FROM chapters WHERE is_archived = 0 OR is_archived IS NULL';
  const params: unknown[] = [];
  if (subjectId) { sql += ' AND subject_id = $1'; params.push(subjectId); }
  if (classLevel) { sql += ` AND class_level = $${params.length + 1}`; params.push(classLevel); }
  sql += ' ORDER BY chapter_number ASC, title ASC;';
  const res = await db.select<Chapter[]>(sql, params);
  return res ?? [];
}

export async function seedDefaultSubjects(): Promise<void> {
  const db = await getDatabase();
  const existing = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM subjects;');
  if (existing?.[0]?.count > 0) return;

  for (const name of DEFAULT_SUBJECTS) {
    const code = name.substring(0, 3).toUpperCase();
    await db.execute('INSERT INTO subjects (name, code) VALUES ($1, $2);', [name, code]);
  }
}

export async function seedDefaultChapters(): Promise<void> {
  const db = await getDatabase();
  const existing = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM chapters;');
  if (existing?.[0]?.count > 0) return;

  const subjects = await getSubjects();
  const physics = subjects.find(s => s.name === 'Physics');
  const urdu = subjects.find(s => s.name === 'Urdu');
  const arabic = subjects.find(s => s.name === 'Arabic');

  if (physics) {
    await db.execute('INSERT INTO chapters (subject_id, class_level, title, chapter_number) VALUES ($1, $2, $3, $4);', [physics.id, 'Grade 9', 'Kinematics', 1]);
    await db.execute('INSERT INTO chapters (subject_id, class_level, title, chapter_number) VALUES ($1, $2, $3, $4);', [physics.id, 'Grade 9', 'Dynamics', 2]);
  }
  if (urdu) {
    await db.execute('INSERT INTO chapters (subject_id, class_level, title, chapter_number) VALUES ($1, $2, $3, $4);', [urdu.id, 'Grade 6', '8 - دعا', 8]);
  }
  if (arabic) {
    await db.execute('INSERT INTO chapters (subject_id, class_level, title, chapter_number) VALUES ($1, $2, $3, $4);', [arabic.id, 'Grade 8', '6 - المدرسة', 6]);
  }
}

export async function addSubject(name: string, code?: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('INSERT INTO subjects (name, code) VALUES ($1, $2);', [name.trim(), code?.trim() || null]);
}

export async function archiveSubject(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute('UPDATE subjects SET is_archived = 1 WHERE id = $1;', [id]);
}

export async function addChapter(subjectId: number, classLevel: string, title: string, chapterNumber?: number): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'INSERT INTO chapters (subject_id, class_level, title, chapter_number) VALUES ($1, $2, $3, $4);',
    [subjectId, classLevel, title.trim(), chapterNumber ?? null]
  );
}

export async function archiveChapter(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute('UPDATE chapters SET is_archived = 1 WHERE id = $1;', [id]);
}

export { CLASS_LEVELS, DEFAULT_SUBJECTS };
