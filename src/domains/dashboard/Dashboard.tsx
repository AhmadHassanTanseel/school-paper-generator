import { useState, useEffect } from 'react';
import { 
  Search, Bell, CheckCircle2, Plus, FileText, Database, 
  History, Printer, BookOpen, Users, ArrowRight, Clock, 
  ClipboardList
} from 'lucide-react';
import { getDatabase } from '../../database/db';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

interface StatCounts {
  questions: number;
  papersThisMonth: number;
  subjects: number;
  teachers: number;
}

interface RecentPaper {
  id: number;
  title: string;
  class_level: string;
  subject_name: string;
  total_marks: number;
  test_type: string;
  status: 'Printed' | 'Final' | 'Draft';
}

interface RecentQuestion {
  id: number;
  content: string;
  subject_name: string;
  marks: number;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [schoolName, setSchoolName] = useState('Al-Falah Public High School');
  const [session, setSession] = useState('2025–2026');
  const [daysSinceBackup, setDaysSinceBackup] = useState(7);

  // Exact Figma Numbers
  const [stats, setStats] = useState<StatCounts>({
    questions: 252,
    papersThisMonth: 12,
    subjects: 11,
    teachers: 6
  });

  // Exact Figma Recent Papers
  const [recentPapers, ] = useState<RecentPaper[]>([
    { id: 101, title: 'Grade 9 Physics Monthly Test', class_level: 'Grade 9', subject_name: 'Physics', total_marks: 25, test_type: 'Monthly Test', status: 'Printed' },
    { id: 102, title: 'Grade 6 Urdu Class Test', class_level: 'Grade 6', subject_name: 'Urdu', total_marks: 15, test_type: 'Class Test', status: 'Final' },
    { id: 103, title: 'Grade 10 Mathematics Practice Paper', class_level: 'Grade 10', subject_name: 'Mathematics', total_marks: 50, test_type: 'Board Practice', status: 'Draft' },
    { id: 104, title: 'Grade 10 Chemistry Midterm', class_level: 'Grade 10', subject_name: 'Chemistry', total_marks: 40, test_type: 'Midterm', status: 'Printed' }
  ]);

  // Exact Figma Question Bank Snippets
  const [recentQuestions] = useState<RecentQuestion[]>([
    { id: 201, content: 'Define velocity and write its SI unit. State whether it is a scalar or vector quantity.', subject_name: 'Physics', marks: 3 },
    { id: 202, content: 'A car accelerates uniformly from 10 m/s to 30 m/s in 5 seconds. Calculate its...', subject_name: 'Physics', marks: 5 },
    { id: 203, content: 'Which of the following is a vector quantity?', subject_name: 'Physics', marks: 1 }
  ]);

  useEffect(() => {
    async function loadLiveDashboardData() {
      try {
        const db = await getDatabase();
        const cfg = await db.select<any[]>('SELECT * FROM school_config WHERE id = 1;');
        if (cfg && cfg.length > 0) {
          if (cfg[0].name) setSchoolName(cfg[0].name);
          if (cfg[0].default_session) setSession(cfg[0].default_session);
          if (cfg[0].last_backup_date) {
            const diff = Math.floor((new Date().getTime() - new Date(cfg[0].last_backup_date).getTime()) / (1000 * 3600 * 24));
            setDaysSinceBackup(isNaN(diff) ? 7 : diff);
          }
        }

        try {
          const qCount = await db.select<any[]>('SELECT COUNT(*) as count FROM question_bank;');
          const pCount = await db.select<any[]>('SELECT COUNT(*) as count FROM generated_papers;');
          const sCount = await db.select<any[]>('SELECT COUNT(*) as count FROM subjects;');
          const tCount = await db.select<any[]>('SELECT COUNT(*) as count FROM teachers;');

          if (qCount?.[0]?.count > 0) setStats(prev => ({ ...prev, questions: qCount[0].count }));
          if (pCount?.[0]?.count > 0) setStats(prev => ({ ...prev, papersThisMonth: pCount[0].count }));
          if (sCount?.[0]?.count > 0) setStats(prev => ({ ...prev, subjects: sCount[0].count }));
          if (tCount?.[0]?.count > 0) setStats(prev => ({ ...prev, teachers: tCount[0].count }));
        } catch (e) {}
      } catch (err) {
        console.error('Dashboard DB load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLiveDashboardData();
  }, []);

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-8 space-y-8 font-sans text-slate-800 animate-fadeIn">
      
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <span className="text-xl font-extrabold text-slate-800 tracking-tight shrink-0">Dashboard</span>
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

      {/* 2. GREETING */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <span>Good Morning, Ahmad</span>
          <span>👋</span>
        </h1>
        <p className="text-xs font-medium text-slate-500">
          {schoolName} · Academic Session {session}
        </p>
      </div>

      {/* 3. HERO & QUICK ACTIONS GRID (UPPER FOLD - SCREENSHOT 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Hero Card (#1B365D Deep Navy) */}
        <div className="lg:col-span-7 bg-[#1B365D] text-white rounded-2xl p-7 md:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-2.5 relative z-10 max-w-md">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Create a new test paper
            </h2>
            <p className="text-xs text-slate-200/90 leading-relaxed font-normal">
              Build a clean, professional A4 paper in 5–10 minutes. Pick a class, add questions, and print or save as PDF.
            </p>
          </div>

          <div className="pt-6 relative z-10">
            <button
              onClick={() => onNavigate && onNavigate('builder')}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Create New Paper</span>
            </button>
          </div>
        </div>

        {/* Right Quick Actions Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3 flex-1">
            <button
              onClick={() => onNavigate && onNavigate('questions')}
              className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start justify-center gap-2.5 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Add Question</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('questions')}
              className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start justify-center gap-2.5 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Open Question Bank</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('history')}
              className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start justify-center gap-2.5 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <History className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">View Old Papers</span>
            </button>

            <button
              onClick={() => {
                onNavigate && onNavigate('history');
                setTimeout(() => window.print(), 500);
              }}
              className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start justify-center gap-2.5 transition-all text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Printer className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Print Recent Paper</span>
            </button>
          </div>
        </div>

      </div>

      {/* 4. STAT CARDS (CENTER ALIGNED EXACTLY AS SCREENSHOT 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Total Questions */}
        <div 
          onClick={() => onNavigate && onNavigate('questions')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center flex flex-col items-center justify-center"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{stats.questions}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Total Questions</div>
        </div>

        {/* Card 2: Papers This Month */}
        <div 
          onClick={() => onNavigate && onNavigate('history')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center flex flex-col items-center justify-center"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{stats.papersThisMonth}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Papers This Month</div>
        </div>

        {/* Card 3: Subjects */}
        <div 
          onClick={() => onNavigate && onNavigate('subjects')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center flex flex-col items-center justify-center"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{stats.subjects}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Subjects</div>
        </div>

        {/* Card 4: Teachers */}
        <div 
          onClick={() => onNavigate && onNavigate('teachers')}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center flex flex-col items-center justify-center"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{stats.teachers}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Teachers</div>
        </div>

      </div>

      {/* 5. BOTTOM SECTION: RECENT PAPERS + QUESTION BANK FEED (LOWER FOLD - SCREENSHOT 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Recent Papers */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Recent Papers</h3>
            <button 
              onClick={() => onNavigate && onNavigate('history')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer group"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentPapers.map((paper) => (
              <div 
                key={paper.id}
                onClick={() => onNavigate && onNavigate('history')}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 -mx-2 px-3 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">
                      {paper.title}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {paper.class_level} · {paper.subject_name} · <span className="text-slate-600">{paper.total_marks} marks</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                    {paper.test_type}
                  </span>
                  
                  {/* Figma exact status colors */}
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                    paper.status === 'Printed' ? 'bg-[#DCFCE7] text-[#166534]' :
                    paper.status === 'Final' ? 'bg-[#E0F2FE] text-[#075985]' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {paper.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): New in Question Bank + Backup Reminder Card */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* New in Question Bank Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">New in Question Bank</h3>

            <div className="space-y-4">
              {recentQuestions.map((q) => (
                <div 
                  key={q.id}
                  onClick={() => onNavigate && onNavigate('questions')}
                  className="space-y-1 pb-3.5 border-b border-slate-100 last:border-0 last:pb-0 cursor-pointer group"
                >
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-teal-600 transition-colors">
                    {q.content}
                  </p>
                  <div className="text-[11px] font-medium text-slate-400">
                    {q.subject_name} · <span className="text-slate-500">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FIGMA EXACT BACKUP REMINDER CARD (#FFFBEB) */}
          <div className="bg-[#FFFBEB] border border-[#FEF08A] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#FEF08A] text-amber-800 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-amber-900 tracking-tight">Backup reminder</h4>
                <p className="text-xs font-medium text-amber-900/80 leading-relaxed">
                  Your last backup was {daysSinceBackup} {daysSinceBackup === 1 ? 'day' : 'days'} ago. Keep your papers safe.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('backup')}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-amber-50 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl border border-amber-300 shadow-2xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Create Backup</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}