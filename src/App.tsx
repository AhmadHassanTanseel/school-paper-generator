import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, Database, History, Users, 
  BookOpen, Layers, Settings, ShieldCheck, CheckCircle2, 
  AlertCircle, Globe, GraduationCap
} from 'lucide-react';
import { initializeDatabase } from './database/db';
import { getSchoolConfig } from './services/schoolService';
import { useLanguage } from './i18n/LanguageContext';
import { AppProvider, useApp } from './context/AppContext';
import ToastContainer from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';

import Dashboard from './domains/dashboard/Dashboard';
import PaperBuilder from './domains/paper/PaperBuilder';
import QuestionBank from './domains/questions/QuestionBank';
import OldPapers from './domains/history/OldPapers';
import TeacherManagement from './domains/teachers/TeacherManagement';
import CurriculumManager from './domains/curriculum/CurriculumManager';
import PaperTemplates from './domains/templates/PaperTemplates';
import SchoolSetup from './domains/school/SchoolSetup';
import BackupSecurity from './domains/security/BackupSecurity';
import WelcomeSetup from './domains/school/WelcomeSetup';

interface SchoolMeta {
  name: string;
  default_session: string;
  is_setup_complete: boolean;
  last_backup_date: string;
}

function AppShell() {
  const { isUrdu, toggleLanguage } = useLanguage();
  const { activeTab, navigate } = useApp();
  const [schoolMeta, setSchoolMeta] = useState<SchoolMeta>({
    name: 'Al-Falah Public High School',
    default_session: '2025–2026',
    is_setup_complete: false,
    last_backup_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);

  const loadMeta = async () => {
    try {
      const cfg = await getSchoolConfig();
      if (cfg) {
        setSchoolMeta({
          name: cfg.name || 'My School',
          default_session: cfg.default_session || '2026-2027',
          is_setup_complete: Boolean(cfg.is_setup_complete),
          last_backup_date: cfg.last_backup_date || new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      console.error('Error loading app metadata:', err);
    }
  };

  useEffect(() => {
    async function initApp() {
      await initializeDatabase();
      await loadMeta();
      setLoading(false);
    }
    initApp();
  }, []);

  useEffect(() => {
    if (!loading) loadMeta();
  }, [activeTab, loading]);

  if (loading) {
    return <div className="h-screen w-screen bg-[#102A43] flex items-center justify-center text-white font-medium">Loading Desktop Engine...</div>;
  }

  if (!schoolMeta.is_setup_complete) {
    return <WelcomeSetup onComplete={() => setSchoolMeta({ ...schoolMeta, is_setup_complete: true })} />;
  }

  const daysSinceBackup = Math.floor(
    (new Date().getTime() - new Date(schoolMeta.last_backup_date).getTime()) / (1000 * 3600 * 24)
  );
  const isBackupHealthy = daysSinceBackup <= 7;

  const navItems = [
    { id: 'dashboard', label: isUrdu ? 'ڈیش بورڈ' : 'Dashboard', icon: LayoutDashboard },
    { id: 'builder', label: isUrdu ? 'نیا پیپر بنائیں' : 'Create Paper', icon: FileText },
    { id: 'questions', label: isUrdu ? 'سوالات کا بینک' : 'Question Bank', icon: Database },
    { id: 'history', label: isUrdu ? 'محفوظ پیپرز' : 'Old Papers', icon: History },
    { id: 'teachers', label: isUrdu ? 'اساتذہ' : 'Teachers', icon: Users },
    { id: 'subjects', label: isUrdu ? 'کلاسز اور مضامین' : 'Classes & Subjects', icon: BookOpen },
    { id: 'templates', label: isUrdu ? 'پیپر کے نمونے' : 'Paper Templates', icon: Layers },
    { id: 'settings', label: isUrdu ? 'سکول سیٹنگز' : 'School Settings', icon: Settings },
    { id: 'backup', label: isUrdu ? 'بیک اپ اور ری سٹور' : 'Backup & Restore', icon: ShieldCheck },
  ];

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-[#F8FAFC] font-sans text-slate-800 ${isUrdu ? 'dir-rtl' : ''}`}>
      <aside className="w-64 bg-[#102A43] text-slate-300 flex flex-col justify-between shrink-0 border-r border-[#1E3A5F] shadow-xl print:hidden">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0D9488] flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm tracking-tight leading-none">Paper Generator</h1>
              <span className="text-[11px] font-semibold text-slate-400 block mt-1">School Edition</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0D9488] text-white shadow-md shadow-teal-900/30 font-extrabold'
                    : 'hover:bg-slate-800/60 hover:text-white text-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 bg-[#0B1E31] border-t border-slate-700/50 space-y-2.5">
          <div>
            <div className="font-extrabold text-white text-xs truncate" title={schoolMeta.name}>{schoolMeta.name}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Session {schoolMeta.default_session}</div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400 font-mono text-[10px]">v1.0.0</span>
            <div onClick={() => navigate('backup')} className="flex items-center gap-1 text-[#34D399] font-bold cursor-pointer hover:underline">
              {isBackupHealthy ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              <span className={isBackupHealthy ? 'text-[#34D399]' : 'text-amber-400'}>{isBackupHealthy ? 'Backed up' : 'Backup needed'}</span>
            </div>
          </div>
          <div className="pt-1 text-right">
            <button onClick={toggleLanguage} className="text-[10px] text-teal-400 hover:underline inline-flex items-center gap-1 font-bold">
              <Globe className="w-3 h-3" /> {isUrdu ? 'English UI' : 'اردو نستعلیق'}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => navigate(tab)} />}
        {activeTab === 'builder' && <div className="p-8"><PaperBuilder /></div>}
        {activeTab === 'questions' && <div className="p-8"><QuestionBank /></div>}
        {activeTab === 'history' && <div className="p-8"><OldPapers onNavigate={(tab) => navigate(tab)} /></div>}
        {activeTab === 'teachers' && <div className="p-8"><TeacherManagement onNavigate={(tab) => navigate(tab)} /></div>}
        {activeTab === 'subjects' && <div className="p-8"><CurriculumManager /></div>}
        {activeTab === 'templates' && <div className="p-8"><PaperTemplates /></div>}
        {activeTab === 'settings' && <div className="p-8"><SchoolSetup /></div>}
        {activeTab === 'backup' && <div className="p-8"><BackupSecurity /></div>}
      </main>

      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
