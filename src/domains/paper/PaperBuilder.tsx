import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Check, ChevronRight, Plus, Trash2, ArrowLeft, Printer,
  Download, Search, AlertTriangle, FileText, CheckCircle2,
  Layers, Filter, ChevronUp, ChevronDown, Copy, Edit2, X,
  ZoomIn, ZoomOut, Type,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CLASS_LEVELS, TEST_TYPES, getDatabase } from '../../database/db';
import { getSubjects } from '../../services/curriculumService';
import { getQuestions } from '../../services/questionService';
import {
  savePaper, getPaperById, getTemplates, buildSectionsFromTemplate,
  parsePaperSections, parsePaperDetails, updatePaperStatus,
} from '../../services/paperService';
import { getSchoolConfig } from '../../services/schoolService';
import { validatePaperDetails } from '../../utils/validation';
import PaperPreview, { DEFAULT_PRINT_SETTINGS, type PrintSettings } from './PaperPreview';
import type {
  PaperSection, PaperQuestion, PaperDetails, SchoolConfig, Subject, Question,
} from '../../types';

const LAYOUT_OPTIONS = ['Monthly Test', 'Board Standard A4', 'Minimal Class Test'] as const;
const PAPER_LANGUAGES = ['English', 'Urdu', 'Arabic', 'Mixed'] as const;

type DbTemplate = { id: number; name: string; sections: string; marks: number; duration: string; language: string; isDefault: boolean };

function mapTemplateNameToLayout(name: string): string {
  if (name.includes('Board')) return 'Board Standard A4';
  if (name.includes('Minimal')) return 'Minimal Class Test';
  return 'Monthly Test';
}

type ExtendedPaperQuestion = PaperQuestion & { chapter_name?: string };

function questionToPaperQuestion(q: Question): ExtendedPaperQuestion {
  return {
    id: q.id,
    content: q.content,
    question_type: q.question_type,
    difficulty: q.difficulty,
    marks: q.marks,
    class_level: q.class_level,
    subject_name: q.subject_name,
    direction: q.direction,
    chapter_name: q.chapter_name,
  };
}

function isCustomQuestion(id: number): boolean {
  return id < 0;
}

function estimatePages(sections: PaperSection[]): number {
  const questionCount = sections.reduce((sum, s) => sum + (s.type === 'pagebreak' || s.type === 'instruction' ? 0 : s.questions.length), 0);
  const breaks = sections.filter(s => s.type === 'pagebreak').length;
  const sectionCount = sections.filter(s => s.type !== 'pagebreak' && s.type !== 'instruction').length;
  return Math.max(1, Math.ceil(questionCount / 4 + sectionCount * 0.4 + breaks));
}

function isRtlLanguage(language: string): boolean {
  return language === 'Urdu' || language === 'Arabic' || language === 'Mixed';
}

export default function PaperBuilder() {
  const { editPaperId, navigate, confirm, showToast, triggerRefresh } = useApp();

  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const [paperId, setPaperId] = useState<number | null>(editPaperId);
  const [loading, setLoading] = useState(true);
  const rtlToastShown = useRef(false);

  // Step 1
  const [title, setTitle] = useState('');
  const [classLevel, setClassLevel] = useState('Grade 9');
  const [subject, setSubject] = useState('');
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [testType, setTestType] = useState('Monthly Test');
  const [language, setLanguage] = useState('English');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('1 hr');
  const [targetMarks, setTargetMarks] = useState(25);
  const [chapters, setChapters] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [template, setTemplate] = useState<string>('Monthly Test');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Data from DB
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<{ id: number; name: string }[]>([]);
  const [dbTemplates, setDbTemplates] = useState<DbTemplate[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [school, setSchool] = useState<SchoolConfig | null>(null);

  // Step 2 & 3
  const [sections, setSections] = useState<PaperSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lockToSubject, setLockToSubject] = useState(true);

  // Step 4
  const [printSettings, setPrintSettings] = useState<PrintSettings>({ ...DEFAULT_PRINT_SETTINGS });
  const instructions = 'Attempt all sections.';

  // Custom question modal
  const [customModal, setCustomModal] = useState<{
    open: boolean;
    sectionId: string;
    content: string;
    marks: number;
    editId?: number;
  }>({ open: false, sectionId: '', content: '', marks: 2 });

  const markDirty = useCallback(() => setDirty(true), []);

  const applyDbTemplate = useCallback((tpl: DbTemplate) => {
    setTargetMarks(tpl.marks);
    setDuration(tpl.duration);
    setSections(buildSectionsFromTemplate(tpl.sections));
    setTemplate(mapTemplateNameToLayout(tpl.name));
    if (tpl.language) setLanguage(tpl.language);
    const built = buildSectionsFromTemplate(tpl.sections);
    if (built.length > 0) setActiveSectionId(built[0].id);
  }, []);

  // Load initial data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await getDatabase();
        const [subs, tpls, qs, sch, tRes] = await Promise.all([
          getSubjects(),
          getTemplates(),
          getQuestions(),
          getSchoolConfig(),
          db.select<{ id: number; name: string }[]>(
            'SELECT id, name FROM teachers WHERE is_archived = 0 OR is_archived IS NULL ORDER BY name;'
          ),
        ]);
        if (cancelled) return;

        setSubjects(subs);
        setDbTemplates(tpls);
        setAvailableQuestions(qs);
        setSchool(sch);
        setTeachers(tRes ?? []);

        if (subs.length > 0 && !subject) {
          setSubject(subs[0].name);
          setSubjectId(subs[0].id);
        }
        if (tRes && tRes.length > 0 && !teacherName) {
          setTeacherName(tRes[0].name);
        }

        const defaultTpl = tpls.find(t => t.isDefault) ?? tpls[0];
        if (defaultTpl && !editPaperId) {
          setSelectedTemplateId(defaultTpl.id);
          applyDbTemplate(defaultTpl);
        } else if (!editPaperId && sections.length === 0) {
          const built = buildSectionsFromTemplate('MCQs, Short Questions, Long Questions');
          setSections(built);
          setActiveSectionId(built[0]?.id ?? '');
        }

        if (editPaperId) {
          const paper = await getPaperById(editPaperId);
          if (paper && !cancelled) {
            const details = parsePaperDetails(paper.paper_details_json || '{}', {
              title: paper.title,
              classLevel: paper.class_level,
              subject: paper.subject_name,
              subjectId: paper.subject_id,
              testType: paper.test_type,
              language: paper.language || 'English',
              date: new Date().toISOString().split('T')[0],
              duration: paper.duration || '1 hr',
              targetMarks: paper.marks,
              chapters: paper.chapters || '',
              teacherName: paper.teacher_name,
              template: paper.template || 'Monthly Test',
            });
            setPaperId(paper.id);
            setTitle(details.title);
            setClassLevel(details.classLevel);
            setSubject(details.subject);
            setSubjectId(details.subjectId ?? paper.subject_id);
            setTestType(details.testType);
            setLanguage(details.language);
            setDate(details.date || new Date().toISOString().split('T')[0]);
            setDuration(details.duration);
            setTargetMarks(details.targetMarks);
            setChapters(details.chapters);
            setTeacherName(details.teacherName);
            setTemplate(details.template);
            const parsedSections = parsePaperSections(paper.questions_json || '[]');
            if (parsedSections.length > 0) {
              setSections(parsedSections);
              setActiveSectionId(parsedSections[0].id);
            }
            const matchedTpl = tpls.find(t => t.name === details.template || mapTemplateNameToLayout(t.name) === details.template);
            if (matchedTpl) setSelectedTemplateId(matchedTpl.id);
          }
        }
      } catch {
        showToast('Failed to load paper builder data.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPaperId]);

  // RTL warning on step 4
  useEffect(() => {
    if (step === 4 && isRtlLanguage(language) && !rtlToastShown.current) {
      rtlToastShown.current = true;
      showToast('RTL language selected — verify print layout and font rendering before printing.', 'warning');
    }
    if (step !== 4) rtlToastShown.current = false;
  }, [step, language, showToast]);

  const handleSubjectChange = (name: string) => {
    setSubject(name);
    const sub = subjects.find(s => s.name === name);
    setSubjectId(sub?.id);
    markDirty();
  };

  const handleDbTemplateChange = (id: number | '') => {
    setSelectedTemplateId(id);
    markDirty();
    if (id === '') return;
    const tpl = dbTemplates.find(t => t.id === id);
    if (tpl) applyDbTemplate(tpl);
  };

  const buildDetails = (): PaperDetails => ({
    title, classLevel, subject, subjectId, testType, language, date,
    duration, targetMarks, chapters, teacherName, template,
  });

  const handleSave = async (status: 'Draft' | 'Final' = 'Draft') => {
    setSaveStatus('saving');
    try {
      const id = await savePaper({
        id: paperId ?? undefined,
        details: buildDetails(),
        sections,
        status,
        subjectId,
      });
      setPaperId(id);
      if (status === 'Final') await updatePaperStatus(id, 'Final');
      setSaveStatus('saved');
      setDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (status === 'Final') {
        showToast('Paper saved as Final.', 'success');
        triggerRefresh();
      }
      return id;
    } catch {
      showToast('Failed to save paper.', 'error');
      setSaveStatus('idle');
      return null;
    }
  };

  const handleCancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes. Are you sure you want to leave the paper builder?',
        confirmLabel: 'Leave',
        cancelLabel: 'Stay',
        destructive: true,
      });
      if (!ok) return;
    }
    navigate('history');
  };

  const validateStep1 = (): boolean => {
    const result = validatePaperDetails({
      title, classLevel, subject, testType, targetMarks, duration, teacherName, date,
    });
    setFieldErrors(result.errors);
    return result.valid;
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (totalAddedQuestions === 0) {
        const ok = await confirm({
          title: 'No questions added',
          message: 'This paper has no questions yet. Continue to arrange step anyway?',
          confirmLabel: 'Continue',
          cancelLabel: 'Stay',
        });
        if (!ok) return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (marksRemaining !== 0) {
        const ok = await confirm({
          title: 'Marks mismatch',
          message: `Paper total is ${totalAddedMarks} marks but target is ${targetMarks}. Continue to preview anyway?`,
          confirmLabel: 'Continue',
          cancelLabel: 'Stay',
        });
        if (!ok) return;
      }
      setStep(4);
    }
  };

  const handleFinish = async () => {
    const id = await handleSave('Final');
    if (id) navigate('history');
  };

  // Calculations
  const questionSections = sections.filter(s => s.type !== 'instruction' && s.type !== 'pagebreak');
  const allAddedQuestions = questionSections.flatMap(s => s.questions);
  const totalAddedMarks = allAddedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const totalAddedQuestions = allAddedQuestions.length;
  const marksRemaining = targetMarks - totalAddedMarks;
  const emptySections = questionSections.filter(s => s.questions.length === 0);
  const duplicateTopics = (() => {
    const topics = allAddedQuestions.map(q => (q as ExtendedPaperQuestion).chapter_name).filter(Boolean);
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const t of topics) {
      if (seen.has(t!)) dupes.add(t!);
      seen.add(t!);
    }
    return [...dupes];
  })();

  const filteredQuestions = availableQuestions.filter(q => {
    const matchesClass = q.class_level === classLevel;
    const matchesSubject = !lockToSubject || q.subject_name.toLowerCase() === subject.toLowerCase();
    const matchesSearch = !searchQuery ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.question_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.difficulty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSubject && matchesSearch;
  });

  const updatePrintSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setPrintSettings(prev => ({ ...prev, [key]: value }));
    markDirty();
  };

  // Section / question actions
  const handleAddSection = () => {
    const name = window.prompt('Section title:');
    if (!name?.trim()) return;
    const id = `sec-${Date.now()}`;
    const newSec: PaperSection = { id, title: name.trim(), description: '', questions: [] };
    setSections(prev => [...prev, newSec]);
    setActiveSectionId(id);
    markDirty();
  };

  const handleAddQuestionToSection = (q: Question) => {
    if (!activeSectionId) return;
    setSections(prev => prev.map(sec => {
      if (sec.id !== activeSectionId || sec.type === 'instruction' || sec.type === 'pagebreak') return sec;
      if (sec.questions.some(item => item.id === q.id)) return sec;
      return { ...sec, questions: [...sec.questions, questionToPaperQuestion(q)] };
    }));
    markDirty();
  };

  const handleRemoveQuestion = (sectionId: string, questionId: number) => {
    setSections(prev => prev.map(sec =>
      sec.id === sectionId ? { ...sec, questions: sec.questions.filter(q => q.id !== questionId) } : sec
    ));
    markDirty();
  };

  const handleMoveQuestion = (sectionId: string, questionId: number, direction: 'up' | 'down') => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const idx = sec.questions.findIndex(q => q.id === questionId);
      if (idx < 0) return sec;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sec.questions.length) return sec;
      const qs = [...sec.questions];
      [qs[idx], qs[newIdx]] = [qs[newIdx], qs[idx]];
      return { ...sec, questions: qs };
    }));
    markDirty();
  };

  const handleDuplicateQuestion = (sectionId: string, q: PaperQuestion) => {
    const copy: PaperQuestion = { ...q, id: isCustomQuestion(q.id) ? -Date.now() : -Date.now() };
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const idx = sec.questions.findIndex(item => item.id === q.id);
      const qs = [...sec.questions];
      qs.splice(idx + 1, 0, copy);
      return { ...sec, questions: qs };
    }));
    markDirty();
  };

  const handleAddInstruction = () => {
    const text = window.prompt('Instruction text:');
    if (!text?.trim()) return;
    const id = `inst-${Date.now()}`;
    setSections(prev => [...prev, { id, title: 'Instructions', description: text.trim(), questions: [], type: 'instruction' }]);
    markDirty();
  };

  const handleAddPageBreak = () => {
    const id = `pb-${Date.now()}`;
    setSections(prev => [...prev, { id, title: '', description: '', questions: [], type: 'pagebreak' }]);
    markDirty();
  };

  const handleAttemptAnyChange = (sectionId: string, value: number | undefined) => {
    setSections(prev => prev.map(sec =>
      sec.id === sectionId ? { ...sec, attempt_any: value } : sec
    ));
    markDirty();
  };

  const openCustomModal = (sectionId: string, editQ?: PaperQuestion) => {
    setCustomModal({
      open: true,
      sectionId,
      content: editQ?.content ?? '',
      marks: editQ?.marks ?? 2,
      editId: editQ?.id,
    });
  };

  const saveCustomQuestion = () => {
    const { sectionId, content, marks, editId } = customModal;
    if (!content.trim() || marks < 1) return;
    if (editId !== undefined) {
      setSections(prev => prev.map(sec => ({
        ...sec,
        questions: sec.questions.map(q =>
          q.id === editId ? { ...q, content: content.trim(), marks } : q
        ),
      })));
    } else {
      const newQ: PaperQuestion = {
        id: -Date.now(),
        content: content.trim(),
        question_type: 'Custom',
        difficulty: 'Medium',
        marks,
        class_level: classLevel,
        subject_name: subject,
      };
      setSections(prev => prev.map(sec =>
        sec.id === sectionId ? { ...sec, questions: [...sec.questions, newQ] } : sec
      ));
    }
    setCustomModal({ open: false, sectionId: '', content: '', marks: 2 });
    markDirty();
  };

  const fieldError = (key: string) => fieldErrors[key];

  if (loading) {
    return (
      <div className="min-h-full bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-sm font-bold text-slate-500">Loading paper builder…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] font-sans text-slate-800 pb-16">
      {/* TOP STEPPER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
            {[
              { num: 1, label: 'Paper Details' },
              { num: 2, label: 'Add Questions' },
              { num: 3, label: 'Arrange Paper' },
              { num: 4, label: 'Preview & Print' },
            ].map((s, idx) => {
              const isCompleted = step > s.num;
              const isActive = step === s.num;
              return (
                <div key={s.num} className="flex items-center gap-2 sm:gap-3">
                  <div
                    onClick={() => s.num <= step && setStep(s.num)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                      isActive ? 'bg-[#1B365D] text-white shadow-sm' :
                      isCompleted ? 'text-[#0D9488] hover:bg-teal-50' :
                      'text-slate-400'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-white text-[#1B365D]' :
                      isCompleted ? 'bg-[#0D9488] text-white' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
                    </span>
                    <span>{s.label}</span>
                  </div>
                  {idx < 3 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave('Draft')}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save Draft'}</span>
            </button>
            {step < 4 ? (
              <button
                onClick={handleContinue}
                className="flex items-center gap-1.5 bg-[#1B365D] hover:bg-[#152946] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <span>{step === 1 ? 'Continue to Questions' : step === 2 ? 'Continue to Arrange' : 'Continue to Preview'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0b7d73] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Save</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-7 md:p-8 shadow-2xs space-y-6">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight border-b border-slate-100 pb-4">
              Paper Details
            </h2>
            <div className="space-y-5 text-xs font-bold text-slate-700">
              <div className="space-y-1.5">
                <label className="block">Paper Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markDirty(); setFieldErrors(prev => ({ ...prev, title: '' })); }}
                  className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs ${fieldError('title') ? 'border-red-400' : 'border-slate-200'}`}
                />
                {fieldError('title') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('title')}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Class <span className="text-red-500">*</span></label>
                  <select
                    value={classLevel}
                    onChange={(e) => { setClassLevel(e.target.value); markDirty(); }}
                    className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 shadow-2xs ${fieldError('classLevel') ? 'border-red-400' : 'border-slate-200'}`}
                  >
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {fieldError('classLevel') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('classLevel')}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="block">Subject <span className="text-red-500">*</span></label>
                  <select
                    value={subject}
                    onChange={(e) => { handleSubjectChange(e.target.value); setFieldErrors(prev => ({ ...prev, subject: '' })); }}
                    className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 shadow-2xs ${fieldError('subject') ? 'border-red-400' : 'border-slate-200'}`}
                  >
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  {fieldError('subject') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('subject')}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Test Type <span className="text-red-500">*</span></label>
                  <select
                    value={testType}
                    onChange={(e) => { setTestType(e.target.value); markDirty(); }}
                    className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 shadow-2xs ${fieldError('testType') ? 'border-red-400' : 'border-slate-200'}`}
                  >
                    {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {fieldError('testType') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('testType')}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="block">Paper Language</label>
                  <select
                    value={language}
                    onChange={(e) => { setLanguage(e.target.value); markDirty(); }}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs"
                  >
                    {PAPER_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); markDirty(); setFieldErrors(prev => ({ ...prev, date: '' })); }}
                    className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 shadow-2xs ${fieldError('date') ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {fieldError('date') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('date')}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="block">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => { setDuration(e.target.value); markDirty(); setFieldErrors(prev => ({ ...prev, duration: '' })); }}
                    className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 shadow-2xs ${fieldError('duration') ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {fieldError('duration') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('duration')}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="block">Total Marks <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={targetMarks}
                    onChange={(e) => { setTargetMarks(Number(e.target.value)); markDirty(); setFieldErrors(prev => ({ ...prev, targetMarks: '' })); }}
                    className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 shadow-2xs ${fieldError('targetMarks') ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {fieldError('targetMarks') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('targetMarks')}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block">Selected Chapters / Topics</label>
                <input
                  type="text"
                  value={chapters}
                  onChange={(e) => { setChapters(e.target.value); markDirty(); }}
                  placeholder="e.g. Kinematics, Dynamics"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Teacher Name</label>
                  <select
                    value={teacherName}
                    onChange={(e) => { setTeacherName(e.target.value); markDirty(); setFieldErrors(prev => ({ ...prev, teacherName: '' })); }}
                    className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold text-slate-800 shadow-2xs ${fieldError('teacherName') ? 'border-red-400' : 'border-slate-200'}`}
                  >
                    <option value="">Select teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                  {fieldError('teacherName') && <p className="text-red-500 text-[11px] font-semibold">{fieldError('teacherName')}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="block">Paper Template (DB)</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleDbTemplateChange(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs"
                  >
                    <option value="">Custom (manual)</option>
                    {dbTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block">Print Template Layout <span className="text-teal-600 font-extrabold">*</span></label>
                <select
                  value={template}
                  onChange={(e) => { setTemplate(e.target.value); markDirty(); }}
                  className="w-full p-3 bg-teal-50/50 border-2 border-[#0D9488] rounded-xl text-sm font-extrabold text-slate-900 shadow-sm"
                >
                  {LAYOUT_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6 sticky top-24">
              <h3 className="font-extrabold text-slate-800 text-base tracking-tight">Paper Setup Summary</h3>
              <div className="space-y-3.5 text-xs">
                {[
                  { label: 'Title', value: title || '—' },
                  { label: 'Class', value: classLevel },
                  { label: 'Subject', value: subject || '—' },
                  { label: 'Test Type', value: testType },
                  { label: 'Template', value: template },
                  { label: 'Language', value: language },
                  { label: 'Duration', value: duration },
                  { label: 'Teacher', value: teacherName || '—' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-400 font-medium">{item.label}</span>
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-5 space-y-1 text-center">
                <span className="text-xs font-semibold text-slate-500 block">Target total marks</span>
                <span className="text-3xl font-black text-[#0D9488] block">{targetMarks}</span>
                <span className="text-[11px] font-medium text-slate-500 block pt-1">
                  Currently added: {totalAddedMarks} marks · {totalAddedQuestions} questions
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-3 space-y-3 sticky top-24">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Layers className="w-3.5 h-3.5" /> Paper Sections
            </h3>
            <div className="space-y-2.5">
              {sections.filter(s => s.type !== 'instruction' && s.type !== 'pagebreak').map(sec => {
                const secMarks = sec.questions.reduce((s, q) => s + (q.marks || 0), 0);
                const isActive = activeSectionId === sec.id;
                return (
                  <div
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer bg-white shadow-2xs ${
                      isActive ? 'border-[#0D9488] bg-teal-50/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-800">{sec.title}</div>
                    <div className="text-xs text-slate-400 font-medium mt-1">
                      {sec.questions.length} questions · {secMarks} marks
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleAddSection}
              className="w-full py-2.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Add Section</span>
            </button>
            {activeSectionId && (
              <button
                onClick={() => openCustomModal(activeSectionId)}
                className="w-full py-2.5 border border-teal-300 bg-teal-50 hover:bg-teal-100 rounded-xl text-xs font-bold text-teal-800 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Question</span>
              </button>
            )}
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                  <Filter className="w-4 h-4" />
                </div>
                <div className="text-xs min-w-0">
                  <span className="text-slate-400 font-medium">Filtering by: </span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5 sm:mt-0">
                    {lockToSubject ? `${subject} (${classLevel})` : `${classLevel} · All Subjects`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLockToSubject(!lockToSubject)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  lockToSubject
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                }`}
              >
                {lockToSubject ? 'Show All Subjects' : 'Lock to Subject'}
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${lockToSubject ? subject : 'all'} questions…`}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
              />
            </div>

            <div className="space-y-3.5">
              {filteredQuestions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-600">No questions found</p>
                  <p className="text-xs text-slate-400">Try changing filters or add a custom question.</p>
                </div>
              ) : (
                filteredQuestions.map(q => {
                  const isAdded = sections.some(s => s.questions.some(item => item.id === q.id));
                  return (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 hover:border-slate-300 transition-all">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">{q.content}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60">{q.question_type}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">{q.difficulty}</span>
                          <span className="text-xs font-medium text-slate-400">
                            {q.class_level} · <strong className="text-slate-700">{q.subject_name}</strong> · <span className="font-bold text-slate-600">{q.marks} marks</span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddQuestionToSection(q)}
                          disabled={isAdded || !activeSectionId}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs'
                          }`}
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{isAdded ? 'Added' : 'Add'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4 sticky top-24">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Current Paper</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-xl font-extrabold text-slate-800 block">{totalAddedMarks}</span>
                <span className="text-[11px] font-medium text-slate-400">Total Marks</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-xl font-extrabold text-slate-800 block">{totalAddedQuestions}</span>
                <span className="text-[11px] font-medium text-slate-400">Questions</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-xl font-extrabold text-slate-800 block">{duration}</span>
                <span className="text-[11px] font-medium text-slate-400">Time</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-xl font-extrabold text-slate-800 block">{targetMarks}</span>
                <span className="text-[11px] font-medium text-slate-400">Target</span>
              </div>
            </div>

            {marksRemaining !== 0 && (
              <div className="bg-[#FFFBEB] border border-[#FEF08A] rounded-xl p-4 flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-[#B45309] leading-relaxed">
                  Paper total is {totalAddedMarks} marks; target is {targetMarks}. <span className="font-extrabold">{Math.abs(marksRemaining)} marks {marksRemaining > 0 ? 'remaining' : 'over'}.</span>
                </div>
              </div>
            )}

            {emptySections.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-red-700">
                  {emptySections.length} section(s) have no questions: {emptySections.map(s => s.title).join(', ')}
                </div>
              </div>
            )}

            {duplicateTopics.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-amber-800">
                  Duplicate topics detected: {duplicateTopics.join(', ')}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-500 block border-b border-slate-100 pb-2">Section details</span>
              <div className="space-y-2 text-xs">
                {questionSections.map(sec => {
                  const sMarks = sec.questions.reduce((s, q) => s + (q.marks || 0), 0);
                  return (
                    <div key={sec.id} className="flex items-center justify-between font-semibold">
                      <span className="text-slate-700 truncate max-w-[140px]">{sec.title}</span>
                      <span className="text-slate-500 font-mono">{sMarks} m</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Arrange & Finalize Sections</h2>
                <p className="text-xs text-slate-500">Reorder questions, set attempt limits, and add instructions or page breaks.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleAddInstruction} className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer">
                  Add Instruction Block
                </button>
                <button onClick={handleAddPageBreak} className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer">
                  Add Page Break
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {sections.map(sec => {
                if (sec.type === 'instruction') {
                  return (
                    <div key={sec.id} className="bg-teal-50 border border-teal-200 rounded-2xl p-5 shadow-2xs flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-teal-600">Instruction Block</span>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{sec.description}</p>
                      </div>
                      <button onClick={() => { setSections(prev => prev.filter(s => s.id !== sec.id)); markDirty(); }} className="text-slate-400 hover:text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }
                if (sec.type === 'pagebreak') {
                  return (
                    <div key={sec.id} className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">— Page Break —</span>
                      <button onClick={() => { setSections(prev => prev.filter(s => s.id !== sec.id)); markDirty(); }} className="text-slate-400 hover:text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }

                const secMarks = sec.questions.reduce((s, q) => s + (q.marks || 0), 0);
                return (
                  <div key={sec.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
                      <h3 className="font-bold text-slate-800 text-base">{sec.title}</h3>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                          Attempt any:
                          <input
                            type="number"
                            min={0}
                            max={sec.questions.length || 99}
                            value={sec.attempt_any ?? ''}
                            onChange={(e) => handleAttemptAnyChange(sec.id, e.target.value ? Number(e.target.value) : undefined)}
                            className="w-14 p-1 border border-slate-200 rounded-lg text-center text-xs font-bold"
                            placeholder="All"
                          />
                        </label>
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                          {sec.questions.length} Q · {secMarks} Marks
                        </span>
                      </div>
                    </div>

                    {sec.questions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No questions in this section.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {sec.questions.map((q, qIdx) => (
                          <div key={q.id} className="py-3 flex items-start justify-between gap-4 group">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="font-bold text-sm text-slate-400 mt-0.5 shrink-0">{qIdx + 1}.</span>
                              <p className="text-xs sm:text-sm font-semibold text-slate-800 whitespace-pre-line">{q.content}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-bold text-slate-600 mr-1">[{q.marks}m]</span>
                              <button onClick={() => handleMoveQuestion(sec.id, q.id, 'up')} disabled={qIdx === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer" title="Move up">
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleMoveQuestion(sec.id, q.id, 'down')} disabled={qIdx === sec.questions.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer" title="Move down">
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDuplicateQuestion(sec.id, q)} className="p-1 text-slate-400 hover:text-teal-600 cursor-pointer" title="Duplicate">
                                <Copy className="w-4 h-4" />
                              </button>
                              {isCustomQuestion(q.id) && (
                                <button onClick={() => openCustomModal(sec.id, q)} className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer" title="Edit">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleRemoveQuestion(sec.id, q.id)} className="p-1 text-slate-300 hover:text-red-500 cursor-pointer" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4 sticky top-24">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm">Paper Summary</h3>
              <div className="text-center bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-4">
                <span className="text-2xl font-black text-[#0D9488]">{totalAddedMarks}</span>
                <span className="text-xs text-slate-500 block">/ {targetMarks} target marks</span>
              </div>
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-500 block">Section distribution</span>
                {questionSections.map(sec => {
                  const sMarks = sec.questions.reduce((s, q) => s + (q.marks || 0), 0);
                  const pct = targetMarks > 0 ? Math.round((sMarks / targetMarks) * 100) : 0;
                  return (
                    <div key={sec.id}>
                      <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                        <span className="truncate max-w-[160px]">{sec.title}</span>
                        <span>{sMarks}m ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
                Estimated pages: ~{estimatePages(sections)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Print Options</h3>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                Show Header
                <input type="checkbox" checked={printSettings.showHeader} onChange={(e) => updatePrintSetting('showHeader', e.target.checked)} className="rounded" />
              </label>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                Show Footer
                <input type="checkbox" checked={printSettings.showFooter} onChange={(e) => updatePrintSetting('showFooter', e.target.checked)} className="rounded" />
              </label>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                Show Answer Key
                <input type="checkbox" checked={printSettings.showAnswerKey} onChange={(e) => updatePrintSetting('showAnswerKey', e.target.checked)} className="rounded" />
              </label>
            </div>

            {marksRemaining !== 0 && (
              <div className="bg-[#FFFBEB] border border-[#FEF08A] rounded-xl p-4 flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-[#B45309]">
                  Marks mismatch: {totalAddedMarks} added vs {targetMarks} target.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="animate-fadeIn print:block">
          <div className="bg-[#1E293B] text-slate-300 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold shadow-md print:hidden">
            <button onClick={() => setStep(3)} className="flex items-center gap-1.5 text-white hover:underline cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Edit</span>
            </button>
            <div className="flex items-center gap-4">
              <span className="bg-slate-800 text-teal-400 px-2.5 py-1 rounded border border-slate-700">Layout: {template}</span>
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => updatePrintSetting('zoom', Math.max(70, printSettings.zoom - 5))}
                  className="p-1.5 hover:bg-slate-700 rounded cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 min-w-[3rem] text-center">{printSettings.zoom}%</span>
                <button
                  onClick={() => updatePrintSetting('zoom', Math.min(120, printSettings.zoom + 5))}
                  className="p-1.5 hover:bg-slate-700 rounded cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <span className="text-slate-400">~{estimatePages(sections)} pages</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                <span>Save as PDF</span>
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0D9488] hover:bg-[#0b7d73] text-white rounded-lg font-extrabold shadow-sm transition-all cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 print:p-0 print:max-w-none">
            <div className="lg:col-span-9 py-8 flex justify-center bg-slate-200/70 print:bg-white print:py-0 overflow-auto">
              <PaperPreview
                school={school}
                title={title}
                classLevel={classLevel}
                subject={subject}
                testType={testType}
                date={date}
                duration={duration}
                targetMarks={targetMarks}
                teacherName={teacherName}
                language={language}
                template={template}
                sections={sections}
                settings={printSettings}
                instructions={instructions}
              />
            </div>

            <div className="lg:col-span-3 space-y-4 print:hidden sticky top-24">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Type className="w-4 h-4 text-slate-500" /> Print Settings
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Paper Size</label>
                  <select
                    value={printSettings.paperSize}
                    onChange={(e) => updatePrintSetting('paperSize', e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="A4">A4</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Margins</label>
                  <select
                    value={printSettings.margins}
                    onChange={(e) => updatePrintSetting('margins', e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="15mm">15 mm</option>
                    <option value="20mm">20 mm</option>
                    <option value="25mm">25 mm</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Font Size: {printSettings.fontSize}px</label>
                  <input
                    type="range"
                    min={10}
                    max={16}
                    value={printSettings.fontSize}
                    onChange={(e) => updatePrintSetting('fontSize', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {([
                    ['showHeader', 'Header'],
                    ['showFooter', 'Footer'],
                    ['pageNumbering', 'Page Numbering'],
                    ['watermark', 'Watermark'],
                    ['showAnswerKey', 'Answer Key'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                      {label}
                      <input
                        type="checkbox"
                        checked={printSettings[key]}
                        onChange={(e) => updatePrintSetting(key, e.target.checked)}
                        className="rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {isRtlLanguage(language) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs font-semibold text-amber-800">
                    RTL language selected. Verify text direction and fonts before printing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom question modal */}
      {customModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800">{customModal.editId !== undefined ? 'Edit Custom Question' : 'Add Custom Question'}</h3>
              <button onClick={() => setCustomModal(m => ({ ...m, open: false }))} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Question Content</label>
                <textarea
                  value={customModal.content}
                  onChange={(e) => setCustomModal(m => ({ ...m, content: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold resize-none"
                  placeholder="Enter question text…"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Marks</label>
                <input
                  type="number"
                  min={1}
                  value={customModal.marks}
                  onChange={(e) => setCustomModal(m => ({ ...m, marks: Number(e.target.value) }))}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCustomModal(m => ({ ...m, open: false }))} className="px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
              <button onClick={saveCustomQuestion} className="px-4 py-2 bg-[#1B365D] text-white rounded-xl text-xs font-bold cursor-pointer">Save Question</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
