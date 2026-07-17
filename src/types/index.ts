export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionLanguage = 'English' | 'Urdu' | 'Arabic' | 'Bilingual' | 'Mixed';
export type PaperStatus = 'Draft' | 'Final' | 'Printed';
export type TextDirection = 'ltr' | 'rtl';

export interface SchoolConfig {
  id?: number;
  name: string;
  logo_path?: string;
  address: string;
  phone: string;
  default_session: string;
  header_template: string;
  default_language?: string;
  default_paper_size?: string;
  is_setup_complete?: boolean;
  last_backup_date?: string;
}

export interface Teacher {
  id: number;
  name: string;
  subjects: string;
  classes: string[];
  papers_count: number;
  questions_count: number;
  is_archived?: boolean;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  is_archived?: boolean;
}

export interface Chapter {
  id: number;
  subject_id: number;
  class_level: string;
  title: string;
  chapter_number?: number;
  is_archived?: boolean;
}

export interface QuestionContent {
  text: string;
  tags?: string[];
  answer_notes?: string;
  direction?: TextDirection;
}

export interface Question {
  id: number;
  content: string;
  question_type: string;
  difficulty: QuestionDifficulty;
  marks: number;
  class_level: string;
  subject_name: string;
  subject_id?: number;
  chapter_name: string;
  language: QuestionLanguage;
  created_by: string;
  created_ago: string;
  tags?: string[];
  teacher_id?: number;
  is_archived?: boolean;
  direction?: TextDirection;
  answer_notes?: string;
}

export interface PaperQuestion {
  id: number;
  content: string;
  question_type: string;
  difficulty: string;
  marks: number;
  class_level: string;
  subject_name: string;
  section_id?: string;
  direction?: TextDirection;
}

export interface PaperSection {
  id: string;
  title: string;
  description: string;
  questions: PaperQuestion[];
  attempt_any?: number;
  type?: 'questions' | 'instruction' | 'pagebreak';
}

export interface PaperDetails {
  title: string;
  classLevel: string;
  subject: string;
  subjectId?: number;
  testType: string;
  language: string;
  date: string;
  duration: string;
  targetMarks: number;
  chapters: string;
  teacherName: string;
  template: string;
}

export interface GeneratedPaper {
  id: number;
  title: string;
  class_level: string;
  subject_name: string;
  subject_id?: number;
  test_type: string;
  marks: number;
  teacher_name: string;
  status: PaperStatus;
  modified_date: string;
  created_date: string;
  language?: string;
  duration?: string;
  template?: string;
  chapters?: string;
  paper_details_json?: string;
  questions_json?: string;
  is_archived?: boolean;
}

export interface PaperTemplate {
  id: number;
  name: string;
  sections: string;
  marks: number;
  duration: string;
  language: string;
  isDefault: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface BackupPackage {
  version: string;
  timestamp: string;
  school_config: SchoolConfig[];
  teachers: unknown[];
  subjects: unknown[];
  chapters: unknown[];
  question_bank: unknown[];
  generated_papers: unknown[];
  paper_templates: unknown[];
}
