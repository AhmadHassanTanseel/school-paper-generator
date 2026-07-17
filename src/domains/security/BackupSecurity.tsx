import { useState, useEffect } from 'react';
import { 
  ShieldCheck, Download, Upload, Database, AlertTriangle,
  RefreshCw, CheckCircle2, HardDrive
} from 'lucide-react';
import { downloadBackup, restoreBackup, getDatabaseStats } from '../../services/backupService';
import { getSchoolConfig } from '../../services/schoolService';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';

export default function BackupSecurity() {
  const { showToast, confirm, triggerRefresh } = useApp();
  const { isUrdu } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState('');
  const [stats, setStats] = useState({ questions: 0, papers: 0, teachers: 0, subjects: 0, sizeEstimate: '0 KB' });

  const loadData = async () => {
    try {
      const [cfg, dbStats] = await Promise.all([getSchoolConfig(), getDatabaseStats()]);
      setLastBackup(cfg?.last_backup_date || 'Never');
      setStats(dbStats);
    } catch (err) {
      console.error('Backup screen load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const daysSinceBackup = lastBackup && lastBackup !== 'Never'
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 3600 * 24))
    : 999;

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await downloadBackup();
      setLastBackup(new Date().toISOString().split('T')[0]);
      showToast(isUrdu ? 'بیک اپ کامیابی سے ڈاؤن لوڈ ہو گیا!' : 'Backup downloaded successfully!', 'success');
    } catch {
      showToast('Failed to create backup. Please try again.', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await confirm({
      title: 'Restore Backup?',
      message: isUrdu
        ? 'یہ عمل موجودہ تمام ڈیٹا کو بیک اپ فائل سے بدل دے گا۔ کیا آپ جاری رکھنا چاہتے ہیں؟'
        : 'WARNING! Restoring will overwrite all current questions, papers, and school data with the backup file. This cannot be undone.',
      confirmLabel: 'Restore Backup',
      destructive: true,
    });

    if (!confirmed) { e.target.value = ''; return; }

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        await restoreBackup(data);
        await loadData();
        triggerRefresh();
        showToast(isUrdu ? 'بیک اپ کامیابی سے بحال ہو گیا!' : 'All data restored successfully from backup!', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Invalid or corrupted backup file.', 'error');
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
        <span>Loading backup status...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-800">Backup & Restore</h1>
        <p className="text-xs text-slate-500">Your papers and questions are stored on this computer. Create regular backups to keep your work safe.</p>
      </div>

      {/* Status Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${daysSinceBackup <= 7 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800">Backup Status</h3>
            <p className="text-xs text-slate-500">
              {daysSinceBackup <= 7
                ? `Last backup: ${lastBackup === 'Never' ? 'Not yet created' : lastBackup}`
                : `Your last backup was ${daysSinceBackup} days ago — backup recommended`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Questions', value: stats.questions },
            { label: 'Papers', value: stats.papers },
            { label: 'Teachers', value: stats.teachers },
            { label: 'Database Size', value: stats.sizeEstimate, icon: HardDrive },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <span className="text-xl font-extrabold text-slate-800 block">{item.value}</span>
              <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Download className="w-4 h-4" />
            <span>Create Backup</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Download a complete snapshot of all school data, questions, papers, and templates as a .JSON file. Save it to a USB drive or another computer.
          </p>
          <button
            onClick={handleBackup}
            disabled={backingUp}
            className="w-full flex items-center justify-center gap-2 bg-[#0D9488] hover:bg-[#0b7d73] text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {backingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {backingUp ? 'Creating Backup...' : 'Download Backup File (.JSON)'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
            <Upload className="w-4 h-4" />
            <span>Restore Backup</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select a previously saved backup file to restore all questions, papers, teachers, and school settings.
          </p>
          <label className="w-full flex items-center justify-center gap-2 bg-[#1B365D] hover:bg-[#152946] text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer">
            {restoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {restoring ? 'Restoring...' : 'Select Backup File & Restore'}
            <input type="file" accept=".json" onChange={handleRestore} className="hidden" disabled={restoring} />
          </label>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-[#FFFBEB] border border-[#FEF08A] rounded-2xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-amber-900">Keep a backup file on USB drive or another computer</h4>
          <p className="text-xs text-amber-800/80 leading-relaxed">
            If this computer is damaged or reformatted, your papers and questions will be lost unless you have a backup file saved elsewhere. We recommend creating a backup every week.
          </p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-800">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>100% offline storage — no cloud, no internet required. Your data never leaves this computer unless you export it.</span>
      </div>
    </div>
  );
}
