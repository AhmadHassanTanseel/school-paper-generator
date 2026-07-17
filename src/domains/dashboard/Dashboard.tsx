import { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, CheckCircle2, Plus, FileText, Database, 
  History, Printer, BookOpen, Users, ArrowRight, Clock, 
  ClipboardList, ShieldCheck, Settings, AlertCircle, 
  X, Download, Sparkles, Loader2, User
} from 'lucide-react';
import { getDatabase } from '../../database/db';
import { downloadBackup } from '../../services/backupService';
import { getPapersThisMonth } from '../../services/paperService';
import { useApp } from '../../context/AppContext';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { showToast } = useApp();
  const [, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'saved'>('syncing');
  
  // Real-Time Database Meta
  const [schoolName, setSchoolName] = useState('Al-Falah Public High School');
  const [session, setSession] = useState('2025–2026');
  const [daysSinceBackup, setDaysSinceBackup] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Popover Toggles
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Stats & Recent Feed Data
  const [stats, setStats] = useState({ questions: 0, papersThisMonth: 0, subjects: 0, teachers: 0 });
  const [recentPapers, setRecentPapers] = useState<any[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);

  // ==========================================
  // BULLETPROOF GLOBAL SEARCH ENGINE
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState({
    papers: [] as any[],
    questions: [] as any[],
    teachers: [] as any[]
  });
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live Search Effect (Triggers when user types >= 2 characters)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setShowSearchDropdown(false);
      setSearchResults({ papers: [], questions: [], teachers: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchDropdown(true);
      setSyncStatus('syncing'); 

      try {
        const db = await getDatabase();
        const q = `%${searchQuery.trim()}%`;
        
        let pRes: any[] = [];
        let qRes: any[] = [];
        let tRes: any[] = [];

        try { pRes = await db.select<any[]>('SELECT id, title, class_level FROM generated_papers WHERE title LIKE $1 OR class_level LIKE $1 LIMIT 3;', [q]); } catch(e){}
        try { qRes = await db.select<any[]>('SELECT id, content_json, subject_id FROM question_bank WHERE content_json LIKE $1 LIMIT 3;', [q]); } catch(e){}
        try { tRes = await db.select<any[]>('SELECT id, name, subjects FROM teachers WHERE name LIKE $1 OR subjects LIKE $1 LIMIT 3;', [q]); } catch(e){}

        setSearchResults({
          papers: pRes || [],
          questions: (qRes || []).map(item => {
            let text = item.content_json || 'Untitled Question';
            try { 
              const parsed = JSON.parse(item.content_json); 
              if (parsed.text) text = parsed.text; 
            } catch(e) {}
            return { id: item.id, content: text };
          }),
          teachers: tRes || []
        });

      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
        setSyncStatus('saved');
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);


  // ==========================================
  // INITIAL DASHBOARD LOAD
  // ==========================================
  useEffect(() => {
    async function loadLiveDashboardData() {
      setSyncStatus('syncing');
      try {
        const db = await getDatabase();

        try {
          const cfg = await db.select<any[]>('SELECT * FROM school_config WHERE id = 1;');
          if (cfg && cfg.length > 0) {
            if (cfg[0].name) setSchoolName(cfg[0].name);
            if (cfg[0].default_session) setSession(cfg[0].default_session);
            if (cfg[0].last_backup_date) {
              const diff = Math.floor((new Date().getTime() - new Date(cfg[0].last_backup_date).getTime()) / (1000 * 3600 * 24));
              setDaysSinceBackup(isNaN(diff) ? 0 : diff);
            }
          }
        } catch (e) {}

        try {
          const qCount = await db.select<any[]>('SELECT COUNT(*) as count FROM question_bank WHERE is_archived = 0 OR is_archived IS NULL;');
          const pCount = await getPapersThisMonth();
          const sCount = await db.select<any[]>('SELECT COUNT(*) as count FROM subjects WHERE is_archived = 0 OR is_archived IS NULL;');
          const tCount = await db.select<any[]>('SELECT COUNT(*) as count FROM teachers WHERE is_archived = 0 OR is_archived IS NULL;');
          setStats({
            questions: qCount?.[0]?.count || 0, papersThisMonth: pCount || 0,
            subjects: sCount?.[0]?.count || 0, teachers: tCount?.[0]?.count || 0
          });
        } catch (e) {}

        try {
          const livePapers = await db.select<any[]>('SELECT p.*, s.name as subject_name FROM generated_papers p LEFT JOIN subjects s ON p.subject_id = s.id ORDER BY p.id DESC LIMIT 6;');
          setRecentPapers(livePapers || []);
        } catch (e) { setRecentPapers([]); }

        try {
          const liveQuestions = await db.select<any[]>('SELECT q.*, s.name as subject_name FROM question_bank q LEFT JOIN subjects s ON q.subject_id = s.id ORDER BY q.id DESC LIMIT 3;');
          setRecentQuestions((liveQuestions || []).map(q => {
            let parsedText = q.content_json || 'Question text...';
            try { 
              const parsed = JSON.parse(q.content_json);
              if (parsed.text) parsedText = parsed.text; 
            } catch (e) {}
            return { id: q.id, content: parsedText, subject_name: q.subject_name || 'General', marks: q.marks || 2 };
          }));
        } catch (e) { setRecentQuestions([]); }

      } catch (err) {
        console.error('Dashboard DB load error:', err);
      } finally {
        setLoading(false);
        setSyncStatus('saved');
      }
    }
    loadLiveDashboardData();
  }, []);

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setSyncStatus('syncing');
    try {
      await downloadBackup();
      setDaysSinceBackup(0);
      showToast('Backup completed successfully!', 'success');
    } catch {
      alert('Failed to generate backup.');
    } finally {
      setIsBackingUp(false);
      setSyncStatus('saved');
    }
  };

  const liveNotifications = [
    daysSinceBackup > 7 
      ? { id: 1, type: 'warning', text: `Database backup is overdue by ${daysSinceBackup} days! Keep your papers safe.` }
      : { id: 1, type: 'success', text: 'Database backup is up to date and secured.' },
    stats.questions === 0 
      ? { id: 2, type: 'info', text: 'Question bank is empty. Click "Add Question" to start building your library!' }
      : { id: 2, type: 'info', text: `${stats.questions} active examination questions stored locally.` },
    { id: 3, type: 'system', text: 'Offline Windows SQLite engine running smoothly.' }
  ];

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-8 space-y-8 font-sans text-slate-800 animate-fadeIn relative">
      
      {/* ==========================================
          1. TOP HEADER WITH LIVE SEARCH, SYNC BADGE & POPOVERS
         ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 relative z-40">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <span className="text-xl font-extrabold text-slate-800 tracking-tight shrink-0">Dashboard</span>
          
          {/* FUNCTIONAL SEARCH BAR CONTAINER */}
          <div className="relative w-full" ref={searchRef}>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowSearchDropdown(true)}
              placeholder="Search papers, questions, teachers..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 shadow-2xs transition-all"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-teal-600 absolute right-3.5 top-2.5 animate-spin" />
            )}

            {/* FLOATING LIVE SEARCH RESULTS POPOVER */}
            {showSearchDropdown && (
              <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                {isSearching ? (
                  <div className="p-4 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching local database...
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {searchResults.papers.length === 0 && searchResults.questions.length === 0 && searchResults.teachers.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-slate-500">No results found for "{searchQuery}"</div>
                    ) : (
                      <div className="p-2 space-y-1">
                        
                        {searchResults.papers.length > 0 && (
                          <div className="pb-1">
                            <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Test Papers</span>
                            {searchResults.papers.map(p => (
                              <button key={`p-${p.id}`} onClick={() => onNavigate && onNavigate('history')} className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2.5 group cursor-pointer">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><FileText className="w-3.5 h-3.5" /></div>
                                <div className="truncate min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate">{p.title || 'Untitled'}</div>
                                  <div className="text-[10px] text-slate-400">{p.class_level}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.questions.length > 0 && (
                          <div className="pb-1 border-t border-slate-100 pt-1">
                            <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Question Bank</span>
                            {searchResults.questions.map(q => (
                              <button key={`q-${q.id}`} onClick={() => onNavigate && onNavigate('questions')} className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2.5 group cursor-pointer">
                                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg group-hover:scale-110 transition-transform"><Database className="w-3.5 h-3.5" /></div>
                                <div className="text-xs font-medium text-slate-700 line-clamp-2 leading-snug">{q.content}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.teachers.length > 0 && (
                          <div className="pb-1 border-t border-slate-100 pt-1">
                            <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Teachers</span>
                            {searchResults.teachers.map(t => (
                              <button key={`t-${t.id}`} onClick={() => onNavigate && onNavigate('teachers')} className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2.5 group cursor-pointer">
                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform"><User className="w-3.5 h-3.5" /></div>
                                <div className="truncate min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                                  <div className="text-[10px] text-slate-400">{t.subjects}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}
                <div className="bg-slate-50 border-t border-slate-100 p-2.5 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Press Enter to view all results
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto relative">
          {/* FUNCTIONAL DYNAMIC SYNC BADGE */}
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shadow-2xs transition-colors duration-300 ${
            syncStatus === 'syncing' 
              ? 'bg-amber-50 text-amber-700 border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {syncStatus === 'syncing' ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="hidden sm:inline-block">{syncStatus === 'syncing' ? 'Syncing...' : 'All changes saved'}</span>
          </div>

          {/* FUNCTIONAL NOTIFICATION BELL */}
          <div>
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {daysSinceBackup > 7 && (
                <span className="w-2 h-2 bg-amber-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3 z-50 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">System Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2.5">
                  {liveNotifications.map(n => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex items-start gap-2.5 text-xs font-medium">
                      {n.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                      {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                      {n.type === 'info' && <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                      {n.type === 'system' && <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />}
                      <span className="text-slate-700 leading-relaxed">{n.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FUNCTIONAL PROFILE AVATAR */}
          <div>
            <div 
              onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
              className="w-8 h-8 rounded-full bg-[#0D9488] hover:bg-[#0b7d73] text-white font-bold text-xs flex items-center justify-center shadow-sm cursor-pointer transition-transform hover:scale-105"
            >
              AR
            </div>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 z-50 animate-scaleUp">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 rounded-full bg-[#0D9488] text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                    AR
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-800 truncate">School Administrator</h4>
                    <p className="text-xs text-slate-400 truncate" title={schoolName}>{schoolName}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Session:</span>
                    <span className="font-bold text-slate-800">{session}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Database Status:</span>
                    <span className="text-emerald-600 font-bold">Online (Local)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">App Version:</span>
                    <span className="font-mono text-slate-700">v1.0.0</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <button 
                    onClick={() => { setShowProfileMenu(false); onNavigate && onNavigate('settings'); }}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>School Settings</span>
                  </button>
                  <button 
                    onClick={() => { setShowProfileMenu(false); onNavigate && onNavigate('backup'); }}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    <span>Security & Backups</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. GREETING */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <span>Good Morning, Ahmad</span>
          <span>👋</span>
        </h1>
        <p className="text-xs font-medium text-slate-500">{schoolName} · Academic Session {session}</p>
      </div>

      {/* 3. HERO & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#1B365D] text-white rounded-2xl p-7 md:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-2.5 relative z-10 max-w-md">
            <h2 className="text-xl font-extrabold tracking-tight">Create a new test paper</h2>
            <p className="text-xs text-slate-200/90 leading-relaxed font-normal">Build a clean, professional A4 paper in 5–10 minutes.</p>
          </div>
          <div className="pt-6 relative z-10">
            <button onClick={() => onNavigate && onNavigate('builder')} className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer">
              <FileText className="w-4 h-4 shrink-0" />
              <span>Create New Paper</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 flex-1">
            <button onClick={() => onNavigate && onNavigate('questions')} className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start gap-2.5 transition-all text-left cursor-pointer">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Plus className="w-4 h-4" /></div>
              <span className="text-xs font-bold text-slate-700">Add Question</span>
            </button>
            <button onClick={() => onNavigate && onNavigate('questions')} className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start gap-2.5 transition-all text-left cursor-pointer">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Database className="w-4 h-4" /></div>
              <span className="text-xs font-bold text-slate-700">Question Bank</span>
            </button>
            <button onClick={() => onNavigate && onNavigate('history')} className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start gap-2.5 transition-all text-left cursor-pointer">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><History className="w-4 h-4" /></div>
              <span className="text-xs font-bold text-slate-700">Old Papers</span>
            </button>
            <button onClick={() => { onNavigate && onNavigate('history'); setTimeout(() => window.print(), 500); }} className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 flex flex-col items-start gap-2.5 transition-all text-left cursor-pointer">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Printer className="w-4 h-4" /></div>
              <span className="text-xs font-bold text-slate-700">Print Recent</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div onClick={() => onNavigate && onNavigate('questions')} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3"><ClipboardList className="w-5 h-5" /></div>
          <div className="text-2xl font-extrabold text-slate-800">{stats.questions}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Total Questions</div>
        </div>
        <div onClick={() => onNavigate && onNavigate('history')} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3"><FileText className="w-5 h-5" /></div>
          <div className="text-2xl font-extrabold text-slate-800">{stats.papersThisMonth}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Papers This Month</div>
        </div>
        <div onClick={() => onNavigate && onNavigate('subjects')} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3"><BookOpen className="w-5 h-5" /></div>
          <div className="text-2xl font-extrabold text-slate-800">{stats.subjects}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Subjects</div>
        </div>
        <div onClick={() => onNavigate && onNavigate('teachers')} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-all cursor-pointer text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3"><Users className="w-5 h-5" /></div>
          <div className="text-2xl font-extrabold text-slate-800">{stats.teachers}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Teachers</div>
        </div>
      </div>

      {/* 5. BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Recent Papers (Max 6)</h3>
            <button onClick={() => onNavigate && onNavigate('history')} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"><span>View all</span><ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPapers.length === 0 ? (
              <div className="py-12 text-center"><FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-sm font-bold text-slate-600">No test papers created yet</p></div>
            ) : (
              recentPapers.map((paper) => (
                <div key={paper.id} onClick={() => onNavigate && onNavigate('history')} className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 -mx-2 px-3 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{paper.title}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{paper.class_level} · {paper.subject_name}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">New in Question Bank</h3>
              <button onClick={() => onNavigate && onNavigate('questions')} className="text-xs font-bold text-teal-600 hover:underline">Bank &gt;</button>
            </div>
            <div className="space-y-4">
              {recentQuestions.length === 0 ? (
                <div className="py-8 text-center space-y-1"><p className="text-xs font-bold text-slate-500">Question bank is empty</p></div>
              ) : (
                recentQuestions.map((q) => (
                  <div key={q.id} onClick={() => onNavigate && onNavigate('questions')} className="space-y-1 pb-3.5 border-b border-slate-100 last:border-0 last:pb-0 cursor-pointer">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">{q.content}</p>
                    <div className="text-[11px] font-medium text-slate-400">{q.subject_name} · {q.marks} marks</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FEF08A] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#FEF08A] text-amber-800 flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-amber-900 tracking-tight">Backup reminder</h4>
                <p className="text-xs font-medium text-amber-900/80 leading-relaxed">{daysSinceBackup === 0 ? 'Your database was backed up today!' : `Your last backup was ${daysSinceBackup} days ago.`}</p>
              </div>
            </div>
            <button onClick={handleCreateBackup} disabled={isBackingUp} className="w-full flex items-center justify-center gap-2 bg-white hover:bg-amber-50 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl border border-amber-300 shadow-2xs transition-all cursor-pointer">
              {isBackingUp ? <span className="animate-pulse">Generating Archive...</span> : <><Download className="w-4 h-4 text-emerald-600" /><span>Create Backup</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}