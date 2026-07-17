import { getDatabase } from '../database/db';
import type { GeneratedPaper, PaperDetails, PaperSection, PaperStatus } from '../types';
import { formatDisplayDate } from '../utils/validation';

export async function getPapers(includeArchived = false): Promise<GeneratedPaper[]> {
  const db = await getDatabase();
  const sql = `
    SELECT p.*, s.name as subject_name
    FROM generated_papers p
    LEFT JOIN subjects s ON p.subject_id = s.id
    ${includeArchived ? '' : 'WHERE p.is_archived = 0 OR p.is_archived IS NULL'}
    ORDER BY p.updated_at DESC, p.id DESC;
  `;
  const res = await db.select<Record<string, unknown>[]>(sql);
  return (res ?? []).map(mapPaperRow);
}

function mapPaperRow(p: Record<string, unknown>): GeneratedPaper {
  return {
    id: p.id as number,
    title: String(p.title || 'Untitled Paper'),
    class_level: String(p.class_level || 'Grade 9'),
    subject_name: String(p.subject_name || 'General'),
    subject_id: p.subject_id as number | undefined,
    test_type: String(p.test_type || 'Class Test'),
    marks: Number(p.total_marks) || 0,
    teacher_name: String(p.teacher_name || 'Unknown'),
    status: (p.status as PaperStatus) || 'Draft',
    modified_date: formatDisplayDate(String(p.updated_at || p.created_at || '')),
    created_date: formatDisplayDate(String(p.created_at || '')),
    language: String(p.language || 'English'),
    duration: String(p.duration || p.time_allowed || '1 hr'),
    template: String(p.template || 'Monthly Test'),
    chapters: String(p.chapters || ''),
    paper_details_json: String(p.paper_details_json || ''),
    questions_json: String(p.questions_json || '[]'),
    is_archived: Boolean(p.is_archived),
  };
}

export async function getPaperById(id: number): Promise<GeneratedPaper | null> {
  const db = await getDatabase();
  const res = await db.select<Record<string, unknown>[]>(`
    SELECT p.*, s.name as subject_name FROM generated_papers p
    LEFT JOIN subjects s ON p.subject_id = s.id WHERE p.id = $1;
  `, [id]);
  return res?.[0] ? mapPaperRow(res[0]) : null;
}

export interface SavePaperInput {
  id?: number;
  details: PaperDetails;
  sections: PaperSection[];
  status?: PaperStatus;
  subjectId?: number;
}

export async function savePaper(input: SavePaperInput): Promise<number> {
  const db = await getDatabase();
  const { details, sections, status = 'Draft' } = input;
  const questionsJson = JSON.stringify(sections);
  const detailsJson = JSON.stringify(details);
  const now = new Date().toISOString();

  let subjectId = input.subjectId;
  if (!subjectId) {
    const sub = await db.select<{ id: number }[]>('SELECT id FROM subjects WHERE name = $1 LIMIT 1;', [details.subject]);
    subjectId = sub?.[0]?.id;
  }

  if (input.id) {
    await db.execute(
      `UPDATE generated_papers SET title=$1, subject_id=$2, class_level=$3, test_type=$4, teacher_name=$5,
       total_marks=$6, time_allowed=$7, duration=$8, language=$9, template=$10, chapters=$11,
       status=$12, paper_details_json=$13, questions_json=$14, updated_at=$15 WHERE id=$16;`,
      [
        details.title, subjectId ?? null, details.classLevel, details.testType, details.teacherName,
        details.targetMarks, details.duration, details.duration, details.language, details.template,
        details.chapters, status, detailsJson, questionsJson, now, input.id,
      ]
    );
    return input.id;
  }

  await db.execute(
    `INSERT INTO generated_papers (title, subject_id, class_level, test_type, teacher_name, total_marks,
     time_allowed, duration, language, template, chapters, instructions, status, paper_details_json, questions_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);`,
    [
      details.title, subjectId ?? null, details.classLevel, details.testType, details.teacherName,
      details.targetMarks, details.duration, details.duration, details.language, details.template,
      details.chapters, 'Attempt all sections.', status, detailsJson, questionsJson, now,
    ]
  );

  const inserted = await db.select<{ id: number }[]>('SELECT last_insert_rowid() as id;');
  return inserted?.[0]?.id ?? Date.now();
}

export async function duplicatePaper(id: number): Promise<number> {
  const paper = await getPaperById(id);
  if (!paper) throw new Error('Paper not found');

  let details: PaperDetails;
  let sections: PaperSection[];
  try {
    details = JSON.parse(paper.paper_details_json || '{}');
    sections = JSON.parse(paper.questions_json || '[]');
  } catch {
    throw new Error('Invalid paper data');
  }

  details.title = `${details.title} (Copy)`;
  return savePaper({
    details,
    sections,
    status: 'Draft',
    subjectId: paper.subject_id,
  });
}

export async function archivePaper(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute('UPDATE generated_papers SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [id]);
}

export async function updatePaperStatus(id: number, status: PaperStatus): Promise<void> {
  const db = await getDatabase();
  await db.execute('UPDATE generated_papers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [status, id]);
}

export async function getPapersThisMonth(): Promise<number> {
  const db = await getDatabase();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const res = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM generated_papers WHERE created_at >= $1 AND (is_archived = 0 OR is_archived IS NULL);',
    [startOfMonth.toISOString()]
  );
  return res?.[0]?.count ?? 0;
}

export async function getTemplates(): Promise<{ id: number; name: string; sections: string; marks: number; duration: string; language: string; isDefault: boolean }[]> {
  const db = await getDatabase();
  const res = await db.select<Record<string, unknown>[]>('SELECT * FROM paper_templates ORDER BY is_default DESC, name ASC;');
  return (res ?? []).map(t => ({
    id: t.id as number,
    name: String(t.name),
    sections: String(t.sections),
    marks: Number(t.marks),
    duration: String(t.duration),
    language: String(t.language),
    isDefault: Boolean(t.is_default),
  }));
}

export function buildSectionsFromTemplate(sectionNames: string): PaperSection[] {
  const names = sectionNames.split(',').map(s => s.trim()).filter(Boolean);
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return names.map((name, i) => ({
    id: `sec-${letters[i]?.toLowerCase() || i}`,
    title: `Section ${letters[i] || i + 1}: ${name}`,
    description: i === 0 ? 'Choose the correct option.' : i === 1 ? 'Attempt all questions.' : 'Attempt any 2 out of 3.',
    questions: [],
  }));
}

export function parsePaperSections(json: string): PaperSection[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parsePaperDetails(json: string, fallback?: Partial<PaperDetails>): PaperDetails {
  try {
    const parsed = JSON.parse(json);
    return { ...fallback, ...parsed } as PaperDetails;
  } catch {
    return fallback as PaperDetails;
  }
}
