import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, Edit, Copy, Archive, Plus } from 'lucide-react';
import { CLASS_LEVELS, QUESTION_TYPES } from '../../database/db';
import { getQuestions, archiveQuestion, duplicateQuestion, getFilterOptions } from '../../services/questionService';
import { useApp } from '../../context/AppContext';
import QuestionEditor from './QuestionEditor';
import type { Question } from '../../types';

interface FilterState {
  classLevel: string;
  subject: string;
  chapter: string;
  questionType: string;
  difficulty: string;
  language: string;
  createdBy: string;
}

export default function QuestionBank() {
  const { showToast, confirm, openQuestionEditor, editQuestionId, navigate, refreshKey } = useApp();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterOptions, setFilterOptions] = useState({ subjects: [] as string[], chapters: [] as string[], teachers: [] as string[] });

  const [filters, setFilters] = useState<FilterState>({
    classLevel: 'All', subject: 'All', chapter: 'All',
    questionType: 'All', difficulty: 'All', language: 'All', createdBy: 'All',
  });

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const [qs, opts] = await Promise.all([getQuestions(), getFilterOptions()]);
      setQuestions(qs);
      setFilterOptions(opts);
      if (qs.length > 0 && !selectedId) setSelectedId(qs[0].id);
    } catch (err) {
      showToast('Failed to load questions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  useEffect(() => {
    if (openQuestionEditor) { setShowEditor(true); setEditingId(editQuestionId); }
  }, [openQuestionEditor, editQuestionId]);

  const filteredQuestions = questions.filter(q => {
    const matchClass = filters.classLevel === 'All' || q.class_level === filters.classLevel;
    const matchSub = filters.subject === 'All' || q.subject_name === filters.subject;
    const matchChap = filters.chapter === 'All' || q.chapter_name === filters.chapter;
    const matchType = filters.questionType === 'All' || q.question_type === filters.questionType;
    const matchDiff = filters.difficulty === 'All' || q.difficulty === filters.difficulty;
    const matchLang = filters.language === 'All' || q.language === filters.language;
    const matchAuthor = filters.createdBy === 'All' || q.created_by === filters.createdBy;
    const matchSearch = !searchQuery ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.tags && q.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchClass && matchSub && matchChap && matchType && matchDiff && matchLang && matchAuthor && matchSearch;
  });

  const selectedQuestion = questions.find(q => q.id === selectedId) || filteredQuestions[0] || null;

  const handleClearFilters = () => {
    setFilters({ classLevel: 'All', subject: 'All', chapter: 'All', questionType: 'All', difficulty: 'All', language: 'All', createdBy: 'All' });
    setSearchQuery('');
  };

  const handleArchive = async (id: number) => {
   // const q = questions.find(x => x.id === id);
    const confirmed = await confirm({
      title: 'Archive Question?',
      message: `Are you sure you want to archive this question? It will be removed from the active question bank.`,
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await archiveQuestion(id);
      setQuestions(prev => prev.filter(x => x.id !== id));
      if (selectedId === id) setSelectedId(questions.find(x => x.id !== id)?.id ?? null);
      showToast('Question archived successfully.', 'success');
    } catch {
      showToast('Failed to archive question.', 'error');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const newId = await duplicateQuestion(id);
      await loadQuestions();
      setSelectedId(newId);
      showToast('Question duplicated successfully.', 'success');
    } catch {
      showToast('Failed to duplicate question.', 'error');
    }
  };

  const openAdd = () => { setEditingId(null); setShowEditor(true); };
  const openEdit = (id: number) => { setEditingId(id); setShowEditor(true); };
  const closeEditor = () => { setShowEditor(false); setEditingId(null); navigate('questions'); };

  const allSubjects = [...new Set([...filterOptions.subjects, ...questions.map(q => q.subject_name)])].sort();
  const allChapters = [...new Set([...filterOptions.chapters, ...questions.map(q => q.chapter_name)])].sort();
  const allTeachers = [...new Set([...filterOptions.teachers, ...questions.map(q => q.created_by)])].sort();

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-8 space-y-8 font-sans text-slate-800 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <span className="text-xl font-extrabold text-slate-800 tracking-tight shrink-0">Question Bank</span>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search questions by keyword, subject, chapter..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs" />
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 bg-[#1B365D] hover:bg-[#152946] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-sm cursor-pointer">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filters */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 sticky top-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <h3 className="font-extrabold text-slate-800 text-sm">Filters</h3>
          </div>
          <div className="space-y-3.5 text-xs font-bold text-slate-700">
            {[
              { key: 'classLevel' as const, label: 'Class', options: ['All', ...CLASS_LEVELS] },
              { key: 'subject' as const, label: 'Subject', options: ['All', ...allSubjects] },
              { key: 'chapter' as const, label: 'Chapter', options: ['All', ...allChapters] },
              { key: 'questionType' as const, label: 'Question Type', options: ['All', ...QUESTION_TYPES] },
              { key: 'difficulty' as const, label: 'Difficulty', options: ['All', 'Easy', 'Medium', 'Hard'] },
              { key: 'language' as const, label: 'Language', options: ['All', 'English', 'Urdu', 'Arabic', 'Bilingual'] },
              { key: 'createdBy' as const, label: 'Created by', options: ['All', ...allTeachers] },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-slate-500 font-semibold block">{f.label}</label>
                <select value={filters[f.key]} onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs cursor-pointer">
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <button onClick={handleClearFilters} className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-5 space-y-3.5 max-h-[82vh] overflow-y-auto pr-1">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
            {loading ? 'Loading...' : `Showing ${filteredQuestions.length} Questions`}
          </span>

          {!loading && filteredQuestions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <p className="text-sm font-bold text-slate-700">{questions.length === 0 ? 'No questions added yet' : 'No matching questions found'}</p>
              <p className="text-xs text-slate-400">{questions.length === 0 ? 'Start building your reusable question library.' : 'Try clearing your filters.'}</p>
              {questions.length === 0 && (
                <button onClick={openAdd} className="inline-flex items-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                  <Plus className="w-4 h-4" /> Add First Question
                </button>
              )}
            </div>
          ) : (
            filteredQuestions.map(q => {
              const isSelected = selectedId === q.id;
              const isRtl = q.language === 'Urdu' || q.language === 'Arabic';
              return (
                <div key={q.id} onClick={() => setSelectedId(q.id)}
                  className={`p-5 rounded-2xl transition-all cursor-pointer shadow-2xs space-y-3 ${isSelected ? 'border-2 border-[#0D9488] bg-[#0D9488]/5' : 'border border-slate-200 bg-white hover:border-slate-300'}`}>
                  <p className={`text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line line-clamp-3 ${isRtl ? 'text-right font-serif text-base' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                    {q.content}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1]">{q.question_type}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${q.difficulty === 'Easy' ? 'bg-[#DCFCE7] text-[#15803D]' : q.difficulty === 'Medium' ? 'bg-[#FEF9C3] text-[#A16207]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{q.difficulty}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate max-w-[220px]">
                      {q.class_level} · {q.subject_name} · {q.marks} marks · {q.created_ago}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-4 sticky top-6">
          {selectedQuestion ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-extrabold text-slate-800 text-base">Question Preview</h3>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1]">{selectedQuestion.question_type}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 min-h-[120px] flex items-center">
                <p className={`w-full text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-line ${selectedQuestion.language === 'Urdu' || selectedQuestion.language === 'Arabic' ? 'text-right font-serif text-lg' : 'text-left'}`}
                  dir={selectedQuestion.language === 'Urdu' || selectedQuestion.language === 'Arabic' ? 'rtl' : 'ltr'}>
                  {selectedQuestion.content}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[
                  { label: 'Class', value: selectedQuestion.class_level },
                  { label: 'Subject', value: selectedQuestion.subject_name },
                  { label: 'Chapter', value: selectedQuestion.chapter_name },
                  { label: 'Marks', value: selectedQuestion.marks },
                  { label: 'Difficulty', value: selectedQuestion.difficulty },
                  { label: 'Language', value: selectedQuestion.language },
                ].map(item => (
                  <div key={item.label} className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">{item.label}</span>
                    <span className="font-extrabold text-slate-800 block truncate">{item.value}</span>
                  </div>
                ))}
              </div>
              {selectedQuestion.tags && selectedQuestion.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedQuestion.tags.map((tag, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200/60">{tag}</span>
                  ))}
                </div>
              )}
              <div className="text-[11px] font-semibold text-slate-400">Created by {selectedQuestion.created_by} · {selectedQuestion.created_ago}</div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => openEdit(selectedQuestion.id)} className="flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDuplicate(selectedQuestion.id)} className="flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button onClick={() => handleArchive(selectedQuestion.id)} className="flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
                <button onClick={() => navigate('builder')} className="flex items-center justify-center gap-1.5 py-2.5 bg-[#1B365D] hover:bg-[#152946] text-white rounded-xl text-xs font-bold cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add to Paper
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">Select a question to preview</div>
          )}
        </div>
      </div>

      {showEditor && <QuestionEditor questionId={editingId} onClose={closeEditor} onSaved={() => loadQuestions()} />}
    </div>
  );
}
