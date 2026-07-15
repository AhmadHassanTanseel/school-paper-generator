import { useState, useEffect } from 'react';
import { 
  Search, Bell, CheckCircle2, Filter, X, Edit, Copy, 
  Archive, Plus,
} from 'lucide-react';
import { getDatabase } from '../../database/db';

interface Question {
  id: number;
  content: string;
  question_type: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  class_level: string;
  subject_name: string;
  chapter_name: string;
  language: 'English' | 'Urdu' | 'Arabic' | 'Bilingual';
  created_by: string;
  created_ago: string;
  tags?: string[];
}

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
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number>(401);

  // Filter Dropdown States (Defaulted to 'All' matching Figma)
  const [filters, setFilters] = useState<FilterState>({
    classLevel: 'All',
    subject: 'All',
    chapter: 'All',
    questionType: 'All',
    difficulty: 'All',
    language: 'All',
    createdBy: 'All'
  });

  // High-Fidelity Figma Fallback Questions (Exact match to your screenshot!)
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 401,
      content: 'Define velocity and write its SI unit. State whether it is a scalar or vector quantity.',
      question_type: 'Short Question',
      difficulty: 'Easy',
      marks: 3,
      class_level: 'Grade 9',
      subject_name: 'Physics',
      chapter_name: 'Kinematics',
      language: 'English',
      created_by: 'Mr. Ahmad Raza',
      created_ago: '2 days ago',
      tags: ['motion', 'definitions']
    },
    {
      id: 402,
      content: 'A car accelerates uniformly from 10 m/s to 30 m/s in 5 seconds. Calculate its acceleration and the distance covered.',
      question_type: 'Numerical',
      difficulty: 'Medium',
      marks: 5,
      class_level: 'Grade 9',
      subject_name: 'Physics',
      chapter_name: 'Kinematics',
      language: 'English',
      created_by: 'Mr. Ahmad Raza',
      created_ago: '3 days ago',
      tags: ['acceleration', 'kinematics']
    },
    {
      id: 403,
      content: 'Which of the following is a vector quantity?\n(a) Speed    (b) Distance\n(c) Displacement    (d) Time',
      question_type: 'MCQ',
      difficulty: 'Easy',
      marks: 1,
      class_level: 'Grade 9',
      subject_name: 'Physics',
      chapter_name: 'Kinematics',
      language: 'English',
      created_by: 'Mr. Ahmad Raza',
      created_ago: '1 week ago',
      tags: ['vectors', 'mcq']
    },
    {
      id: 404,
      content: 'Balance the following chemical equation: H₂ + O₂ → H₂O',
      question_type: 'Numerical',
      difficulty: 'Medium',
      marks: 2,
      class_level: 'Grade 10',
      subject_name: 'Chemistry',
      chapter_name: 'Chemical Reactions',
      language: 'English',
      created_by: 'Maam Ayesha',
      created_ago: '1 day ago',
      tags: ['balancing', 'equations']
    },
    {
      id: 405,
      content: 'درج ذیل نظم کی تشریح کریں اور شاعر کا نام بھی لکھیں۔ خیال رہے کہ اشعار کا مرکزی خیال واضح ہو۔',
      question_type: 'Long Question',
      difficulty: 'Medium',
      marks: 4,
      class_level: 'Grade 6',
      subject_name: 'Urdu',
      chapter_name: '8 - دعا',
      language: 'Urdu',
      created_by: 'Hafiz Ahmad',
      created_ago: '4 days ago',
      tags: ['نظم', 'تشریح']
    },
    {
      id: 406,
      content: 'اكتب خمس جمل عن المدرسة باللغة العربية مع مراعاة القواعد النحوية.',
      question_type: 'Essay',
      difficulty: 'Medium',
      marks: 5,
      class_level: 'Grade 8',
      subject_name: 'Arabic',
      chapter_name: '6 - المدرسة',
      language: 'Arabic',
      created_by: 'Zain Mustafa',
      created_ago: '5 days ago',
      tags: ['المدرسة', 'تعبير']
    }
  ]);

  // Load Real Database Questions if available
  useEffect(() => {
    async function fetchDatabaseQuestions() {
      try {
        const db = await getDatabase();
        await db.execute(`CREATE TABLE IF NOT EXISTS question_bank (
          id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, class_level TEXT, chapter_name TEXT,
          question_type TEXT, difficulty TEXT, marks INTEGER, language TEXT, content_json TEXT,
          created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`);

        const res = await db.select<any[]>(`
          SELECT q.*, s.name as subject_name 
          FROM question_bank q 
          LEFT JOIN subjects s ON q.subject_id = s.id 
          ORDER BY q.id DESC;
        `);

        if (res && res.length > 0) {
          const mapped: Question[] = res.map(q => {
            let parsedText = q.content_json;
            let tagsList: string[] = ['general'];
            try {
              const parsed = JSON.parse(q.content_json);
              if (parsed.text) parsedText = parsed.text;
              if (parsed.tags) tagsList = parsed.tags;
            } catch {}

            return {
              id: q.id,
              content: parsedText || 'Untitled Question',
              question_type: q.question_type || 'Short Question',
              difficulty: (q.difficulty as any) || 'Medium',
              marks: q.marks || 2,
              class_level: q.class_level || 'Grade 9',
              subject_name: q.subject_name || 'General',
              chapter_name: q.chapter_name || 'General Topic',
              language: (q.language as any) || 'English',
              created_by: q.created_by || 'Mr. Ahmad Raza',
              created_ago: 'Today',
              tags: tagsList
            };
          });
          setQuestions(mapped);
          if (mapped.length > 0) setSelectedId(mapped[0].id);
        }
      } catch (err) {
        console.error('Question bank load error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabaseQuestions();
  }, []);

  // Multi-Dropdown + Search Filter Engine
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

  const selectedQuestion = questions.find(q => q.id === selectedId) || questions[0];

  const handleClearFilters = () => {
    setFilters({
      classLevel: 'All', subject: 'All', chapter: 'All',
      questionType: 'All', difficulty: 'All', language: 'All', createdBy: 'All'
    });
    setSearchQuery('');
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-8 space-y-8 font-sans text-slate-800 animate-fadeIn">
      
      {/* 1. FIGMA EXACT TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <span className="text-xl font-extrabold text-slate-800 tracking-tight shrink-0">Question Bank</span>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search papers, questions, teachers..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>All changes saved</span>
          </div>

          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer">
            <Bell className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded-full bg-[#0D9488] text-white font-bold text-xs flex items-center justify-center shadow-sm cursor-pointer">
            AR
          </div>
        </div>
      </div>

      {/* 2. FIGMA EXACT 3-COLUMN WORKSPACE GRID (3 Cols : 5 Cols : 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==========================================
            LEFT COLUMN (3 COLS): FILTER DROPDOWNS
           ========================================== */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 sticky top-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Filters</h3>
          </div>

          <div className="space-y-3.5 text-xs font-bold text-slate-700">
            {/* Class Level */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Class</label>
              <select 
                value={filters.classLevel} 
                onChange={(e) => handleFilterChange('classLevel', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Subject</label>
              <select 
                value={filters.subject} 
                onChange={(e) => handleFilterChange('subject', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                {['Physics', 'Chemistry', 'Mathematics', 'Urdu', 'English', 'Arabic', 'Biology'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Chapter */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Chapter</label>
              <select 
                value={filters.chapter} 
                onChange={(e) => handleFilterChange('chapter', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                {['Kinematics', 'Chemical Reactions', '8 - دعا', '6 - المدرسة', 'Dynamics', 'Algebra'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Question Type */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Question Type</label>
              <select 
                value={filters.questionType} 
                onChange={(e) => handleFilterChange('questionType', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                {['MCQ', 'Short Question', 'Long Question', 'Numerical', 'Essay', 'True/False'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Difficulty</label>
              <select 
                value={filters.difficulty} 
                onChange={(e) => handleFilterChange('difficulty', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Language */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Language</label>
              <select 
                value={filters.language} 
                onChange={(e) => handleFilterChange('language', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="English">English</option>
                <option value="Urdu">Urdu</option>
                <option value="Arabic">Arabic</option>
              </select>
            </div>

            {/* Created by */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Created by</label>
              <select 
                value={filters.createdBy} 
                onChange={(e) => handleFilterChange('createdBy', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                {['Mr. Ahmad Raza', 'Maam Ayesha', 'Hafiz Ahmad', 'Zain Mustafa'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="pt-2">
              <button 
                onClick={handleClearFilters}
                className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            MIDDLE COLUMN (5 COLS): SCROLLABLE QUESTION LIST
           ========================================== */}
        <div className="lg:col-span-5 space-y-3.5 max-h-[82vh] overflow-y-auto pr-1">
          
          <div className="flex items-center justify-between pb-1 px-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Showing {filteredQuestions.length} Questions
            </span>
            <button className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">No matching questions found</p>
              <p className="text-xs text-slate-400">Try clearing your filters or searching for another keyword.</p>
              <button onClick={handleClearFilters} className="mt-2 text-xs font-bold text-teal-600 underline">Reset all filters</button>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isSelected = selectedId === q.id;
              const isRtl = q.language === 'Urdu' || q.language === 'Arabic';
              
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedId(q.id)}
                  className={`p-5 rounded-2xl transition-all cursor-pointer shadow-2xs space-y-3 ${
                    isSelected 
                      ? 'border-2 border-[#0D9488] bg-[#0D9488]/5' 
                      : 'border border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Question Text (With automatic right-align for Urdu/Arabic!) */}
                  <p className={`text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line line-clamp-3 ${
                    isRtl ? 'text-right font-serif text-base' : 'text-left'
                  }`} dir={isRtl ? 'rtl' : 'ltr'}>
                    {q.content}
                  </p>

                  {/* Badges & Footer Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
                    <div className="flex items-center gap-2">
                      {/* Question Type Blue Pill */}
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1]">
                        {q.question_type}
                      </span>

                      {/* Difficulty Color Pill */}
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        q.difficulty === 'Easy' ? 'bg-[#DCFCE7] text-[#15803D]' :
                        q.difficulty === 'Medium' ? 'bg-[#FEF9C3] text-[#A16207]' :
                        'bg-[#FEE2E2] text-[#B91C1C]'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Metadata Footer Text */}
                    <div className="text-[11px] font-semibold text-slate-400 truncate max-w-[220px]">
                      {q.class_level} · {q.subject_name} · {q.chapter_name} · <strong className="text-slate-600 font-bold">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</strong> · {q.created_ago}
                    </div>
                  </div>
                </div>
              );
            })
          )}

        </div>

        {/* ==========================================
            RIGHT COLUMN (4 COLS): STICKY QUESTION PREVIEW
           ========================================== */}
        <div className="lg:col-span-4 space-y-6 sticky top-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
            
            {/* Header with Type Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-800 text-base tracking-tight">
                Question Preview
              </h3>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                {selectedQuestion.question_type}
              </span>
            </div>

            {/* Grey Preview Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-2xs min-h-[120px] flex items-center">
              <p className={`w-full text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-line ${
                selectedQuestion.language === 'Urdu' || selectedQuestion.language === 'Arabic' ? 'text-right font-serif text-lg' : 'text-left'
              }`} dir={selectedQuestion.language === 'Urdu' || selectedQuestion.language === 'Arabic' ? 'rtl' : 'ltr'}>
                {selectedQuestion.content}
              </p>
            </div>

            {/* 2x3 Metadata Grid matching Figma Screenshot */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block">Class</span>
                <span className="font-extrabold text-slate-800 block">{selectedQuestion.class_level}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block">Subject</span>
                <span className="font-extrabold text-slate-800 block">{selectedQuestion.subject_name}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block">Chapter</span>
                <span className="font-extrabold text-slate-800 block truncate" title={selectedQuestion.chapter_name}>{selectedQuestion.chapter_name}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block">Marks</span>
                <span className="font-extrabold text-slate-800 block">{selectedQuestion.marks}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block">Difficulty</span>
                <span className="font-extrabold text-slate-800 block">{selectedQuestion.difficulty}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block">Language</span>
                <span className="font-extrabold text-slate-800 block">{selectedQuestion.language}</span>
              </div>
            </div>

            {/* Tags Section */}
            {selectedQuestion.tags && selectedQuestion.tags.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-slate-400 font-medium text-xs block">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedQuestion.tags.map((tag, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-200/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created by Footer Text */}
            <div className="text-[11px] font-semibold text-slate-400 pt-1 border-t border-slate-100">
              Created by {selectedQuestion.created_by} · {selectedQuestion.created_ago}
            </div>

            {/* 2x2 Action Buttons Grid (Exact match to Figma bottom right) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs">
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit</span>
              </button>

              <button className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Duplicate</span>
              </button>

              <button className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs">
                <Archive className="w-3.5 h-3.5 text-slate-500" />
                <span>Archive</span>
              </button>

              <button className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#1B365D] hover:bg-[#152946] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Add to Paper</span>
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}