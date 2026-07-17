import { useState, useEffect } from 'react';
import {
  Printer, Download, Edit, Copy, Archive,
  ArrowLeft, Key, Clock, CheckCircle2
} from 'lucide-react';
import { getPaperById, duplicatePaper, archivePaper, updatePaperStatus } from '../../services/paperService';
import { getSchoolConfig } from '../../services/schoolService';
import { useApp } from '../../context/AppContext';
import PaperPreview, { DEFAULT_PRINT_SETTINGS } from '../paper/PaperPreview';
import { parsePaperSections, parsePaperDetails } from '../../services/paperService';
import type { GeneratedPaper, PaperSection, SchoolConfig } from '../../types';

export default function PaperDetails() {
  const { viewPaperId, navigate, showToast, confirm, triggerRefresh } = useApp();
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [school, setSchool] = useState<SchoolConfig | null>(null);
  const [sections, setSections] = useState<PaperSection[]>([]);
  const [details, setDetails] = useState<ReturnType<typeof parsePaperDetails> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!viewPaperId) return;
      setLoading(true);
      try {
        const [p, cfg] = await Promise.all([getPaperById(viewPaperId), getSchoolConfig()]);
        if (!p) { showToast('Paper not found.', 'error'); navigate('history'); return; }
        setPaper(p);
        setSchool(cfg);
        setSections(parsePaperSections(p.questions_json || '[]'));
        setDetails(parsePaperDetails(p.paper_details_json || '{}', {
          title: p.title, classLevel: p.class_level, subject: p.subject_name,
          testType: p.test_type, language: p.language || 'English', date: p.created_date,
          duration: p.duration || '1 hr', targetMarks: p.marks, chapters: p.chapters || '',
          teacherName: p.teacher_name, template: p.template || 'Monthly Test',
        }));
      } catch {
        showToast('Failed to load paper.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [viewPaperId]);

  if (!viewPaperId) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>No paper selected.</p>
        <button onClick={() => navigate('history')} className="mt-4 text-teal-600 font-bold text-sm underline">Back to Old Papers</button>
      </div>
    );
  }

  if (loading || !paper || !details) {
    return <div className="flex justify-center py-20 text-slate-500">Loading paper details...</div>;
  }

  const versionHistory = [
    { label: 'Draft created', date: paper.created_date, done: true },
    { label: 'Finalized', date: paper.status === 'Final' || paper.status === 'Printed' ? paper.modified_date : '—', done: paper.status !== 'Draft' },
    { label: 'Printed', date: paper.status === 'Printed' ? paper.modified_date : '—', done: paper.status === 'Printed' },
    { label: 'Revised', date: paper.modified_date !== paper.created_date ? paper.modified_date : '—', done: paper.modified_date !== paper.created_date },
  ];

  const handlePrint = async () => {
    await updatePaperStatus(paper.id, 'Printed');
    showToast('Opening print preview...', 'info');
    setTimeout(() => window.print(), 300);
  };

  const handleDuplicate = async () => {
    try {
      const newId = await duplicatePaper(paper.id);
      triggerRefresh();
      showToast('Paper duplicated as draft.', 'success');
      navigate('builder', { paperId: newId });
    } catch {
      showToast('Failed to duplicate paper.', 'error');
    }
  };

  const handleArchive = async () => {
    const ok = await confirm({ title: 'Archive Paper?', message: 'This paper will be moved to archives.', confirmLabel: 'Archive', destructive: true });
    if (!ok) return;
    await archivePaper(paper.id);
    triggerRefresh();
    showToast('Paper archived.', 'success');
    navigate('history');
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] space-y-6 animate-fadeIn print:bg-white">
      <button onClick={() => navigate('history')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 print:hidden">
        <ArrowLeft className="w-4 h-4" /> Back to Old Papers
      </button>

      {/* Metadata */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-800">{paper.title}</h1>
            <p className="text-sm text-slate-500">{paper.class_level} · {paper.subject_name} · {paper.test_type} · {paper.marks} marks</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 font-bold text-slate-600">Teacher: {paper.teacher_name}</span>
              <span className={`px-2.5 py-1 rounded-md font-bold ${paper.status === 'Printed' ? 'bg-emerald-100 text-emerald-700' : paper.status === 'Final' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{paper.status}</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Modified {paper.modified_date}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Preview */}
        <div className="lg:col-span-8 bg-slate-200/70 rounded-2xl p-8 flex justify-center overflow-auto print:p-0 print:bg-white">
          <PaperPreview
            school={school}
            title={details.title}
            classLevel={details.classLevel}
            subject={details.subject}
            testType={details.testType}
            date={details.date}
            duration={details.duration}
            targetMarks={details.targetMarks}
            teacherName={details.teacherName}
            language={details.language}
            template={details.template}
            sections={sections}
            settings={DEFAULT_PRINT_SETTINGS}
          />
        </div>

        {/* Actions */}
        <div className="lg:col-span-4 space-y-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
            <h3 className="font-extrabold text-slate-800 text-sm mb-3">Actions</h3>
            {[
              { label: 'Edit Paper', icon: Edit, action: () => navigate('builder', { paperId: paper.id }) },
              { label: 'Duplicate Paper', icon: Copy, action: handleDuplicate },
              { label: 'Print', icon: Printer, action: handlePrint },
              { label: 'Save PDF', icon: Download, action: handlePrint },
              { label: 'Create Answer Key', icon: Key, action: () => navigate('answer-key', { answerKeyPaperId: paper.id }) },
              { label: 'Archive', icon: Archive, action: handleArchive, danger: true },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${btn.danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                <btn.icon className="w-4 h-4" /> {btn.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Version History</h3>
            {versionHistory.map((v, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${v.done ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div>
                  <span className="font-bold text-slate-700">{v.label}</span>
                  <span className="text-slate-400 block">{v.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
