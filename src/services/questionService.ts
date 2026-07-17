import { getDatabase } from '../database/db';
import type { Question, QuestionContent } from '../types';
import { formatTimeAgo } from '../utils/validation';

function parseContent(json: string): { text: string; tags: string[]; direction?: string; answer_notes?: string } {
  try {
    const parsed = JSON.parse(json) as QuestionContent;
    return {
      text: parsed.text || json,
      tags: parsed.tags || [],
      direction: parsed.direction,
      answer_notes: parsed.answer_notes,
    };
  } catch {
    return { text: json || 'Untitled Question', tags: [] };
  }
}

function mapRow(q: Record<string, unknown>): Question {
  const parsed = parseContent(String(q.content_json || ''));
  return {
    id: q.id as number,
    content: parsed.text,
    question_type: String(q.question_type || 'Short Question'),
    difficulty: (q.difficulty as Question['difficulty']) || 'Medium',
    marks: Number(q.marks) || 1,
    class_level: String(q.class_level || 'Grade 9'),
    subject_name: String(q.subject_name || 'General'),
    subject_id: q.subject_id as number | undefined,
    chapter_name: String(q.chapter_topic || q.chapter_name || 'General Topic'),
    language: (q.language as Question['language']) || 'English',
    created_by: String(q.created_by || 'Unknown'),
    created_ago: formatTimeAgo(String(q.updated_at || q.created_at || '')),
    tags: parsed.tags,
    teacher_id: q.teacher_id as number | undefined,
    is_archived: Boolean(q.is_archived),
    direction: parsed.direction as Question['direction'],
    answer_notes: parsed.answer_notes,
  };
}

export async function getQuestions(includeArchived = false): Promise<Question[]> {
  const db = await getDatabase();
  const sql = `
    SELECT q.*, s.name as subject_name
    FROM question_bank q
    LEFT JOIN subjects s ON q.subject_id = s.id
    ${includeArchived ? '' : 'WHERE q.is_archived = 0 OR q.is_archived IS NULL'}
    ORDER BY q.id DESC;
  `;
  const res = await db.select<Record<string, unknown>[]>(sql);
  return (res ?? []).map(mapRow);
}

export async function getQuestionById(id: number): Promise<Question | null> {
  const db = await getDatabase();
  const res = await db.select<Record<string, unknown>[]>(`
    SELECT q.*, s.name as subject_name FROM question_bank q
    LEFT JOIN subjects s ON q.subject_id = s.id WHERE q.id = $1;
  `, [id]);
  return res?.[0] ? mapRow(res[0]) : null;
}

export interface SaveQuestionInput {
  content: string;
  subjectId: number;
  classLevel: string;
  chapter: string;
  questionType: string;
  marks: number;
  difficulty: string;
  language: string;
  createdBy: string;
  teacherId?: number;
  tags?: string[];
  direction?: string;
  answerNotes?: string;
}

export async function saveQuestion(input: SaveQuestionInput, id?: number): Promise<number> {
  const db = await getDatabase();
  const contentJson = JSON.stringify({
    text: input.content.trim(),
    tags: input.tags || [],
    direction: input.direction || (['Urdu', 'Arabic'].includes(input.language) ? 'rtl' : 'ltr'),
    answer_notes: input.answerNotes || '',
  });

  if (id) {
    await db.execute(
      `UPDATE question_bank SET subject_id=$1, class_level=$2, chapter_topic=$3, question_type=$4,
       marks=$5, difficulty=$6, language=$7, content_json=$8, tags=$9, created_by=$10,
       teacher_id=$11, updated_at=CURRENT_TIMESTAMP WHERE id=$12;`,
      [
        input.subjectId, input.classLevel, input.chapter, input.questionType,
        input.marks, input.difficulty, input.language, contentJson,
        (input.tags || []).join(','), input.createdBy, input.teacherId ?? null, id,
      ]
    );
    return id;
  }

  await db.execute(
    `INSERT INTO question_bank (subject_id, class_level, chapter_topic, question_type, marks, difficulty, language, content_json, tags, created_by, teacher_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
    [
      input.subjectId, input.classLevel, input.chapter, input.questionType,
      input.marks, input.difficulty, input.language, contentJson,
      (input.tags || []).join(','), input.createdBy, input.teacherId ?? null,
    ]
  );

  const inserted = await db.select<{ id: number }[]>('SELECT last_insert_rowid() as id;');
  const newId = inserted?.[0]?.id ?? Date.now();

  if (input.teacherId) {
    await db.execute('UPDATE teachers SET questions_count = questions_count + 1 WHERE id = $1;', [input.teacherId]);
  }

  return newId;
}

export async function duplicateQuestion(id: number): Promise<number> {
  const q = await getQuestionById(id);
  if (!q || !q.subject_id) throw new Error('Question not found');

  return saveQuestion({
    content: q.content,
    subjectId: q.subject_id,
    classLevel: q.class_level,
    chapter: q.chapter_name,
    questionType: q.question_type,
    marks: q.marks,
    difficulty: q.difficulty,
    language: q.language,
    createdBy: q.created_by,
    teacherId: q.teacher_id,
    tags: q.tags,
    direction: q.direction,
    answerNotes: q.answer_notes,
  });
}

export async function archiveQuestion(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute('UPDATE question_bank SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1;', [id]);
}

export async function getFilterOptions(): Promise<{
  subjects: string[];
  chapters: string[];
  teachers: string[];
}> {
  const db = await getDatabase();
  const subjects = await db.select<{ name: string }[]>('SELECT DISTINCT name FROM subjects WHERE is_archived = 0 OR is_archived IS NULL ORDER BY name;');
  const chapters = await db.select<{ chapter_topic: string }[]>('SELECT DISTINCT chapter_topic FROM question_bank WHERE is_archived = 0 OR is_archived IS NULL ORDER BY chapter_topic;');
  const teachers = await db.select<{ created_by: string }[]>('SELECT DISTINCT created_by FROM question_bank WHERE created_by IS NOT NULL ORDER BY created_by;');

  return {
    subjects: (subjects ?? []).map(s => s.name),
    chapters: (chapters ?? []).map(c => c.chapter_topic),
    teachers: (teachers ?? []).map(t => t.created_by),
  };
}
