import { useState, useEffect } from 'react';
import { BookOpen, Trash2, CheckCircle2, AlertCircle, RefreshCw, FolderTree, GraduationCap } from 'lucide-react';
import { getDatabase } from '../../database/db';
import { useLanguage } from '../../i18n/LanguageContext';

interface Subject { id: number; name: string; code: string; }
interface Chapter { id: number; subject_id: number; class_level: string; title: string; chapter_number: number; }

export default function CurriculumManager() {
  const { isUrdu } = useLanguage();
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'chapters'>('classes');
  const [loading, setLoading] = useState(true);
  
  // State lists
  const [classes] = useState([
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
  ]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  // Form input states
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [selectedClassForChap, setSelectedClassForChap] = useState('Grade 9');
  const [selectedSubForChap, setSelectedSubForChap] = useState('');
  const [newChapTitle, setNewChapTitle] = useState('');
  const [newChapNum, setNewChapNum] = useState('');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      await db.execute(`CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY, name TEXT, code TEXT);`);
      await db.execute(`CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY, subject_id INTEGER, class_level TEXT, title TEXT, chapter_number INTEGER
      );`);

      const sList = await db.select<Subject[]>('SELECT * FROM subjects ORDER BY name ASC;');
      setSubjects(sList || []);
      if (sList && sList.length > 0 && !selectedSubForChap) {
        setSelectedSubForChap(sList[0].id.toString());
      }

      const cList = await db.select<Chapter[]>('SELECT * FROM chapters ORDER BY class_level, chapter_number ASC;');
      setChapters(cList || []);
    } catch (err) {
      console.error('Curriculum load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName) return;
    try {
      const db = await getDatabase();
      await db.execute(
        `INSERT INTO subjects (name, code) VALUES ($1, $2);`, 
        [newSubName, newSubCode || newSubName.slice(0, 3).toUpperCase()]
      );
      setNewSubName(''); 
      setNewSubCode('');
      fetchCurriculum();
      setMessage({ text: 'New subject added to curriculum!', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to add subject.', type: 'error' });
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapTitle || !selectedSubForChap) return;
    try {
      const db = await getDatabase();
      await db.execute(
        `INSERT INTO chapters (subject_id, class_level, title, chapter_number) VALUES ($1, $2, $3, $4);`,
        [parseInt(selectedSubForChap), selectedClassForChap, newChapTitle, parseInt(newChapNum) || 1]
      );
      setNewChapTitle(''); 
      setNewChapNum('');
      fetchCurriculum();
      setMessage({ text: 'Chapter linked to class and subject successfully!', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to add chapter.', type: 'error' });
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    const db = await getDatabase();
    await db.execute('DELETE FROM subjects WHERE id = $1;', [id]);
    fetchCurriculum();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> 
        <span>Loading curriculum hierarchy...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans">
      
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Screen Header & 3 Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">
                {isUrdu ? 'کلاسز اور مضامین (Curriculum Structure)' : 'Classes & Subjects Academic Structure'}
              </h2>
              <p className="text-xs text-slate-400">Manage grade levels, core curriculum courses, and linked chapter topics.</p>
            </div>
          </div>
        </div>

        {/* 3 Interactive Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { id: 'classes', label: '1. Class Levels (Grade 1–10)', icon: GraduationCap, count: classes.length },
            { id: 'subjects', label: '2. Curriculum Subjects', icon: BookOpen, count: subjects.length },
            { id: 'chapters', label: '3. Linked Chapters & Topics', icon: FolderTree, count: chapters.length }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CLASSES (Grade 1 to Grade 10) */}
      {activeTab === 'classes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn">
          <h3 className="font-bold text-slate-800 text-base border-b pb-3 flex items-center justify-between">
            <span>Configured Grade Levels</span>
            <span className="text-xs font-normal text-slate-400">Standard Pakistani School Tier</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {classes.map((c, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-400 transition-colors">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Level {idx + 1}</span>
                <span className="font-extrabold text-slate-800 text-sm">{c}</span>
                <span className="text-[10px] text-emerald-600 font-medium">Active Tier ✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECTS (Mathematics, English, Urdu, Physics, etc.) */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Add New Curriculum Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-3.5 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label>Subject Name *</label>
                <input 
                  type="text" 
                  required 
                  value={newSubName} 
                  onChange={(e) => setNewSubName(e.target.value)} 
                  placeholder="e.g. Computer Science" 
                  className="w-full p-2.5 border rounded-xl" 
                />
              </div>
              <div className="space-y-1">
                <label>Course Code</label>
                <input 
                  type="text" 
                  value={newSubCode} 
                  onChange={(e) => setNewSubCode(e.target.value)} 
                  placeholder="e.g. CSC-09" 
                  className="w-full p-2.5 border rounded-xl uppercase" 
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm cursor-pointer transition-all"
              >
                + Register Subject
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Active Subjects Directory ({subjects.length})</h3>
            <div className="divide-y divide-slate-100">
              {subjects.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100">
                      {s.code || 'SUB'}
                    </span>
                    <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{s.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteSubject(s.id)} 
                    className="text-slate-300 hover:text-red-600 p-1.5 rounded transition-colors cursor-pointer"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHAPTERS LINKED TO CLASS + SUBJECT */}
      {activeTab === 'chapters' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Link Chapter / Topic</h3>
            <form onSubmit={handleAddChapter} className="space-y-3.5 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label>Class Tier *</label>
                <select 
                  value={selectedClassForChap} 
                  onChange={(e) => setSelectedClassForChap(e.target.value)} 
                  className="w-full p-2.5 border rounded-xl bg-white"
                >
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label>Subject *</label>
                <select 
                  value={selectedSubForChap} 
                  onChange={(e) => setSelectedSubForChap(e.target.value)} 
                  className="w-full p-2.5 border rounded-xl bg-white"
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <label>Ch #</label>
                  <input 
                    type="number" 
                    value={newChapNum} 
                    onChange={(e) => setNewChapNum(e.target.value)} 
                    placeholder="1" 
                    className="w-full p-2.5 border rounded-xl text-center font-bold" 
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label>Chapter Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={newChapTitle} 
                    onChange={(e) => setNewChapTitle(e.target.value)} 
                    placeholder="e.g. Kinematics" 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm cursor-pointer transition-all"
              >
                + Link Chapter
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Mapped Chapters & Syllabus Hierarchy ({chapters.length})</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {chapters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No chapters mapped yet. Link your first syllabus topic above!</div>
              ) : (
                chapters.map((c) => {
                  const subName = subjects.find(s => s.id === c.subject_id)?.name || 'General';
                  return (
                    <div key={c.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[11px]">Ch {c.chapter_number}</span>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{c.title}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{c.class_level} • <span className="text-slate-600">{subName}</span></div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">Mapped</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}