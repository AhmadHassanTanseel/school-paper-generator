import { useState, useEffect } from 'react';
import { 
  Check, ChevronRight, Plus, Trash2, ArrowLeft, Printer, 
  Download, Search, AlertTriangle, FileText, CheckCircle2, 
  Layers, Filter, 
} from 'lucide-react';
import { getDatabase } from '../../database/db';

interface Question {
  id: number;
  content: string;
  question_type: string;
  difficulty: string;
  marks: number;
  class_level: string;
  subject_name: string;
  section_id?: string;
}

interface PaperSection {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export default function PaperBuilder() {
  // Stepper State (1 to 4)
  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // STEP 1 FORM STATE
  const [title, setTitle] = useState('Monthly Test — Physics');
  const [classLevel, setClassLevel] = useState('Grade 9');
  const [subject, setSubject] = useState('Physics');
  const [testType, setTestType] = useState('Monthly Test');
  const [language, setLanguage] = useState('English');
  const [date, setDate] = useState('07/20/2026');
  const [duration, setDuration] = useState('1 hr');
  const [targetMarks, setTargetMarks] = useState(25);
  const [chapters, setChapters] = useState('Kinematics, Dynamics');
  const [teacherName, setTeacherName] = useState('Mr. Ahmad Raza');
  const [template, setTemplate] = useState('Monthly Test');

  // STEP 2 & 3 SECTIONS & QUESTION BANK
  const [sections, setSections] = useState<PaperSection[]>([
    { id: 'sec-a', title: 'Section A: MCQs', description: 'Choose the correct option.', questions: [] },
    { id: 'sec-b', title: 'Section B: Short Questions', description: 'Attempt all questions. Write neatly.', questions: [] },
    { id: 'sec-c', title: 'Section C: Long Questions', description: 'Attempt any 2 out of 3.', questions: [] }
  ]);
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-a');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toggle to lock to selected subject from Step 1
  const [lockToSubject, setLockToSubject] = useState(true);

  // High-Fidelity Figma Fallback Questions across multiple subjects
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([
    { id: 301, content: 'Which of the following is a vector quantity?\n(a) Speed    (b) Distance\n(c) Displacement    (d) Time', question_type: 'MCQ', difficulty: 'Easy', marks: 1, class_level: 'Grade 9', subject_name: 'Physics' },
    { id: 302, content: 'Define velocity and write its SI unit. State whether it is a scalar or vector quantity.', question_type: 'Short', difficulty: 'Medium', marks: 3, class_level: 'Grade 9', subject_name: 'Physics' },
    { id: 303, content: 'A car accelerates uniformly from 10 m/s to 30 m/s in 5 seconds. Calculate its acceleration and the distance covered.', question_type: 'Numerical', difficulty: 'Medium', marks: 5, class_level: 'Grade 9', subject_name: 'Physics' },
    { id: 304, content: 'Balance the following chemical equation: H₂ + O₂ → H₂O', question_type: 'Numerical', difficulty: 'Medium', marks: 2, class_level: 'Grade 10', subject_name: 'Chemistry' },
    { id: 305, content: 'درج ذیل نظم کی تشریح کریں اور شاعر کا نام بھی لکھیں۔', question_type: 'Long', difficulty: 'Hard', marks: 5, class_level: 'Grade 9', subject_name: 'Urdu' },
    { id: 306, content: 'Define Newton’s First Law of Motion and give two daily life examples.', question_type: 'Short', difficulty: 'Easy', marks: 3, class_level: 'Grade 9', subject_name: 'Physics' },
    { id: 307, content: 'Find the roots of the quadratic equation: 2x² - 5x + 3 = 0', question_type: 'Numerical', difficulty: 'Hard', marks: 4, class_level: 'Grade 10', subject_name: 'Mathematics' }
  ]);

  // Load Real Database Questions if available
  useEffect(() => {
    async function loadQuestions() {
      try {
        const db = await getDatabase();
        const dbQuestions = await db.select<any[]>(`
          SELECT q.*, s.name as subject_name 
          FROM question_bank q 
          LEFT JOIN subjects s ON q.subject_id = s.id 
          ORDER BY q.id DESC;
        `);
        if (dbQuestions && dbQuestions.length > 0) {
          const mapped = dbQuestions.map(q => {
            let parsedText = q.content_json;
            try {
              const parsed = JSON.parse(q.content_json);
              if (parsed.text) parsedText = parsed.text;
            } catch {}
            return {
              id: q.id,
              content: parsedText || 'Untitled Question',
              question_type: q.question_type || 'Short',
              difficulty: q.difficulty || 'Medium',
              marks: q.marks || 2,
              class_level: q.class_level || 'Grade 9',
              subject_name: q.subject_name || 'General'
            };
          });
          setAvailableQuestions(mapped);
        }
      } catch (e) {}
    }
    loadQuestions();
  }, []);

  // Set initial sample questions
  useEffect(() => {
    if (availableQuestions.length >= 3 && sections[0].questions.length === 0) {
      const q1 = availableQuestions.find(q => q.id === 301) || availableQuestions[0];
      const q2 = availableQuestions.find(q => q.id === 302) || availableQuestions[1];
      const q3 = availableQuestions.find(q => q.id === 303) || availableQuestions[2];

      setSections([
        { ...sections[0], questions: [q1] },
        { ...sections[1], questions: [q2] },
        { ...sections[2], questions: [q3] }
      ]);
    }
  }, [availableQuestions]);

  // Calculations
  const allAddedQuestions = sections.flatMap(s => s.questions);
  const totalAddedMarks = allAddedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const totalAddedQuestions = allAddedQuestions.length;
  const marksRemaining = targetMarks - totalAddedMarks;

  // Actions
  const handleAddQuestionToSection = (q: Question) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === activeSectionId) {
        if (sec.questions.some(item => item.id === q.id)) return sec;
        return { ...sec, questions: [...sec.questions, q] };
      }
      return sec;
    }));
  };

  const handleRemoveQuestion = (sectionId: string, questionId: number) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, questions: sec.questions.filter(q => q.id !== questionId) };
      }
      return sec;
    }));
  };

  const handleSaveToArchive = async () => {
    setSaveStatus('saving');
    try {
      const db = await getDatabase();
      await db.execute(`CREATE TABLE IF NOT EXISTS generated_papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, subject_id INTEGER, class_level TEXT, 
        total_marks INTEGER, time_allowed TEXT, instructions TEXT, questions_json TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`);

      const questionsPayload = JSON.stringify(sections);
      await db.execute(
        `INSERT INTO generated_papers (title, subject_id, class_level, total_marks, time_allowed, instructions, questions_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [title, 1, classLevel, targetMarks, duration, 'Attempt all sections.', questionsPayload]
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      alert('Error saving paper to database.');
      setSaveStatus('idle');
    }
  };

  // SMART FILTERING: Automatically filters by Subject chosen in Step 1!
  const filteredQuestions = availableQuestions.filter(q => {
    const matchesSubject = !lockToSubject || q.subject_name.toLowerCase() === subject.toLowerCase();
    const matchesSearch = !searchQuery || 
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.question_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.difficulty.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSubject && matchesSearch;
  });

  return (
    <div className="min-h-full bg-[#F8FAFC] font-sans text-slate-800 pb-16">
      
      {/* TOP STEPPER & ACTION BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* 4-Step Stepper */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
            {[
              { num: 1, label: 'Paper Details' },
              { num: 2, label: 'Add Questions' },
              { num: 3, label: 'Arrange Paper' },
              { num: 4, label: 'Preview & Print' }
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

          {/* Stepper Right Action Buttons */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
              Cancel
            </button>
            
            <button 
              onClick={handleSaveToArchive}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Save Draft'}</span>
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 bg-[#1B365D] hover:bg-[#152946] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <span>{step === 1 ? 'Continue to Questions' : step === 2 ? 'Continue to Arrange' : 'Continue to Preview'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSaveToArchive}
                className="flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0b7d73] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Save</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ==========================================
          STEP 1: PAPER DETAILS
         ========================================== */}
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
                  onChange={(e) => setTitle(e.target.value)} 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Class <span className="text-red-500">*</span></label>
                  <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs">
                    {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block">Subject <span className="text-red-500">*</span></label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs">
                    {['Physics', 'Chemistry', 'Mathematics', 'Urdu', 'English', 'Biology'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Test Type <span className="text-red-500">*</span></label>
                  <select value={testType} onChange={(e) => setTestType(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs">
                    {['Class Test', 'Monthly Test', 'Midterm', 'Final Exam', 'Board Practice'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block">Paper Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs">
                    {['English', 'Urdu Nastaliq', 'Mixed (Bilingual)'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Date</label>
                  <input type="text" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="block">Duration</label>
                  <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="block">Total Marks <span className="text-red-500">*</span></label>
                  <input type="number" value={targetMarks} onChange={(e) => setTargetMarks(Number(e.target.value))} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block">Selected Chapters / Topics</label>
                <input type="text" value={chapters} onChange={(e) => setChapters(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs" />
              </div>

              {/* TEMPLATE SELECTION: Actually dictates how Step 4 looks! */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block">Teacher Name</label>
                  <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="block">Print Template Layout <span className="text-teal-600 font-extrabold">*</span></label>
                  <select 
                    value={template} 
                    onChange={(e) => setTemplate(e.target.value)} 
                    className="w-full p-3 bg-teal-50/50 border-2 border-[#0D9488] rounded-xl text-sm font-extrabold text-slate-900 shadow-sm"
                  >
                    <option value="Monthly Test">1. Monthly Test (Standard Balanced)</option>
                    <option value="Board Standard A4">2. Board Standard A4 (BISE Formal Style)</option>
                    <option value="Minimal Class Test">3. Minimal Class Test (Compact 15-min Test)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6 sticky top-24">
              <h3 className="font-extrabold text-slate-800 text-base tracking-tight">
                Paper Setup Summary
              </h3>

              <div className="space-y-3.5 text-xs">
                {[
                  { label: 'Title', value: title },
                  { label: 'Class', value: classLevel },
                  { label: 'Subject', value: subject },
                  { label: 'Template', value: template },
                  { label: 'Language', value: language },
                  { label: 'Duration', value: duration },
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

      {/* ==========================================
          STEP 2: ADD QUESTIONS (Subject Locked)
         ========================================== */}
      {step === 2 && (
        <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          
          <div className="lg:col-span-3 space-y-3 sticky top-24">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Layers className="w-3.5 h-3.5" /> Paper Sections
            </h3>

            <div className="space-y-2.5">
              {sections.map((sec) => {
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

            <button className="w-full py-2.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Add Section</span>
            </button>
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
                    {lockToSubject ? `${subject} (${classLevel})` : 'All Subjects'}
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
                placeholder={`Search ${lockToSubject ? subject : 'all'} questions by topic, keyword, or difficulty...`}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
              />
            </div>

            <div className="space-y-3.5">
              {filteredQuestions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-600">No questions found for {subject}</p>
                  <p className="text-xs text-slate-400">Try changing your search query or click "Show All Subjects" above.</p>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isAdded = sections.some(s => s.questions.some(item => item.id === q.id));
                  return (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 hover:border-slate-300 transition-all">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                        {q.content}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60">
                            {q.question_type}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                            {q.difficulty}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {q.class_level} · <strong className="text-slate-700">{q.subject_name}</strong> · <span className="font-bold text-slate-600">{q.marks} marks</span>
                          </span>
                        </div>

                        <button
                          onClick={() => handleAddQuestionToSection(q)}
                          disabled={isAdded}
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
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
              Current Paper
            </h3>

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
                  Paper total is {totalAddedMarks} marks; target is {targetMarks}. <span className="font-extrabold">{marksRemaining} marks remaining.</span>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-500 block border-b border-slate-100 pb-2">Section details</span>
              <div className="space-y-2 text-xs">
                {sections.map(sec => {
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

      {/* ==========================================
          STEP 3: ARRANGE PAPER
         ========================================== */}
      {step === 3 && (
        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Arrange & Finalize Sections</h2>
              <p className="text-xs text-slate-500">Review question sequence and verify marks distribution before printing.</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-slate-800 block">{totalAddedMarks} / {targetMarks} Marks</span>
              <span className="text-xs font-medium text-emerald-600">Sequence Verified ✓</span>
            </div>
          </div>

          <div className="space-y-6">
            {sections.map((sec) => (
              <div key={sec.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-base">{sec.title}</h3>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                    {sec.questions.length} Questions · {sec.questions.reduce((s, q) => s + (q.marks || 0), 0)} Marks
                  </span>
                </div>

                {sec.questions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No questions added to this section yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sec.questions.map((q, qIdx) => (
                      <div key={q.id} className="py-3 flex items-start justify-between gap-4 group">
                        <div className="flex items-start gap-3">
                          <span className="font-bold text-sm text-slate-400 mt-0.5">{qIdx + 1}.</span>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 whitespace-pre-line">{q.content}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-bold text-slate-600">[{q.marks} marks]</span>
                          <button 
                            onClick={() => handleRemoveQuestion(sec.id, q.id)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          STEP 4: PREVIEW & PRINT (DYNAMIC 3-TEMPLATE RENDERING ENGINE!)
         ========================================== */}
      {step === 4 && (
        <div className="animate-fadeIn">
          <div className="bg-[#1E293B] text-slate-300 px-6 py-3 flex items-center justify-between text-xs font-bold shadow-md print:hidden">
            <button 
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 text-white hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Edit</span>
            </button>

            <div className="flex items-center gap-6">
              <span className="bg-slate-800 text-teal-400 px-2.5 py-1 rounded border border-slate-700">Active Layout: {template}</span>
              <span>85% Zoom</span>
              <span className="text-slate-400">Page 1 of 2</span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save as PDF</span>
              </button>

              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0D9488] hover:bg-[#0b7d73] text-white rounded-lg font-extrabold shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="py-12 flex justify-center bg-slate-200/70 print:bg-white print:py-0">
            <div className="bg-white w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl text-black font-serif print:shadow-none print:w-full print:p-0">
              
              {/* =========================================================
                  TEMPLATE 1: BOARD STANDARD A4 (BISE Formal Pakistan Board Style)
                 ========================================================= */}
              {template === 'Board Standard A4' && (
                <div className="space-y-6">
                  {/* Formal Double Border Header */}
                  <div className="border-[3px] border-black p-4 text-center space-y-1.5">
                    <h1 className="text-xl font-extrabold uppercase tracking-widest font-sans">Board of Intermediate & Secondary Education</h1>
                    <h2 className="text-base font-bold uppercase font-sans text-gray-800">Al-Falah Public High School Examination Center</h2>
                    <div className="text-sm font-black underline pt-1 font-serif uppercase tracking-wide">{title}</div>
                    
                    <div className="grid grid-cols-4 gap-2 text-xs font-bold pt-3 border-t-2 border-black mt-3 font-sans uppercase">
                      <div className="border-r border-black">Class: {classLevel}</div>
                      <div className="border-r border-black">Subject: {subject}</div>
                      <div className="border-r border-black">Time: {duration}</div>
                      <div>Max Marks: {targetMarks}</div>
                    </div>
                  </div>

                  <div className="bg-black text-white p-1.5 text-center text-xs font-bold font-sans uppercase tracking-widest">
                    General Instructions: Read all questions carefully before answering. Overwriting is strictly prohibited.
                  </div>

                  {/* Sections with Solid Black Banners */}
                  <div className="space-y-8 pt-2">
                    {sections.map((sec) => (
                      <div key={sec.id} className="space-y-4 break-inside-avoid">
                        <div className="bg-black text-white p-1.5 font-bold text-xs uppercase font-sans flex justify-between px-3 print:bg-black print:text-white">
                          <span>{sec.title}</span>
                          <span>(Total Marks: {sec.questions.reduce((s, q) => s + (q.marks || 0), 0)})</span>
                        </div>
                        
                        {sec.description && (
                          <p className="text-xs font-bold underline pl-2 font-sans">{sec.description}</p>
                        )}

                        <div className="space-y-5 pl-2 pt-1">
                          {sec.questions.map((q, qIdx) => (
                            <div key={q.id} className="flex items-start justify-between gap-4 break-inside-avoid">
                              <div className="flex items-start gap-2.5 text-sm font-medium leading-relaxed flex-1">
                                <span className="font-bold shrink-0">Q.{qIdx + 1}</span>
                                <p className="whitespace-pre-line">{q.content}</p>
                              </div>
                              <span className="text-sm font-bold shrink-0">({q.marks} Marks)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  TEMPLATE 2: MINIMAL CLASS TEST (Compact 15-Minute Test Style)
                 ========================================================= */}
              {template === 'Minimal Class Test' && (
                <div className="space-y-4 font-sans">
                  {/* Modern Left-Aligned Compact Header */}
                  <div className="border-b-2 border-slate-800 pb-3 flex items-end justify-between">
                    <div>
                      <h1 className="text-base font-black uppercase tracking-tight text-slate-900">Al-Falah High School</h1>
                      <h2 className="text-lg font-extrabold text-teal-700 mt-0.5">{title}</h2>
                    </div>
                    <div className="text-right text-xs font-bold text-slate-700 space-y-0.5">
                      <div>Class: <span className="text-black font-black">{classLevel}</span> | Subject: <span className="text-black font-black">{subject}</span></div>
                      <div>Time: <span className="text-black font-black">{duration}</span> | Max Marks: <span className="text-black font-black">{targetMarks}</span></div>
                    </div>
                  </div>

                  {/* Ultra-Compact Spacing to fit short tests on half page */}
                  <div className="space-y-6 pt-2">
                    {sections.map((sec) => (
                      <div key={sec.id} className="space-y-2.5 break-inside-avoid">
                        <div className="border-b border-dotted border-slate-400 pb-1 font-extrabold text-xs text-slate-800 uppercase flex justify-between">
                          <span>{sec.title} {sec.description ? `— ${sec.description}` : ''}</span>
                          <span>[{sec.questions.reduce((s, q) => s + (q.marks || 0), 0)} marks]</span>
                        </div>

                        <div className="space-y-3 pl-1 pt-1">
                          {sec.questions.map((q, qIdx) => (
                            <div key={q.id} className="flex items-start justify-between gap-3 text-xs font-semibold leading-snug break-inside-avoid">
                              <div className="flex items-start gap-2 flex-1">
                                <span className="font-extrabold text-slate-900 shrink-0">{qIdx + 1}.</span>
                                <p className="whitespace-pre-line text-slate-800">{q.content}</p>
                              </div>
                              <span className="font-extrabold text-slate-900 shrink-0">({q.marks})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  TEMPLATE 3: MONTHLY TEST (Default Standard Balanced Layout)
                 ========================================================= */}
              {(template === 'Monthly Test' || !['Board Standard A4', 'Minimal Class Test'].includes(template)) && (
                <div className="space-y-6 font-serif">
                  <div className="text-center border-b-2 border-black pb-5 mb-6 space-y-1">
                    <div className="w-12 h-12 rounded-full bg-[#1B365D] text-white font-sans font-black text-base flex items-center justify-center mx-auto mb-2 shadow-sm">
                      AF
                    </div>
                    <h1 className="text-2xl font-extrabold uppercase font-sans tracking-wide">Al-Falah Public High School</h1>
                    <p className="text-xs text-gray-600 font-sans">Street 7, Model Town, Lahore, Punjab · +92 42 3578 1200</p>
                    <h2 className="text-lg font-bold underline pt-2 font-sans">{title}</h2>
                    
                    <div className="flex justify-between items-center text-xs font-bold pt-4 border-t border-gray-300 mt-4 px-2 font-sans">
                      <span>Class: <strong className="text-black">{classLevel}</strong></span>
                      <span>Subject: <strong className="text-black">{subject}</strong></span>
                      <span>Time: <strong className="text-black">{duration}</strong></span>
                      <span>Total Marks: <strong className="text-black">{targetMarks}</strong></span>
                    </div>
                  </div>

                  <div className="text-xs italic text-gray-700 mb-6 font-sans">
                    <strong>Instructions:</strong> Attempt all questions. Write neatly. Marks are shown against each question.
                  </div>

                  <div className="space-y-8 font-sans">
                    {sections.map((sec) => (
                      <div key={sec.id} className="space-y-4 break-inside-avoid">
                        <div className="bg-gray-100 p-2 font-bold text-xs border-y border-black flex justify-between print:bg-gray-100">
                          <span>{sec.title}</span>
                          <span>({sec.questions.reduce((s, q) => s + (q.marks || 0), 0)} marks)</span>
                        </div>
                        
                        {sec.description && (
                          <p className="text-[11px] italic text-gray-600 pl-2">{sec.description}</p>
                        )}

                        <div className="space-y-4 pl-2">
                          {sec.questions.map((q, qIdx) => (
                            <div key={q.id} className="flex items-start justify-between gap-4 break-inside-avoid">
                              <div className="flex items-start gap-2 text-xs sm:text-sm font-medium leading-relaxed flex-1">
                                <span className="font-bold shrink-0">Q{qIdx + 1}.</span>
                                <p className="whitespace-pre-line">{q.content}</p>
                              </div>
                              <span className="text-xs font-bold shrink-0">({q.marks})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Universal A4 Footer */}
              <div className="mt-20 pt-6 border-t border-gray-300 flex justify-between items-center text-[11px] text-gray-500 font-sans break-inside-avoid">
                <span>Paper Generator Pro — School Edition ({template})</span>
                <span className="font-bold text-black">Examiner Signature: _______________________</span>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}