import { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { getDatabase, CLASS_LEVELS, QUESTION_TYPES } from '../../database/db';
import { getSubjects } from '../../services/curriculumService';
import { saveQuestion, getQuestionById } from '../../services/questionService';
import { validateQuestionForm } from '../../utils/validation';
import { useApp } from '../../context/AppContext';
import type { Subject } from '../../types';

interface QuestionEditorProps {
  questionId?: number | null;
  onClose: () => void;
  onSaved?: (id: number) => void;
  saveAndAddAnother?: boolean;
}

export default function QuestionEditor({ questionId, onClose, onSaved }: QuestionEditorProps) {
  const { showToast, triggerRefresh } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<{ id: number; name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [content, setContent] = useState('');
  const [classLevel, setClassLevel] = useState('Grade 9');
  const [subjectId, setSubjectId] = useState(0);
  const [chapter, setChapter] = useState('');
  const [questionType, setQuestionType] = useState('Short Question');
  const [marks, setMarks] = useState(3);
  const [difficulty, setDifficulty] = useState('Medium');
  const [language, setLanguage] = useState('English');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [tags, setTags] = useState('');
  const [answerNotes, setAnswerNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('');

  useEffect(() => {
    async function load() {
      const [subs, db] = await Promise.all([getSubjects(), getDatabase()]);
      setSubjects(subs);
      if (subs.length > 0 && !subjectId) setSubjectId(subs[0].id);

      const tRes = await db.select<{ id: number; name: string }[]>('SELECT id, name FROM teachers WHERE is_archived = 0 OR is_archived IS NULL ORDER BY name;');
      setTeachers(tRes ?? []);
      if (tRes?.[0]) { setCreatedBy(tRes[0].name); }

      if (questionId) {
        const q = await getQuestionById(questionId);
        if (q) {
          setContent(q.content);
          setClassLevel(q.class_level);
          setSubjectId(q.subject_id ?? subs[0]?.id ?? 0);
          setChapter(q.chapter_name);
          setQuestionType(q.question_type);
          setMarks(q.marks);
          setDifficulty(q.difficulty);
          setLanguage(q.language);
          setDirection(q.direction || (['Urdu', 'Arabic'].includes(q.language) ? 'rtl' : 'ltr'));
          setTags((q.tags || []).join(', '));
          setAnswerNotes(q.answer_notes || '');
          setCreatedBy(q.created_by);
        }
      }
    }
    load();
  }, [questionId]);

  useEffect(() => {
    if (language === 'Urdu' || language === 'Arabic') setDirection('rtl');
    else if (language === 'English') setDirection('ltr');
  }, [language]);

  const handleSave = async (addAnother = false) => {
    const validation = validateQuestionForm({
      content, classLevel, subjectId, chapter, questionType, marks, difficulty, language,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const teacher = teachers.find(t => t.name === createdBy);
      const id = await saveQuestion({
        content, subjectId, classLevel, chapter, questionType, marks, difficulty, language,
        createdBy: createdBy || 'Unknown',
        teacherId: teacher?.id,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        direction, answerNotes,
      }, questionId ?? undefined);

      showToast(questionId ? 'Question updated successfully.' : 'Question saved successfully.', 'success');
      triggerRefresh();
      onSaved?.(id);

      if (addAnother) {
        setContent('');
        setChapter('');
        setTags('');
        setAnswerNotes('');
      } else {
        onClose();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save question.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) => errors[key];

  const examples = [
    { label: 'English Short', content: 'Define velocity and write its SI unit. State whether it is a scalar or vector quantity.', lang: 'English', type: 'Short Question', dir: 'ltr' as const },
    { label: 'Urdu RTL', content: 'درج ذیل نظم کی تشریح کریں اور شاعر کا نام بھی لکھیں۔', lang: 'Urdu', type: 'Long Question', dir: 'rtl' as const },
    { label: 'Arabic RTL', content: 'اكتب خمس جمل عن المدرسة باللغة العربية.', lang: 'Arabic', type: 'Essay', dir: 'rtl' as const },
    { label: 'Math Equation', content: 'Solve the quadratic equation: 2x² - 5x + 3 = 0', lang: 'English', type: 'Numerical', dir: 'ltr' as const },
    { label: 'Physics Numerical', content: 'A car accelerates from 10 m/s to 30 m/s in 5 seconds. Calculate acceleration and distance.', lang: 'English', type: 'Numerical', dir: 'ltr' as const },
    { label: 'Chemistry Formula', content: 'Balance the equation: H₂ + O₂ → H₂O. Show working.', lang: 'English', type: 'Numerical', dir: 'ltr' as const },
  ];

  const loadExample = (ex: typeof examples[0]) => {
    setContent(ex.content);
    setLanguage(ex.lang);
    setDirection(ex.dir);
    setQuestionType(ex.type);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 my-4 flex flex-col max-h-[95vh]">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg">{questionId ? 'Edit Question' : 'Add Question'}</h3>
            <p className="text-xs text-slate-400">Create reusable questions for your question bank</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase w-full">Quick Examples:</span>
              {examples.map(ex => (
                <button key={ex.label} type="button" onClick={() => loadExample(ex)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-600 cursor-pointer">
                  {ex.label}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Question Text <span className="text-red-500">*</span></label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                dir={direction}
                rows={6}
                placeholder="Enter your question here..."
                className={`w-full p-3 border rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${fieldError('content') ? 'border-red-400' : 'border-slate-200'} ${direction === 'rtl' ? 'text-right font-serif' : ''}`}
              />
              {fieldError('content') && <p className="text-[11px] text-red-500 font-medium">{fieldError('content')}</p>}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Preview</span>
              <p className={`text-sm font-semibold text-slate-800 whitespace-pre-line ${direction === 'rtl' ? 'text-right font-serif text-base' : ''}`} dir={direction}>
                {content || 'Question preview will appear here...'}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Answer / Marking Notes (Optional)</label>
              <textarea
                value={answerNotes}
                onChange={e => setAnswerNotes(e.target.value)}
                rows={2}
                placeholder="Model answer or marking scheme notes..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3 text-xs font-bold text-slate-700">
            <div className="space-y-1">
              <label>Class <span className="text-red-500">*</span></label>
              <select value={classLevel} onChange={e => setClassLevel(e.target.value)} className={`w-full p-2.5 border rounded-xl bg-white ${fieldError('classLevel') ? 'border-red-400' : 'border-slate-200'}`}>
                {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label>Subject <span className="text-red-500">*</span></label>
              <select value={subjectId} onChange={e => setSubjectId(Number(e.target.value))} className={`w-full p-2.5 border rounded-xl bg-white ${fieldError('subjectId') ? 'border-red-400' : 'border-slate-200'}`}>
                <option value={0}>Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {fieldError('subjectId') && <p className="text-[11px] text-red-500 font-medium">{fieldError('subjectId')}</p>}
            </div>

            <div className="space-y-1">
              <label>Chapter / Topic <span className="text-red-500">*</span></label>
              <input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="e.g. Kinematics" className={`w-full p-2.5 border rounded-xl ${fieldError('chapter') ? 'border-red-400' : 'border-slate-200'}`} />
              {fieldError('chapter') && <p className="text-[11px] text-red-500 font-medium">{fieldError('chapter')}</p>}
            </div>

            <div className="space-y-1">
              <label>Question Type <span className="text-red-500">*</span></label>
              <select value={questionType} onChange={e => setQuestionType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
                {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Marks <span className="text-red-500">*</span></label>
                <input type="number" min={1} max={200} value={marks} onChange={e => setMarks(Number(e.target.value))} className={`w-full p-2.5 border rounded-xl ${fieldError('marks') ? 'border-red-400' : 'border-slate-200'}`} />
              </div>
              <div className="space-y-1">
                <label>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
                  <option>English</option><option>Urdu</option><option>Arabic</option><option>Bilingual</option>
                </select>
              </div>
              <div className="space-y-1">
                <label>Text Direction</label>
                <select value={direction} onChange={e => setDirection(e.target.value as 'ltr' | 'rtl')} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
                  <option value="ltr">Left to Right</option>
                  <option value="rtl">Right to Left</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label>Tags (comma separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="motion, definitions" className="w-full p-2.5 border border-slate-200 rounded-xl" />
            </div>

            <div className="space-y-1">
              <label>Created By</label>
              <select value={createdBy} onChange={e => setCreatedBy(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
                {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                {teachers.length === 0 && <option value="Unknown">Unknown</option>}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-white cursor-pointer">Cancel</button>
          {!questionId && (
            <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-teal-300 text-teal-700 text-xs font-bold hover:bg-teal-50 cursor-pointer disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> Save & Add Another
            </button>
          )}
          <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#1B365D] hover:bg-[#152946] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
