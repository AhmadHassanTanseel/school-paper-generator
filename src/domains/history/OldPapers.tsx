import { useState, useEffect } from 'react';
import { 
  Search, Bell, CheckCircle2, Filter, X, Printer, 
  Copy, Edit, FileText, Trash2
} from 'lucide-react';
import { getDatabase } from '../../database/db';

interface OldPaper {
  id: number;
  title: string;
  class_level: string;
  subject_name: string;
  test_type: string;
  marks: number;
  teacher_name: string;
  status: 'Printed' | 'Final' | 'Draft';
  modified_date: string;
  created_date: string;
}

interface FilterState {
  classLevel: string;
  subject: string;
  teacher: string;
  testType: string;
  session: string;
  status: string;
}

interface OldPapersProps {
  onNavigate?: (tab: string) => void;
}

export default function OldPapers({ onNavigate }: OldPapersProps) {
  const [ ,setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');

  // Filter Dropdown States (Defaulted to 'All' matching Figma screenshot)
  const [filters, setFilters] = useState<FilterState>({
    classLevel: 'All',
    subject: 'All',
    teacher: 'All',
    testType: 'All',
    session: 'All',
    status: 'All'
  });

  // High-Fidelity Figma Fallback Papers (Exact match to your screenshot!)
  const [papers, setPapers] = useState<OldPaper[]>([
    {
      id: 501,
      title: 'Grade 9 Physics Monthly Test',
      class_level: 'Grade 9',
      subject_name: 'Physics',
      test_type: 'Monthly Test',
      marks: 25,
      teacher_name: 'Mr. Ahmad Raza',
      status: 'Printed',
      modified_date: '12 Jul 2026',
      created_date: '12 Jul 2026'
    },
    {
      id: 502,
      title: 'Grade 6 Urdu Class Test',
      class_level: 'Grade 6',
      subject_name: 'Urdu',
      test_type: 'Class Test',
      marks: 15,
      teacher_name: 'Mrs. Fauzia Khan',
      status: 'Final',
      modified_date: '10 Jul 2026',
      created_date: '10 Jul 2026'
    },
    {
      id: 503,
      title: 'Grade 10 Mathematics Practice Paper',
      class_level: 'Grade 10',
      subject_name: 'Mathematics',
      test_type: 'Board Practice',
      marks: 50,
      teacher_name: 'Mr. Kamran Ali',
      status: 'Draft',
      modified_date: '09 Jul 2026',
      created_date: '08 Jul 2026'
    },
    {
      id: 504,
      title: 'Grade 10 Chemistry Midterm',
      class_level: 'Grade 10',
      subject_name: 'Chemistry',
      test_type: 'Midterm',
      marks: 40,
      teacher_name: 'Ms. Sana Tariq',
      status: 'Printed',
      modified_date: '05 Jul 2026',
      created_date: '05 Jul 2026'
    },
    {
      id: 505,
      title: 'Grade 8 English Weekly Test',
      class_level: 'Grade 8',
      subject_name: 'English',
      test_type: 'Weekly Test',
      marks: 20,
      teacher_name: 'Mrs. Fauzia Khan',
      status: 'Final',
      modified_date: '02 Jul 2026',
      created_date: '01 Jul 2026'
    }
  ]);

  // Load Real Database Papers if available
  useEffect(() => {
    async function fetchDatabasePapers() {
      try {
        const db = await getDatabase();
        await db.execute(`CREATE TABLE IF NOT EXISTS generated_papers (
          id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, subject_id INTEGER, class_level TEXT, 
          total_marks INTEGER, time_allowed TEXT, instructions TEXT, questions_json TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`);

        const res = await db.select<any[]>(`
          SELECT p.*, s.name as subject_name 
          FROM generated_papers p 
          LEFT JOIN subjects s ON p.subject_id = s.id 
          ORDER BY p.id DESC;
        `);

        if (res && res.length > 0) {
          const mapped: OldPaper[] = res.map(p => {
            const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';
            return {
              id: p.id,
              title: p.title || 'Untitled Examination Paper',
              class_level: p.class_level || 'Grade 9',
              subject_name: p.subject_name || 'General',
              test_type: 'Class Test',
              marks: p.total_marks || 25,
              teacher_name: 'Mr. Ahmad Raza',
              status: 'Printed',
              modified_date: dateStr,
              created_date: dateStr
            };
          });
          setPapers(mapped);
        }
      } catch (err) {
        console.error('Old papers library load error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabasePapers();
  }, []);

  // Multi-Dropdown + Search Filter Engine
  const filteredPapers = papers.filter(p => {
    const matchClass = filters.classLevel === 'All' || p.class_level === filters.classLevel;
    const matchSub = filters.subject === 'All' || p.subject_name === filters.subject;
    const matchTeacher = filters.teacher === 'All' || p.teacher_name === filters.teacher;
    const matchType = filters.testType === 'All' || p.test_type === filters.testType;
    const matchStatus = filters.status === 'All' || p.status === filters.status;
    
    const query = (librarySearch || globalSearch).toLowerCase();
    const matchSearch = !query || 
      p.title.toLowerCase().includes(query) ||
      p.subject_name.toLowerCase().includes(query) ||
      p.teacher_name.toLowerCase().includes(query) ||
      p.test_type.toLowerCase().includes(query);

    return matchClass && matchSub && matchTeacher && matchType && matchStatus && matchSearch;
  });

  const handleClearFilters = () => {
    setFilters({
      classLevel: 'All', subject: 'All', teacher: 'All',
      testType: 'All', session: 'All', status: 'All'
    });
    setLibrarySearch('');
    setGlobalSearch('');
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePrintAgain = (title: string) => {
    alert(`Preparing A4 Print Preview for: "${title}"...`);
    setTimeout(() => window.print(), 500);
  };

  const handleDeletePaper = async (id: number) => {
    if (!window.confirm('Are you sure you want to archive/delete this paper record?')) return;
    try {
      const db = await getDatabase();
      await db.execute('DELETE FROM generated_papers WHERE id = $1;', [id]);
      setPapers(prev => prev.filter(p => p.id !== id));
    } catch {
      // Fallback local UI deletion if db fails
      setPapers(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-8 space-y-8 font-sans text-slate-800 animate-fadeIn">
      
      {/* 1. FIGMA EXACT TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <span className="text-xl font-extrabold text-slate-800 tracking-tight shrink-0">Old Papers</span>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
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

      {/* 2. FIGMA EXACT 2-COLUMN WORKSPACE GRID (3 Cols : 9 Cols) */}
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
            {/* Class */}
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
                {['Physics', 'Chemistry', 'Mathematics', 'Urdu', 'English', 'Biology'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Teacher */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Teacher</label>
              <select 
                value={filters.teacher} 
                onChange={(e) => handleFilterChange('teacher', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                {['Mr. Ahmad Raza', 'Mrs. Fauzia Khan', 'Mr. Kamran Ali', 'Ms. Sana Tariq'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Test Type */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Test Type</label>
              <select 
                value={filters.testType} 
                onChange={(e) => handleFilterChange('testType', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                {['Class Test', 'Weekly Test', 'Monthly Test', 'Midterm', 'Final Exam', 'Board Practice'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Session */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Session</label>
              <select 
                value={filters.session} 
                onChange={(e) => handleFilterChange('session', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="2025–2026">2025–2026</option>
                <option value="2024–2025">2024–2025</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)} 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Printed">Printed</option>
                <option value="Final">Final</option>
                <option value="Draft">Draft</option>
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
            RIGHT COLUMN (9 COLS): OLD PAPERS LIBRARY TABLE
           ========================================== */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
          
          {/* Header & New Paper Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">Old Papers Library</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">Reuse and reprint your past papers</p>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('builder')}
              className="inline-flex items-center justify-center gap-2 bg-[#1B365D] hover:bg-[#152946] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <FileText className="w-4 h-4 text-white shrink-0" />
              <span>New Paper</span>
            </button>
          </div>

          {/* Search Papers Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search papers..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
            />
          </div>

          {/* Responsive Data Table matching Figma Screenshot exactly */}
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs font-extrabold uppercase tracking-wider">
                  <th className="pb-3 pr-4 font-extrabold">Paper</th>
                  <th className="pb-3 px-3 font-extrabold">Type</th>
                  <th className="pb-3 px-3 font-extrabold">Marks</th>
                  <th className="pb-3 px-3 font-extrabold">Teacher</th>
                  <th className="pb-3 px-3 font-extrabold">Status</th>
                  <th className="pb-3 px-3 font-extrabold">Modified</th>
                  <th className="pb-3 pl-4 text-right font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredPapers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No past papers found matching your filters or search query.
                    </td>
                  </tr>
                ) : (
                  filteredPapers.map((paper) => (
                    <tr key={paper.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Column 1: Paper Title & Subtitle */}
                      <td className="py-4 pr-4 max-w-[240px]">
                        <div className="font-extrabold text-slate-800 text-sm group-hover:text-teal-600 transition-colors truncate" title={paper.title}>
                          {paper.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {paper.class_level} · {paper.subject_name} · {paper.created_date}
                        </div>
                      </td>

                      {/* Column 2: Type Badge */}
                      <td className="py-4 px-3">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 whitespace-nowrap">
                          {paper.test_type}
                        </span>
                      </td>

                      {/* Column 3: Marks */}
                      <td className="py-4 px-3 font-extrabold text-slate-800 text-sm">
                        {paper.marks}
                      </td>

                      {/* Column 4: Teacher */}
                      <td className="py-4 px-3 text-slate-600 font-bold whitespace-nowrap">
                        {paper.teacher_name}
                      </td>

                      {/* Column 5: Status Badge (Exact Figma colors) */}
                      <td className="py-4 px-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap ${
                          paper.status === 'Printed' ? 'bg-[#DCFCE7] text-[#166534]' :
                          paper.status === 'Final' ? 'bg-[#E0F2FE] text-[#075985]' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {paper.status}
                        </span>
                      </td>

                      {/* Column 6: Modified Date */}
                      <td className="py-4 px-3 text-slate-500 font-medium whitespace-nowrap">
                        {paper.modified_date}
                      </td>

                      {/* Column 7: Actions Grid */}
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 text-slate-400">
                          
                          {/* Print Icon */}
                          <button
                            onClick={() => handlePrintAgain(paper.title)}
                            title="Print Again"
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Duplicate/Copy Icon */}
                          <button
                            onClick={() => alert(`Duplicating "${paper.title}" to Drafts...`)}
                            title="Duplicate Paper"
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Edit Icon */}
                          <button
                            onClick={() => onNavigate && onNavigate('builder')}
                            title="Edit Paper"
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete/Archive Icon */}
                          <button
                            onClick={() => handleDeletePaper(paper.id)}
                            title="Archive Paper"
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}