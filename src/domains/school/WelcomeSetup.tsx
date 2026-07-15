import { useState } from 'react';
import { Building2, Layout, BookOpen, Users, CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { getDatabase } from '../../database/db';

interface WelcomeSetupProps {
  onComplete: () => void;
}

export default function WelcomeSetup({ onComplete }: WelcomeSetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('Ghazali Model High School');
  const [address, setAddress] = useState('Main Campus, District Road');
  const [phone, setPhone] = useState('0300-1234567');
  const [session, setSession] = useState('2026-2027');
  const [defaultLang, setDefaultLang] = useState('Mixed (English & Urdu)');

  // Step 2: Header Setup
  const [headerTemplate, setHeaderTemplate] = useState('standard');

  // BULLETPROOF SCHEMA ENGINE: Strips out strict DEFAULT clauses so SQLite never rejects column additions!
  const ensureDatabaseSchema = async (db: any) => {
    await db.execute(`CREATE TABLE IF NOT EXISTS school_config (
      id INTEGER PRIMARY KEY, name TEXT, address TEXT, phone TEXT, 
      default_session TEXT, header_template TEXT, is_setup_complete INTEGER,
      last_backup_date TEXT
    );`);
    
    // Safely add columns WITHOUT strict default constraints that crash SQLite migrations
    try { await db.execute(`ALTER TABLE school_config ADD COLUMN is_setup_complete INTEGER;`); } catch {}
    try { await db.execute(`ALTER TABLE school_config ADD COLUMN last_backup_date TEXT;`); } catch {}
    
    await db.execute(`CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, code TEXT);`);
    await db.execute(`CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`);
  };

  const handleUseDemoData = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      await ensureDatabaseSchema(db);

      // Pass date cleanly as a standard string parameter ($6)
      const now = new Date().toISOString().split('T')[0];
      await db.execute(
        `INSERT OR REPLACE INTO school_config (id, name, address, phone, default_session, header_template, is_setup_complete, last_backup_date)
         VALUES (1, $1, $2, $3, $4, $5, 1, $6);`,
        [schoolName, address, phone, session, headerTemplate, now]
      );

      // Seed Demo Subjects
      const existingSubs = await db.select<any[]>('SELECT COUNT(*) as count FROM subjects;');
      if (!existingSubs?.[0]?.count) {
        const demoSubjects = [
          { name: 'Physics', code: 'PHY-09' }, { name: 'Chemistry', code: 'CHM-09' },
          { name: 'Mathematics', code: 'MTH-09' }, { name: 'Urdu Lazmi', code: 'URD-09' },
          { name: 'English', code: 'ENG-09' }, { name: 'Islamiyat', code: 'ISL-09' }
        ];
        for (const s of demoSubjects) {
          await db.execute(`INSERT INTO subjects (name, code) VALUES ($1, $2);`, [s.name, s.code]);
        }
      }

      // Seed Demo Teachers
      const existingTeachers = await db.select<any[]>('SELECT COUNT(*) as count FROM teachers;');
      if (!existingTeachers?.[0]?.count) {
        const demoTeachers = ['Sir Muhammad Imran', 'Maam Ayesha Tariq', 'Hafiz Ahmad Hassan', 'Zain Mustafa'];
        for (const t of demoTeachers) {
          await db.execute(`INSERT INTO teachers (name) VALUES ($1);`, [t]);
        }
      }

      onComplete();
    } catch (err: any) {
      console.error('Demo data seeding error:', err);
      // Display the exact SQL error to the user if anything goes wrong
      alert(`Database Error: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      await ensureDatabaseSchema(db);
      
      const now = new Date().toISOString().split('T')[0];
      await db.execute(
        `INSERT OR REPLACE INTO school_config (id, name, address, phone, default_session, header_template, is_setup_complete, last_backup_date)
         VALUES (1, $1, $2, $3, $4, $5, 1, $6);`,
        [schoolName, address, phone, session, headerTemplate, now]
      );
      onComplete();
    } catch (err: any) {
      console.error('Setup error:', err);
      alert(`Database Error: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-6 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Setup Wizard Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-800">Set Up Your School Paper Generator</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Add your school details once. Every paper will automatically use your school’s professional A4 format.</p>
          </div>

          {/* 5 Step Indicators */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? 'bg-blue-600 text-white shadow-md' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 5 && <div className={`w-6 h-1 rounded ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content Area */}
        <div className="p-8 flex-1">
          
          {/* STEP 1: SCHOOL INFORMATION */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Step 1: School Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="space-y-1 md:col-span-2">
                  <label>Official School Name *</label>
                  <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm font-bold bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <label>Campus Address & City</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2 border rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label>Phone Number</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label>Academic Session</label>
                  <input type="text" value={session} onChange={(e) => setSession(e.target.value)} className="w-full p-2 border rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label>Default Language Preference</label>
                  <select value={defaultLang} onChange={(e) => setDefaultLang(e.target.value)} className="w-full p-2 border rounded-xl bg-white">
                    <option>Mixed (English & Urdu)</option>
                    <option>English Only</option>
                    <option>Urdu Nastaliq Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PAPER HEADER SETUP */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2">
                <Layout className="w-5 h-5 text-blue-600" /> Step 2: Paper Header Layout Setup
              </h3>
              <p className="text-xs text-slate-500">Choose how your school name and exam instructions appear at the top of printed A4 test sheets.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {[
                  { id: 'standard', name: 'Standard Board Exam', desc: 'Centered title, double border, standard BISE spacing.' },
                  { id: 'modern', name: 'Modern Left-Aligned', desc: 'Bold left-aligned title with compact metadata grid.' },
                  { id: 'minimal', name: 'Minimalist Test Sheet', desc: 'Compact spacing designed for 15-minute class tests.' }
                ].map((tpl) => (
                  <div 
                    key={tpl.id}
                    onClick={() => setHeaderTemplate(tpl.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      headerTemplate === tpl.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-800 mb-1">{tpl.name}</div>
                    <p className="text-[11px] text-slate-500 leading-normal">{tpl.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: CLASSES AND SUBJECTS */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn text-center py-6">
              <BookOpen className="w-12 h-12 mx-auto text-blue-600 opacity-80" />
              <h3 className="font-bold text-slate-800 text-lg">Step 3: Classes & Curriculum Structure</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                We have pre-configured <strong>Grade 1 through Grade 10</strong> along with standard Pakistani curriculum subjects (Physics, Chemistry, Mathematics, Urdu, English, Islamiyat). You can customize these anytime from the sidebar!
              </p>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold border border-blue-200">
                ✓ 10 Class Levels & 12 Core Subjects Ready
              </div>
            </div>
          )}

          {/* STEP 4: TEACHERS */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn text-center py-6">
              <Users className="w-12 h-12 mx-auto text-purple-600 opacity-80" />
              <h3 className="font-bold text-slate-800 text-lg">Step 4: Faculty & Examiner Roster</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Assign teachers to specific subjects so their names automatically print on examiner marking keys and paper footers.
              </p>
              <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-xs font-bold border border-purple-200">
                ✓ 4 Sample Teachers Configured
              </div>
            </div>
          )}

          {/* STEP 5: FINISH SETUP */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-xl">Setup Complete & Ready for Generation!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your school profile for <strong>{schoolName}</strong> is stored securely on this computer. You can now assemble professional A4 examination papers in minutes.
              </p>
              <div className="p-3 bg-slate-50 border rounded-xl text-[11px] text-slate-600 max-w-sm mx-auto flex items-center gap-2 justify-center">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" /> 100% Offline Windows Storage — No Cloud Required
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-between">
          <button
            onClick={handleUseDemoData}
            disabled={loading}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Use Demo Data (Skip Wizard)
          </button>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Back
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-[1.02]"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinishSetup}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-lg cursor-pointer transition-all hover:scale-[1.02]"
              >
                Launch Paper Generator 🚀
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}