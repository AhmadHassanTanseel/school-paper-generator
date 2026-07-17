import type { ValidationResult } from '../types';

export function isEmpty(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

export function validateRequired(value: string, fieldLabel: string): string | null {
  if (isEmpty(value)) return `${fieldLabel} is required.`;
  return null;
}

export function validateMinLength(value: string, min: number, fieldLabel: string): string | null {
  if (value.trim().length < min) return `${fieldLabel} must be at least ${min} characters.`;
  return null;
}

export function validateMaxLength(value: string, max: number, fieldLabel: string): string | null {
  if (value.trim().length > max) return `${fieldLabel} must not exceed ${max} characters.`;
  return null;
}

export function validatePhone(phone: string): string | null {
  if (isEmpty(phone)) return null;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (!/^(\+92|0)?[0-9]{10,11}$/.test(cleaned)) {
    return 'Enter a valid Pakistani phone number (e.g. 0300-1234567).';
  }
  return null;
}

export function validateSession(session: string): string | null {
  if (isEmpty(session)) return 'Academic session is required.';
  if (!/^\d{4}[\-–]\d{4}$/.test(session.trim())) {
    return 'Session format should be like 2026-2027.';
  }
  return null;
}

export function validateMarks(marks: number, fieldLabel = 'Marks'): string | null {
  if (isNaN(marks) || marks < 1) return `${fieldLabel} must be at least 1.`;
  if (marks > 200) return `${fieldLabel} cannot exceed 200.`;
  return null;
}

export function validatePositiveNumber(value: number, fieldLabel: string, max = 500): string | null {
  if (isNaN(value) || value < 1) return `${fieldLabel} must be a positive number.`;
  if (value > max) return `${fieldLabel} cannot exceed ${max}.`;
  return null;
}

export function validateDate(dateStr: string): string | null {
  if (isEmpty(dateStr)) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return 'Enter a valid date.';
  return null;
}

export function validateDuration(duration: string): string | null {
  if (isEmpty(duration)) return 'Duration is required.';
  if (duration.trim().length < 2) return 'Duration is too short (e.g. 1 hr, 45 min).';
  return null;
}

export function collectErrors(errors: Record<string, string | null>): ValidationResult {
  const filtered: Record<string, string> = {};
  for (const [key, val] of Object.entries(errors)) {
    if (val) filtered[key] = val;
  }
  return { valid: Object.keys(filtered).length === 0, errors: filtered };
}

export function validateSchoolInfo(data: {
  name: string;
  phone: string;
  session: string;
  address?: string;
}): ValidationResult {
  return collectErrors({
    name: validateRequired(data.name, 'School name') || validateMinLength(data.name, 3, 'School name'),
    phone: validatePhone(data.phone),
    session: validateSession(data.session),
    address: data.address ? validateMaxLength(data.address, 200, 'Address') : null,
  });
}

export function validateTeacherForm(data: { name: string; subjects: string; classes: string }): ValidationResult {
  return collectErrors({
    name: validateRequired(data.name, 'Teacher name') || validateMinLength(data.name, 2, 'Teacher name'),
    subjects: validateRequired(data.subjects, 'Subjects taught'),
    classes: isEmpty(data.classes) ? 'At least one class level is required.' : null,
  });
}

export function validateQuestionForm(data: {
  content: string;
  classLevel: string;
  subjectId: number;
  chapter: string;
  questionType: string;
  marks: number;
  difficulty: string;
  language: string;
}): ValidationResult {
  return collectErrors({
    content: validateRequired(data.content, 'Question text') || validateMinLength(data.content, 5, 'Question text'),
    classLevel: validateRequired(data.classLevel, 'Class'),
    subjectId: !data.subjectId || data.subjectId < 1 ? 'Subject is required.' : null,
    chapter: validateRequired(data.chapter, 'Chapter/topic'),
    questionType: validateRequired(data.questionType, 'Question type'),
    marks: validateMarks(data.marks),
    difficulty: validateRequired(data.difficulty, 'Difficulty'),
    language: validateRequired(data.language, 'Language'),
  });
}

export function validatePaperDetails(data: {
  title: string;
  classLevel: string;
  subject: string;
  testType: string;
  targetMarks: number;
  duration: string;
  teacherName: string;
  date?: string;
}): ValidationResult {
  return collectErrors({
    title: validateRequired(data.title, 'Paper title') || validateMinLength(data.title, 3, 'Paper title'),
    classLevel: validateRequired(data.classLevel, 'Class'),
    subject: validateRequired(data.subject, 'Subject'),
    testType: validateRequired(data.testType, 'Test type'),
    targetMarks: validateMarks(data.targetMarks, 'Total marks'),
    duration: validateDuration(data.duration),
    teacherName: validateRequired(data.teacherName, 'Teacher name'),
    date: data.date ? validateDate(data.date) : null,
  });
}

export function validateTemplateForm(data: {
  name: string;
  sections: string;
  marks: number;
  duration: string;
  language: string;
}): ValidationResult {
  return collectErrors({
    name: validateRequired(data.name, 'Template name'),
    sections: validateRequired(data.sections, 'Sections'),
    marks: validateMarks(data.marks, 'Default marks'),
    duration: validateDuration(data.duration),
    language: validateRequired(data.language, 'Language'),
  });
}

export function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return 'Today';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
