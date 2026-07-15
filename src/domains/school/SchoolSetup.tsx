import React, { useState, useEffect, useRef } from 'react';
import {  Save, CheckCircle2, AlertCircle, RefreshCw, Download, Upload, ShieldCheck, Database, Building2, Phone, MapPin, Calendar, Layout } from 'lucide-react';
import { getDatabase } from '../../database/db';
import { useLanguage } from '../../i18n/LanguageContext';

interface SchoolConfig {
  id?: number;
  name: string;
  address: string;
  phone: string;
  default_session: string;
  header_template: string;
}

export default function SchoolSetup() {
  const { isUrdu } = useLanguage();
  const [config, setConfig] = useState<SchoolConfig>({
    name: 'Ghazali Model High School',
    address: 'Main Campus, District Road',
    phone: '0300-1234567',
    default_session: '2026-2027',
    header_template: 'standard'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Hidden file input ref for backup upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const db = await getDatabase();
        await db.execute(`CREATE TABLE IF NOT EXISTS school_config (
          id INTEGER PRIMARY KEY,
          name TEXT, address TEXT, phone TEXT, default_session TEXT, header_template TEXT
        );`);

        const res = await db.select<any[]>('SELECT * FROM school_config WHERE id = 1;');
        if (res && res.length > 0) {
          setConfig({
            id: res[0].id,
            name: res[0].name || '',
            address: res[0].address || '',
            phone: res[0].phone || '',
            default_session: res[0].default_session || '2026-2027',
            header_template: res[0].header_template || 'standard'
          });
        }
      } catch (err) {
        console.error('Error loading school config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const db = await getDatabase();
      const exists = await db.select<any[]>('SELECT id FROM school_config WHERE id = 1;');
      
      if (exists && exists.length > 0) {
        await db.execute(
          `UPDATE school_config SET name = $1, address = $2, phone = $3, default_session = $4, header_template = $5 WHERE id = 1;`,
          [config.name, config.address, config.phone, config.default_session, config.header_template]
        );
      } else {
        await db.execute(
          `INSERT INTO school_config (id, name, address, phone, default_session, header_template) VALUES (1, $1, $2, $3, $4, $5);`,
          [config.name, config.address, config.phone, config.default_session, config.header_template]
        );
      }

      setMessage({
        text: isUrdu ? 'سکول کی معلومات کامیابی سے محفوظ ہو گئیں!' : 'School profile & exam header settings saved successfully!',
        type: 'success'
      });
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ text: 'Error saving settings to database.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // BACKUP ENGINE 1: EXPORT DATABASE TO JSON
  // ==========================================
  const handleExportBackup = async () => {
    setBackupLoading(true);
    setMessage(null);
    try {
      const db = await getDatabase();
      
      // Query all tables
      const schoolConfigData = await db.select('SELECT * FROM school_config;');
      const teachersData = await db.select('SELECT * FROM teachers;');
      const subjectsData = await db.select('SELECT * FROM subjects;');
      const questionBankData = await db.select('SELECT * FROM question_bank;');
      const generatedPapersData = await db.select('SELECT * FROM generated_papers;');

      const backupPackage = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        school_config: schoolConfigData || [],
        teachers: teachersData || [],
        subjects: subjectsData || [],
        question_bank: questionBankData || [],
        generated_papers: generatedPapersData || []
      };

      // Create a web download blob
      const jsonString = JSON.stringify(backupPackage, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `School_Paper_Generator_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        text: isUrdu ? 'مکمل ڈیٹا بیس کا بیک اپ کامیابی کے ساتھ ڈاؤن لوڈ ہو گیا ہے!' : 'Complete database backup exported successfully to your computer!',
        type: 'success'
      });
    } catch (err) {
      console.error('Export error:', err);
      setMessage({ text: 'Failed to generate backup file.', type: 'error' });
    } finally {
      setBackupLoading(false);
    }
  };

  // ==========================================
  // BACKUP ENGINE 2: RESTORE DATABASE FROM JSON
  // ==========================================
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmMsg = isUrdu 
      ? 'توجہ فرمائیں! بیک اپ ری سٹور کرنے سے موجودہ تمام سوالات اور پیپرز پرانے بیک اپ ڈیٹا سے تبدیل ہو جائیں گے۔ کیا آپ جاری رکھنا چاہتے ہیں؟' 
      : 'WARNING! Restoring a backup will overwrite all current questions, faculty, and past papers with the backup file data. Do you wish to proceed?';

    if (!window.confirm(confirmMsg)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setBackupLoading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const data = JSON.parse(jsonText);

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid backup file format.');
        }

        const db = await getDatabase();

        // 1. Clear Existing Tables
        await db.execute('DELETE FROM generated_papers;');
        await db.execute('DELETE FROM question_bank;');
        await db.execute('DELETE FROM subjects;');
        await db.execute('DELETE FROM teachers;');
        await db.execute('DELETE FROM school_config;');

        // 2. Restore School Config
        if (Array.isArray(data.school_config) && data.school_config.length > 0) {
          const c = data.school_config[0];
          await db.execute(
            `INSERT INTO school_config (id, name, address, phone, default_session, header_template) VALUES (1, $1, $2, $3, $4, $5);`,
            [c.name || '', c.address || '', c.phone || '', c.default_session || '2026-2027', c.header_template || 'standard']
          );
          setConfig({
            name: c.name || '',
            address: c.address || '',
            phone: c.phone || '',
            default_session: c.default_session || '2026-2027',
            header_template: c.header_template || 'standard'
          });
        }

        // 3. Restore Teachers
        if (Array.isArray(data.teachers)) {
          for (const t of data.teachers) {
            await db.execute(`INSERT INTO teachers (id, name) VALUES ($1, $2);`, [t.id, t.name]);
          }
        }

        // 4. Restore Subjects
        if (Array.isArray(data.subjects)) {
          for (const s of data.subjects) {
            await db.execute(`INSERT INTO subjects (id, name, code) VALUES ($1, $2, $3);`, [s.id, s.name, s.code || '']);
          }
        }

        // 5. Restore Question Bank
        if (Array.isArray(data.question_bank)) {
          for (const q of data.question_bank) {
            await db.execute(
              `INSERT INTO question_bank (id, teacher_id, subject_id, class_level, chapter_topic, question_type, language, marks, difficulty, content_json, tags)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
              [q.id, q.teacher_id, q.subject_id, q.class_level, q.chapter_topic, q.question_type, q.language, q.marks, q.difficulty, q.content_json, q.tags || '']
            );
          }
        }

        // 6. Restore Generated Papers
        if (Array.isArray(data.generated_papers)) {
          for (const p of data.generated_papers) {
            await db.execute(
              `INSERT INTO generated_papers (id, title, subject_id, class_level, total_marks, time_allowed, instructions, questions_json, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
              [p.id, p.title, p.subject_id, p.class_level, p.total_marks, p.time_allowed, p.instructions || '', p.questions_json || '[]', p.created_at]
            );
          }
        }

        setMessage({
          text: isUrdu ? 'بیک اپ سے تمام سوالات اور ریکارڈ کامیابی کے ساتھ بحال ہو گئے ہیں!' : 'All school data, question bank, and historical records restored successfully!',
          type: 'success'
        });
      } catch (err) {
        console.error('Restore error:', err);
        setMessage({ text: 'Error restoring backup: Invalid or corrupted JSON file.', type: 'error' });
      } finally {
        setBackupLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span>Loading School Setup module...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Alert Message Box */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* SECTION 1: SCHOOL PROFILE & EXAM HEADER SETTINGS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{isUrdu ? 'سکول پروفائل اور ہیڈر کی معلومات' : 'School Profile & Exam Header Configuration'}</h3>
            <p className="text-xs text-slate-400">{isUrdu ? 'یہ معلومات پرنٹ ہونے والے امتحانی پیپرز کے سب سے اوپر ظاہر ہوں گی' : 'These institutional details appear at the top of all printed A4 examination sheets.'}</p>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* School Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> {isUrdu ? 'سکول / ادارے کا نام' : 'Official Institution Name'} *
              </label>
              <input
                type="text"
                required
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g. Ghazali Model High School"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {isUrdu ? 'کیمپس کا پتہ / شہر' : 'Campus Address & City'}
              </label>
              <input
                type="text"
                value={config.address}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                placeholder="e.g. Main Campus, District Road"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {isUrdu ? 'فون نمبر / رابطہ' : 'Phone / Contact Number'}
              </label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                placeholder="e.g. 0300-1234567"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Academic Session */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {isUrdu ? 'تعلیمی سال / سیشن' : 'Default Academic Session'}
              </label>
              <input
                type="text"
                value={config.default_session}
                onChange={(e) => setConfig({ ...config, default_session: e.target.value })}
                placeholder="e.g. 2026-2027"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Header Layout Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-slate-400" /> {isUrdu ? 'امتحانی ہیڈر کا ڈیزائن' : 'Print Header Layout Template'}
              </label>
              <select
                value={config.header_template}
                onChange={(e) => setConfig({ ...config, header_template: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="standard">Standard Board Exam Layout (Centered & Bordered)</option>
                <option value="modern">Modern Bold Layout (Left Aligned Title)</option>
                <option value="minimal">Minimalist Layout (Compact Spacing for Short Tests)</option>
              </select>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isUrdu ? 'ترتیبات محفوظ کریں' : 'Save Header Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: CRASH-PROOF DATABASE BACKUP & RESTORE SUITE */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-md space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-700/80 pb-4">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {isUrdu ? 'ڈیٹا کی حفاظت اور بیک اپ (Backup & Security)' : 'Data Security & Offline Database Backup'}
              <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Crash-Proof Suite
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              {isUrdu 
                ? 'اپنے تمام سوالات اور پیپرز کی فائل یو ایس بی (USB) میں محفوظ کریں، اور ضرورت پڑنے پر ری سٹور کریں۔' 
                : 'Export a complete backup file of all faculty, questions, and past exams to a USB drive or PC. Restore instantly on any computer.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Card 1: Export Database Backup */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-blue-400/50 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                <Download className="w-4 h-4" />
                <span>{isUrdu ? 'ڈیٹا بیس کا بیک اپ ڈاؤن لوڈ کریں' : 'Export Full Database Backup'}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isUrdu 
                  ? 'تمام سوالات کے بینک، اساتذہ، اور محفوظ کردہ پیپرز کو ایک .JSON فائل میں ڈاؤن لوڈ کریں۔' 
                  : 'Downloads a complete snapshot (.json) of your entire SQLite database to your local hard drive or external USB.'}
              </p>
            </div>

            <button
              onClick={handleExportBackup}
              disabled={backupLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.02] disabled:opacity-50"
            >
              {backupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {isUrdu ? 'بیک اپ فائل ڈاؤن لوڈ کریں' : 'Download Backup File (.JSON)'}
            </button>
          </div>

          {/* Card 2: Restore Database from Backup */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-400/50 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Upload className="w-4 h-4" />
                <span>{isUrdu ? 'بیک اپ فائل سے ری سٹور کریں' : 'Restore Database from Backup'}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isUrdu 
                  ? 'کسی بھی کمپیوٹر پر پرانی .JSON بیک اپ فائل اپلوڈ کریں اور اپنا تمام ریکارڈ منٹوں میں بحال کریں۔' 
                  : 'Select a previously saved backup file from your USB or computer to instantly restore all questions and faculty.'}
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleRestoreBackup}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={backupLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.02] disabled:opacity-50"
            >
              {backupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUrdu ? 'بیک اپ فائل اپلوڈ / ری سٹور کریں' : 'Select Backup File & Restore'}
            </button>
          </div>

        </div>

        <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-3.5 text-center">
          <span className="text-xs text-slate-400 font-medium">
            💡 {isUrdu ? 'بہترین مشورہ: ہر ہفتے اپنے ڈیٹا کا بیک اپ یو ایس بی (USB) یا گوگل ڈرائیو میں ضرور محفوظ کریں!' : 'Pro-Tip: Make it a habit to export a database backup to a USB drive every week to keep school records 100% secure!'}
          </span>
        </div>
      </div>

    </div>
  );
}