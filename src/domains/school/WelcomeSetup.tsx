import { useState } from 'react';
import { Building2, Layout, BookOpen, Users, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Upload, Image } from 'lucide-react';
import { initializeDatabase } from '../../database/db';
import { completeSetup } from '../../services/schoolService';
import { seedDefaultSubjects, seedDefaultChapters } from '../../services/curriculumService';
import { getDatabase, DEFAULT_SUBJECTS } from '../../database/db';
import { validateSchoolInfo } from '../../utils/validation';

interface WelcomeSetupProps {
  onComplete: () => void;
}

export default function WelcomeSetup({ onComplete }: WelcomeSetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [schoolName, setSchoolName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [session, setSession] = useState('2026-2027');
  const [defaultLang, setDefaultLang] = useState('Mixed (English & Urdu)');
  const [paperSize, setPaperSize] = useState('A4');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [headerTemplate, setHeaderTemplate] = useState('standard');

  const [setupTeachers, setSetupTeachers] = useState([
    { name: 'Mr. Ahmad Raza', subjects: 'Physics, General Science', classes: 'Grade 8, Grade 9' },
    { name: 'Mrs. Fauzia Khan', subjects: 'Urdu, English', classes: 'Grade 6, Grade 7' },
    { name: 'Mr. Kamran Ali', subjects: 'Mathematics', classes: 'Grade 9, Grade 10' },
    { name: 'Qari Bilal', subjects: 'Arabic, Islamiyat', classes: 'Grade 6, Grade 7, Grade 8' },
  ]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors(prev => ({ ...prev, logo: 'Please upload an image file (PNG, JPG).' })); return; }
    if (file.size > 2 * 1024 * 1024) { setErrors(prev => ({ ...prev, logo: 'Logo must be under 2 MB.' })); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setLogoPath(result);
      setErrors(prev => { const n = { ...prev }; delete n.logo; return n; });
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = (): boolean => {
    const result = validateSchoolInfo({ name: schoolName, phone, session, address });
    setErrors(result.errors);
    return result.valid;
  };

  const seedAllData = async (useDemo: boolean) => {
    await initializeDatabase();
    const db = await getDatabase();
    const now = new Date().toISOString().split('T')[0];

    await completeSetup({
      name: schoolName || 'Demo School',
      address: address || 'Main Campus',
      phone: phone || '0300-0000000',
      session: session || '2026-2027',
      headerTemplate,
      defaultLang,
    });

    if (logoPath) {
      try { await db.execute('ALTER TABLE school_config ADD COLUMN logo_path TEXT;'); } catch {}
      await db.execute('UPDATE school_config SET logo_path = $1, default_paper_size = $2 WHERE id = 1;', [logoPath, paperSize]);
    } else {
      await db.execute('UPDATE school_config SET default_paper_size = $1 WHERE id = 1;', [paperSize]);
    }

    await seedDefaultSubjects();
    await seedDefaultChapters();

    const subCount = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM subjects;');
    if (!subCount?.[0]?.count || useDemo) {
      for (const name of DEFAULT_SUBJECTS) {
        const exists = await db.select<{ id: number }[]>('SELECT id FROM subjects WHERE name = $1;', [name]);
        if (!exists || exists.length === 0) {
          await db.execute('INSERT INTO subjects (name, code) VALUES ($1, $2);', [name, name.slice(0, 3).toUpperCase()]);
        }
      }
    }

    const teachCount = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM teachers;');
    if (!teachCount?.[0]?.count || useDemo) {
      for (const t of setupTeachers) {
        await db.execute(
          'INSERT INTO teachers (name, subjects, classes, papers_count, questions_count) VALUES ($1, $2, $3, 0, 0);',
          [t.name, t.subjects, t.classes]
        );
      }
    }

    await db.execute('UPDATE school_config SET last_backup_date = $1 WHERE id = 1;', [now]);
  };

  const handleContinue = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 4) {
      const invalid = setupTeachers.some(t => !t.name.trim() || !t.subjects.trim());
      if (invalid) { setErrors({ teachers: 'Each teacher must have a name and subjects.' }); return; }
      setErrors({});
    }
    setStep(step + 1);
  };

  const handleUseDemoData = async () => {
    setLoading(true);
    try {
      if (!schoolName) setSchoolName('Ghazali Model High School');
      if (!session) setSession('2026-2027');
      await seedAllData(true);
      onComplete();
    } catch (err: unknown) {
      alert(`Setup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = async () => {
    if (!validateStep1()) { setStep(1); return; }
    setLoading(true);
    try {
      await seedAllData(false);
      onComplete();
    } catch (err: unknown) {
      alert(`Setup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fieldErr = (k: string) => errors[k];

  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center p-6 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1B365D] text-white shadow-lg mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-800">Set Up Your School Paper Generator</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Add your school details once. Every paper will use your school's professional format.</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-[#1B365D] text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 5 && <div className={`w-6 h-1 rounded ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 flex-1 overflow-y-auto max-h-[55vh]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Building2 className="w-5 h-5 text-[#1B365D]" /> Step 1: School Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="space-y-1 md:col-span-2">
                  <label>Official School Name *</label>
                  <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)}
                    className={`w-full p-2.5 border rounded-xl text-sm font-bold ${fieldErr('name') ? 'border-red-400' : ''}`} placeholder="e.g. Ghazali Model High School" />
                  {fieldErr('name') && <p className="text-red-500 text-[11px]">{fieldErr('name')}</p>}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label>School Logo Upload</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
                      <Upload className="w-4 h-4" /> Choose Image
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {logoPreview ? <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-lg object-cover border" /> : <Image className="w-8 h-8 text-slate-300" />}
                  </div>
                  {fieldErr('logo') && <p className="text-red-500 text-[11px]">{fieldErr('logo')}</p>}
                </div>
                <div className="space-y-1">
                  <label>Campus Address & City</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border rounded-xl" placeholder="Main Campus, Lahore" />
                </div>
                <div className="space-y-1">
                  <label>Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={`w-full p-2 border rounded-xl ${fieldErr('phone') ? 'border-red-400' : ''}`} placeholder="0300-1234567" />
                  {fieldErr('phone') && <p className="text-red-500 text-[11px]">{fieldErr('phone')}</p>}
                </div>
                <div className="space-y-1">
                  <label>Academic Session *</label>
                  <input type="text" value={session} onChange={e => setSession(e.target.value)} className={`w-full p-2 border rounded-xl ${fieldErr('session') ? 'border-red-400' : ''}`} placeholder="2026-2027" />
                  {fieldErr('session') && <p className="text-red-500 text-[11px]">{fieldErr('session')}</p>}
                </div>
                <div className="space-y-1">
                  <label>Default Language Preference</label>
                  <select value={defaultLang} onChange={e => setDefaultLang(e.target.value)} className="w-full p-2 border rounded-xl bg-white">
                    <option>Mixed (English & Urdu)</option><option>English Only</option><option>Urdu Nastaliq Only</option><option>Arabic</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Default Paper Size</label>
                  <select value={paperSize} onChange={e => setPaperSize(e.target.value)} className="w-full p-2 border rounded-xl bg-white">
                    <option>A4</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Layout className="w-5 h-5 text-[#1B365D]" /> Step 2: Paper Header Setup</h3>
              <p className="text-xs text-slate-500">Choose how your school name and exam instructions appear on printed A4 sheets.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'standard', name: 'Standard Board Exam', desc: 'Centered title, double border, BISE spacing.' },
                  { id: 'modern', name: 'Modern Left-Aligned', desc: 'Bold left-aligned title with compact grid.' },
                  { id: 'minimal', name: 'Minimalist Test Sheet', desc: 'Compact spacing for 15-minute tests.' },
                ].map(tpl => (
                  <div key={tpl.id} onClick={() => setHeaderTemplate(tpl.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer ${headerTemplate === tpl.id ? 'border-[#1B365D] bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="font-bold text-sm">{tpl.name}</div>
                    <p className="text-[11px] text-slate-500 mt-1">{tpl.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center py-4">
              <BookOpen className="w-12 h-12 mx-auto text-[#1B365D] opacity-80" />
              <h3 className="font-bold text-lg">Step 3: Classes and Subjects</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">Grade 1 through Grade 10 and standard Pakistani curriculum subjects will be configured automatically.</p>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold border border-emerald-200">
                ✓ {DEFAULT_SUBJECTS.length} Subjects & 10 Class Levels Ready
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Users className="w-5 h-5 text-purple-600" /> Step 4: Teachers</h3>
              <p className="text-xs text-slate-500">Review and edit your faculty roster. These names appear on papers and marking keys.</p>
              {fieldErr('teachers') && <p className="text-red-500 text-xs">{fieldErr('teachers')}</p>}
              <div className="space-y-3">
                {setupTeachers.map((t, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 p-3 border border-slate-200 rounded-xl">
                    <input value={t.name} onChange={e => setSetupTeachers(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="p-2 border rounded-lg text-sm font-bold" placeholder="Teacher name *" />
                    <input value={t.subjects} onChange={e => setSetupTeachers(prev => prev.map((x, j) => j === i ? { ...x, subjects: e.target.value } : x))}
                      className="p-2 border rounded-lg text-xs" placeholder="Subjects taught *" />
                    <input value={t.classes} onChange={e => setSetupTeachers(prev => prev.map((x, j) => j === i ? { ...x, classes: e.target.value } : x))}
                      className="p-2 border rounded-lg text-xs" placeholder="Classes (comma separated)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10" /></div>
              <h3 className="font-extrabold text-xl">Setup Complete!</h3>
              <p className="text-xs text-slate-500">Your school profile for <strong>{schoolName}</strong> is ready. Create professional A4 papers in minutes.</p>
              <div className="p-3 bg-slate-50 border rounded-xl text-[11px] flex items-center gap-2 justify-center"><ShieldCheck className="w-4 h-4 text-[#1B365D]" /> 100% Offline — No Cloud Required</div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-between">
          <button onClick={handleUseDemoData} disabled={loading} className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer">Use Demo Data</button>
          <div className="flex items-center gap-3">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer">Back</button>}
            {step < 5 ? (
              <button onClick={handleContinue} className="flex items-center gap-2 bg-[#1B365D] text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={handleFinishSetup} disabled={loading} className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                {loading ? 'Setting up...' : 'Launch Paper Generator'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
