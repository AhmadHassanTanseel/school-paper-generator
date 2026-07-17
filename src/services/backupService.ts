import { getDatabase } from '../database/db';
import { updateLastBackupDate } from './schoolService';
import type { BackupPackage } from '../types';

const BACKUP_VERSION = '1.0';

export async function exportFullBackup(): Promise<BackupPackage> {
  const db = await getDatabase();

  const tables = ['school_config', 'teachers', 'subjects', 'chapters', 'question_bank', 'generated_papers', 'paper_templates'] as const;
  const data: Record<string, unknown[]> = {};

  for (const table of tables) {
    try {
      data[table] = (await db.select<unknown[]>(`SELECT * FROM ${table};`)) ?? [];
    } catch {
      data[table] = [];
    }
  }

  return {
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    school_config: data.school_config as BackupPackage['school_config'],
    teachers: data.teachers,
    subjects: data.subjects,
    chapters: data.chapters,
    question_bank: data.question_bank,
    generated_papers: data.generated_papers,
    paper_templates: data.paper_templates,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportFullBackup();
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `School_Paper_Generator_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  await updateLastBackupDate();
}

export async function restoreBackup(data: unknown): Promise<void> {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file format.');

  const backup = data as BackupPackage;
  if (!backup.version) throw new Error('Backup version missing. File may be corrupted.');

  const db = await getDatabase();

  await db.execute('DELETE FROM generated_papers;');
  await db.execute('DELETE FROM question_bank;');
  await db.execute('DELETE FROM chapters;');
  await db.execute('DELETE FROM paper_templates;');
  await db.execute('DELETE FROM subjects;');
  await db.execute('DELETE FROM teachers;');
  await db.execute('DELETE FROM school_config;');

  if (Array.isArray(backup.school_config)) {
    for (const c of backup.school_config) {
      const row = c as unknown as Record<string, unknown>;
      await db.execute(
        `INSERT INTO school_config (id, name, address, phone, default_session, header_template, default_language, default_paper_size, is_setup_complete, last_backup_date)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          row.name ?? '', row.address ?? '', row.phone ?? '', row.default_session ?? '2026-2027',
          row.header_template ?? 'standard', row.default_language ?? 'Mixed (English & Urdu)',
          row.default_paper_size ?? 'A4', row.is_setup_complete ?? 1,
          row.last_backup_date ?? new Date().toISOString().split('T')[0],
        ]
      );
    }
  }

  if (Array.isArray(backup.teachers)) {
    for (const t of backup.teachers) {
      const row = t as Record<string, unknown>;
      await db.execute(
        `INSERT INTO teachers (id, name, subjects, classes, papers_count, questions_count, is_archived, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [row.id, row.name, row.subjects ?? '', row.classes ?? '', row.papers_count ?? 0, row.questions_count ?? 0, row.is_archived ?? 0, row.created_at ?? null]
      );
    }
  }

  if (Array.isArray(backup.subjects)) {
    for (const s of backup.subjects) {
      const row = s as Record<string, unknown>;
      await db.execute('INSERT INTO subjects (id, name, code, is_archived) VALUES ($1, $2, $3, $4);', [row.id, row.name, row.code ?? '', row.is_archived ?? 0]);
    }
  }

  if (Array.isArray(backup.chapters)) {
    for (const c of backup.chapters) {
      const row = c as Record<string, unknown>;
      await db.execute(
        'INSERT INTO chapters (id, subject_id, class_level, title, chapter_number, is_archived) VALUES ($1, $2, $3, $4, $5, $6);',
        [row.id, row.subject_id, row.class_level, row.title, row.chapter_number ?? null, row.is_archived ?? 0]
      );
    }
  }

  if (Array.isArray(backup.question_bank)) {
    for (const q of backup.question_bank) {
      const row = q as Record<string, unknown>;
      await db.execute(
        `INSERT INTO question_bank (id, teacher_id, subject_id, class_level, chapter_topic, question_type, language, marks, difficulty, content_json, tags, created_by, is_archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
        [
          row.id, row.teacher_id ?? null, row.subject_id, row.class_level,
          row.chapter_topic ?? row.chapter_name ?? 'General', row.question_type, row.language,
          row.marks, row.difficulty, row.content_json, row.tags ?? '', row.created_by ?? '',
          row.is_archived ?? 0, row.created_at ?? null, row.updated_at ?? null,
        ]
      );
    }
  }

  if (Array.isArray(backup.generated_papers)) {
    for (const p of backup.generated_papers) {
      const row = p as Record<string, unknown>;
      await db.execute(
        `INSERT INTO generated_papers (id, title, subject_id, class_level, test_type, teacher_name, total_marks, time_allowed, duration, language, template, chapters, instructions, status, paper_details_json, questions_json, is_archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
        [
          row.id, row.title, row.subject_id ?? null, row.class_level, row.test_type ?? 'Class Test',
          row.teacher_name ?? '', row.total_marks, row.time_allowed ?? row.duration ?? '1 hr',
          row.duration ?? row.time_allowed ?? '1 hr', row.language ?? 'English', row.template ?? 'Monthly Test',
          row.chapters ?? '', row.instructions ?? '', row.status ?? 'Draft',
          row.paper_details_json ?? '', row.questions_json ?? '[]', row.is_archived ?? 0,
          row.created_at ?? null, row.updated_at ?? null,
        ]
      );
    }
  }

  if (Array.isArray(backup.paper_templates)) {
    for (const t of backup.paper_templates) {
      const row = t as Record<string, unknown>;
      await db.execute(
        'INSERT INTO paper_templates (id, name, sections, marks, duration, language, is_default, sections_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);',
        [row.id, row.name, row.sections, row.marks, row.duration, row.language, row.is_default ?? 0, row.sections_json ?? null]
      );
    }
  }
}

export async function getDatabaseStats(): Promise<{ questions: number; papers: number; teachers: number; subjects: number; sizeEstimate: string }> {
  const db = await getDatabase();
  const q = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM question_bank WHERE is_archived = 0 OR is_archived IS NULL;');
  const p = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM generated_papers WHERE is_archived = 0 OR is_archived IS NULL;');
  const t = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM teachers WHERE is_archived = 0 OR is_archived IS NULL;');
  const s = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM subjects WHERE is_archived = 0 OR is_archived IS NULL;');

  const totalRecords = (q?.[0]?.count ?? 0) + (p?.[0]?.count ?? 0) + (t?.[0]?.count ?? 0);
  const sizeKb = Math.max(1, Math.round(totalRecords * 2.5));

  return {
    questions: q?.[0]?.count ?? 0,
    papers: p?.[0]?.count ?? 0,
    teachers: t?.[0]?.count ?? 0,
    subjects: s?.[0]?.count ?? 0,
    sizeEstimate: sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`,
  };
}
