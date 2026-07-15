import { useState, useEffect } from 'react';
import { 
  Search, Bell, CheckCircle2, Plus, LayoutTemplate, 
  Edit2, Copy, Star, X, Save
} from 'lucide-react';
import { getDatabase } from '../../database/db';

interface PaperTemplate {
  id: number;
  name: string;
  sections: string;
  marks: number;
  duration: string;
  language: string;
  isDefault: boolean;
}

export default function PaperTemplates() {
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSections, setFormSections] = useState('MCQs, Short, Long');
  const [formMarks, setFormMarks] = useState(50);
  const [formDuration, setFormDuration] = useState('1.5 hr');
  const [formLanguage, setFormLanguage] = useState('English');

  // Exact Figma Fallback Data
  const [templates, setTemplates] = useState<PaperTemplate[]>([
    { id: 1, name: 'Class Test', sections: 'MCQs, Short', marks: 15, duration: '40 min', language: 'English', isDefault: true },
    { id: 2, name: 'Weekly Test', sections: 'MCQs, Short, Long', marks: 20, duration: '45 min', language: 'English', isDefault: false },
    { id: 3, name: 'Monthly Test', sections: 'MCQs, Short, Long', marks: 25, duration: '1 hr', language: 'English', isDefault: false },
    { id: 4, name: 'Midterm', sections: 'MCQs, Short, Long', marks: 40, duration: '1.5 hr', language: 'English', isDefault: false },
    { id: 5, name: 'Final Exam', sections: 'MCQs, Short, Long, Essay', marks: 75, duration: '3 hr', language: 'English', isDefault: false },
    { id: 6, name: 'Board Practice', sections: 'Objective, Subjective', marks: 100, duration: '3 hr', language: 'English', isDefault: false }
  ]);

  // Load from DB (Simulated structure for real integration)
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const db = await getDatabase();
        await db.execute(`CREATE TABLE IF NOT EXISTS paper_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sections TEXT, 
          marks INTEGER, duration TEXT, language TEXT, is_default INTEGER DEFAULT 0
        );`);
        
        const res = await db.select<any[]>('SELECT * FROM paper_templates ORDER BY id ASC;');
        if (res && res.length > 0) {
          const mapped: PaperTemplate[] = res.map(t => ({
            id: t.id,
            name: t.name,
            sections: t.sections,
            marks: t.marks,
            duration: t.duration,
            language: t.language,
            isDefault: Boolean(t.is_default)
          }));
          setTemplates(mapped);
        }
      } catch (err) {
        console.error('Templates load error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleSetDefault = async (id: number) => {
    try {
      const db = await getDatabase();
      await db.execute('UPDATE paper_templates SET is_default = 0;');
      await db.execute('UPDATE paper_templates SET is_default = 1 WHERE id = $1;', [id]);
      
      setTemplates(prev => prev.map(t => ({
        ...t,
        isDefault: t.id === id
      })));
    } catch {
      // Local fallback
      setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })));
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormSections('MCQs, Short, Long');
    setFormMarks(50);
    setFormDuration('1.5 hr');
    setFormLanguage('English');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: PaperTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormSections(t.sections);
    setFormMarks(t.marks);
    setFormDuration(t.duration);
    setFormLanguage(t.language);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSections) return;

    try {
      const db = await getDatabase();
      if (editingId) {
        await db.execute(
          `UPDATE paper_templates SET name=$1, sections=$2, marks=$3, duration=$4, language=$5 WHERE id=$6;`,
          [formName, formSections, formMarks, formDuration, formLanguage, editingId]
        );
        setTemplates(prev => prev.map(t => t.id === editingId ? {
          ...t, name: formName, sections: formSections, marks: formMarks, duration: formDuration, language: formLanguage
        } : t));
      } else {
        await db.execute(
          `INSERT INTO paper_templates (name, sections, marks, duration, language, is_default) VALUES ($1, $2, $3, $4, $5, 0);`,
          [formName, formSections, formMarks, formDuration, formLanguage]
        );
        const newTemplate: PaperTemplate = {
          id: Date.now(), name: formName, sections: formSections, marks: formMarks, duration: formDuration, language: formLanguage, isDefault: false
        };
        setTemplates(prev => [...prev, newTemplate]);
      }
      setIsModalOpen(false);
    } catch {
      // Local fallback
      if (editingId) {
        setTemplates(prev => prev.map(t => t.id === editingId ? {
          ...t, name: formName, sections: formSections, marks: formMarks, duration: formDuration, language: formLanguage
        } : t));
      } else {
        setTemplates(prev => [...prev, {
          id: Date.now(), name: formName, sections: formSections, marks: formMarks, duration: formDuration, language: formLanguage, isDefault: false
        }]);
      }
      setIsModalOpen(false);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.sections.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-8 space-y-8 font-sans text-slate-800 animate-fadeIn relative">
      
      {/* 1. TOP HEADER BAR (Exact Figma Match) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <span className="text-xl font-extrabold text-slate-800 tracking-tight shrink-0">Paper Templates</span>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search papers, questions, teachers..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
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

      {/* 2. PAGE TITLE & CREATE BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Paper Templates</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Reusable structures so every paper starts formatted</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-[#1B365D] hover:bg-[#152946] text-white px-5 py-2.5 rounded-xl font-extrabold text-sm shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-white shrink-0 stroke-[3]" />
          <span>Create Template</span>
        </button>
      </div>

      {/* 3. 3-COLUMN TEMPLATES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-6 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            {/* Top Area: Icon & Default Badge */}
            <div className="flex items-start justify-between">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              
              {template.isDefault && (
                <div className="flex items-center gap-1.5 bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A] px-2.5 py-1.5 rounded-md text-[11px] font-extrabold tracking-wide uppercase">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Default</span>
                </div>
              )}
            </div>

            {/* Middle Area: Title & Metadata */}
            <div className="space-y-1.5 flex-1 pt-2">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight group-hover:text-teal-700 transition-colors">
                {template.name}
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                Sections: <span className="text-slate-600">{template.sections}</span>
              </p>
              <p className="text-sm text-slate-500 font-medium">
                {template.marks} marks · {template.duration} · {template.language}
              </p>
            </div>

            {/* Bottom Area: Actions Container */}
            <div className="flex items-center gap-2 pt-2">
              <button 
                onClick={() => handleOpenEditModal(template)}
                className="flex-1 bg-slate-50 hover:bg-[#E0F2FE] hover:text-[#0369A1] text-slate-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-transparent hover:border-[#BAE6FD]"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>

              <button 
                title="Duplicate Template"
                className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>

              {!template.isDefault && (
                <button 
                  onClick={() => handleSetDefault(template.id)}
                  title="Set as Default"
                  className="p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-[#A16207] hover:bg-[#FEF9C3] hover:border-[#FEF08A] transition-all cursor-pointer shrink-0"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ==========================================
          CUSTOM TEMPLATE MAKER MODAL
         ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col animate-scaleUp">
            
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1B365D] text-white">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">{editingId ? 'Edit Layout Template' : 'Create Custom Template'}</h3>
                  <p className="text-xs text-slate-500">Configure default paper structures.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-5 text-sm font-bold text-slate-700">
              <div className="space-y-1.5">
                <label>Template Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Science Bi-Weekly Test"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label>Paper Sections (Comma separated) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formSections}
                  onChange={(e) => setFormSections(e.target.value)}
                  placeholder="e.g. MCQs, Fill in Blanks, Long"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label>Default Marks</label>
                  <input
                    type="number"
                    value={formMarks}
                    onChange={(e) => setFormMarks(Number(e.target.value))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Default Duration</label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="e.g. 45 min"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label>Default Language Focus</label>
                <select 
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                >
                  <option value="English">English Standard</option>
                  <option value="Urdu">Urdu Nastaliq (RTL)</option>
                  <option value="Arabic">Arabic (RTL)</option>
                  <option value="Mixed">Mixed Bilingual</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1B365D] hover:bg-[#152946] text-white font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Save Layout' : 'Create Template'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}