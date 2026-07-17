import { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Save } from 'lucide-react';
import { getPaperById, parsePaperSections, parsePaperDetails } from '../../services/paperService';
import { getDatabase } from '../../database/db';
import { useApp } from '../../context/AppContext';
import PaperPreview, { DEFAULT_PRINT_SETTINGS } from '../paper/PaperPreview';
import { getSchoolConfig } from '../../services/schoolService';
import type { PaperSection, SchoolConfig } from '../../types';

interface AnswerEntry {
  questionId: number;
  sectionTitle: string;
  questionText: string;
  marks: number;
  answer: string;
  notes: string;
}

export default function AnswerKey() {
  const { answerKeyPaperId, navigate, showToast } = useApp();
  const [school, setSchool] = useState<SchoolConfig | null>(null);
  const [sections, setSections] = useState<PaperSection[]>([]);
  const [details, setDetails] = useState<ReturnType<typeof parsePaperDetails> | null>(null);
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!answerKeyPaperId) return;
      const [paper, cfg] = await Promise.all([getPaperById(answerKeyPaperId), getSchoolConfig()]);
      if (!paper) return;
      setSchool(cfg);
      setTitle(`${paper.title} — Answer Key`);
      const secs = parsePaperSections(paper.questions_json || '[]');
      setSections(secs);
      setDetails(parsePaperDetails(paper.paper_details_json || '{}', {
        title: paper.title, classLevel: paper.class_level, subject: paper.subject_name,
        testType: paper.test_type, language: paper.language || 'English', date: paper.created_date,
        duration: paper.duration || '1 hr', targetMarks: paper.marks, chapters: paper.chapters || '',
        teacherName: paper.teacher_name, template: paper.template || 'Monthly Test',
      }));

      const db = await getDatabase();
      const stored = await db.select<{ answer_key_json: string }[]>(
        'SELECT answer_key_json FROM generated_papers WHERE id = $1;', [answerKeyPaperId]
      ).catch(() => []);
      let savedAnswers: AnswerEntry[] = [];
      try { savedAnswers = JSON.parse(stored?.[0]?.answer_key_json || '[]'); } catch {}

      const entries: AnswerEntry[] = [];
      secs.forEach(sec => {
        if (sec.type === 'instruction' || sec.type === 'pagebreak') return;
        sec.questions.forEach(q => {
          const saved = savedAnswers.find(a => a.questionId === q.id);
          entries.push({
            questionId: q.id,
            sectionTitle: sec.title,
            questionText: q.content,
            marks: q.marks,
            answer: saved?.answer || '',
            notes: saved?.notes || '',
          });
        });
      });
      setAnswers(entries);
    }
    load();
  }, [answerKeyPaperId]);

  const handleSave = async () => {
    if (!answerKeyPaperId) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      try { await db.execute('ALTER TABLE generated_papers ADD COLUMN answer_key_json TEXT;'); } catch {}
      await db.execute('UPDATE generated_papers SET answer_key_json = $1 WHERE id = $2;', [JSON.stringify(answers), answerKeyPaperId]);
      showToast('Answer key saved successfully.', 'success');
    } catch {
      showToast('Failed to save answer key.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!answerKeyPaperId || !details) {
    return (
      <div className="text-center py-20">
        <button onClick={() => navigate('history')} className="text-teal-600 font-bold text-sm">Back to Old Papers</button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('paper-details', { viewPaperId: answerKeyPaperId })} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <ArrowLeft className="w-4 h-4" /> Back to Paper
        </button>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Answer Key'}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-bold cursor-pointer">
            <Printer className="w-4 h-4" /> Print Answer Key
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-200/70 rounded-2xl p-6 flex justify-center overflow-auto max-h-[80vh] print:hidden">
          <PaperPreview school={school} {...details} sections={sections} settings={{ ...DEFAULT_PRINT_SETTINGS, showAnswerKey: false }} />
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 max-h-[80vh] overflow-y-auto">
          <h3 className="font-extrabold text-slate-800">Marking Scheme Editor</h3>
          {answers.map((a, i) => (
            <div key={a.questionId} className="border border-slate-100 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-teal-700">{a.sectionTitle}</span>
                <span className="font-bold text-slate-600">{a.marks} marks</span>
              </div>
              <p className="text-xs text-slate-700 line-clamp-2">{a.questionText}</p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Model Answer *</label>
                <textarea
                  value={a.answer}
                  onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))}
                  rows={2}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="Enter correct answer..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Teacher Notes</label>
                <input
                  value={a.notes}
                  onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="Marking notes, partial marks..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print-only answer key */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold mb-4">{title}</h1>
        {answers.map((a, i) => (
          <div key={a.questionId} className="mb-4 text-sm">
            <p><strong>Q{i + 1}.</strong> ({a.marks} marks) {a.questionText}</p>
            <p className="text-green-800"><strong>Answer:</strong> {a.answer || '—'}</p>
            {a.notes && <p className="text-gray-600 text-xs">Notes: {a.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
