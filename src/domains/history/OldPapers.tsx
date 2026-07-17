import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, X, Printer, Copy, Edit, FileText, Trash2, Plus, Eye
} from 'lucide-react';
import { CLASS_LEVELS, TEST_TYPES } from '../../database/db';
import { getPapers, duplicatePaper, archivePaper, updatePaperStatus } from '../../services/paperService';
import { getSchoolConfig } from '../../services/schoolService';
import { useApp } from '../../context/AppContext';
import type { GeneratedPaper } from '../../types';

interface FilterState {
  classLevel: string;
  subject: string;
  teacher: string;
  testType: string;
  session: string;
  status: string;
}

interface OldPapersProps {
  onNavigate?: (tab: string, options?: { paperId?: number | null; viewPaperId?: number | null }) => void;
}

export default function OldPapers({ onNavigate }: OldPapersProps) {
  const { showToast, confirm, triggerRefresh, refreshKey } = useApp();
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [session, setSession] = useState('All');
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filterOptions, setFilterOptions] = useState({ subjects: [] as string[], teachers: [] as string[] });

  const [filters, setFilters] = useState<FilterState>({
    classLevel: 'All', subject: 'All', teacher: 'All',
    testType: 'All', session: 'All', status: 'All',
  });

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cfg] = await Promise.all([getPapers(), getSchoolConfig()]);
      setPapers(list);
      if (cfg?.default_session) setSession(cfg.default_session);
      setFilterOptions({
        subjects: [...new Set(list.map(p => p.subject_name))].sort(),
        teachers: [...new Set(list.map(p => p.teacher_name))].sort(),
      });
    } catch {
      showToast('Failed to load papers.', 'error');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => { loadPapers(); }, [loadPapers]);

  const filteredPapers = papers.filter(p => {
    const matchClass = filters.classLevel === 'All' || p.class_level === filters.classLevel;
    const matchSub = filters.subject === 'All' || p.subject_name === filters.subject;
    const matchTeacher = filters.teacher === 'All' || p.teacher_name === filters.teacher;
    const matchType = filters.testType === 'All' || p.test_type === filters.testType;
    const matchStatus = filters.status === 'All' || p.status === filters.status;
    const query = (librarySearch || globalSearch).toLowerCase();
    const matchSearch = !query ||
      p.title.toLowerCase().includes(query) ||
      p.subject_name.toLowerCase().includes(query) ||
      p.teacher_name.toLowerCase().includes(query);
    return matchClass && matchSub && matchTeacher && matchType && matchStatus && matchSearch;
  });

  const handleClearFilters = () => {
    setFilters({ classLevel: 'All', subject: 'All', teacher: 'All', testType: 'All', session: 'All', status: 'All' });
    setLibrarySearch('');
    setGlobalSearch('');
  };

  const handleOpen = (id: number) => onNavigate?.('paper-details', { viewPaperId: id });

  const handleEdit = (id: number) => onNavigate?.('builder', { paperId: id });

  const handlePrint = async (paper: GeneratedPaper) => {
    await updatePaperStatus(paper.id, 'Printed');
    onNavigate?.('paper-details', { viewPaperId: paper.id });
    showToast('Opening print preview...', 'info');
    setTimeout(() => window.print(), 800);
  };

  const handleDuplicate = async (id: number) => {
    try {
      const newId = await duplicatePaper(id);
      triggerRefresh();
      showToast('Paper duplicated as draft.', 'success');
      onNavigate?.('builder', { paperId: newId });
    } catch {
      showToast('Failed to duplicate paper.', 'error');
    }
  };

  const handleArchive = async (id: number, title: string) => {
    const ok = await confirm({
      title: 'Archive Paper?',
      message: `Archive "${title}"? It will be removed from the active library.`,
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) return;
    await archivePaper(id);
    setPapers(prev => prev.filter(p => p.id !== id));
    triggerRefresh();
    showToast('Paper archived.', 'success');
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-8 space-y-8 font-sans text-slate-800 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <span className="text-xl font-extrabold text-slate-800 tracking-tight shrink-0">Old Papers</span>
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input type="text" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search papers, questions, teachers..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 sticky top-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <h3 className="font-extrabold text-slate-800 text-sm">Filters</h3>
          </div>
          <div className="space-y-3.5 text-xs font-bold text-slate-700">
            {[
              { key: 'classLevel' as const, label: 'Class', opts: ['All', ...CLASS_LEVELS] },
              { key: 'subject' as const, label: 'Subject', opts: ['All', ...filterOptions.subjects] },
              { key: 'teacher' as const, label: 'Teacher', opts: ['All', ...filterOptions.teachers] },
              { key: 'testType' as const, label: 'Test Type', opts: ['All', ...TEST_TYPES] },
              { key: 'status' as const, label: 'Status', opts: ['All', 'Draft', 'Final', 'Printed'] },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-slate-500 font-semibold block">{f.label}</label>
                <select value={filters[f.key]} onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold block">Session</label>
              <select value={filters.session} onChange={e => setFilters(prev => ({ ...prev, session: e.target.value }))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                <option value="All">All</option>
                <option value={session}>{session}</option>
              </select>
            </div>
            <button onClick={handleClearFilters} className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          </div>
        </div>

        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Old Papers Library</h2>
              <p className="text-xs text-slate-500 mt-0.5">Reuse and reprint your past papers</p>
            </div>
            <button onClick={() => onNavigate?.('builder')} className="inline-flex items-center gap-2 bg-[#1B365D] hover:bg-[#152946] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs cursor-pointer">
              <FileText className="w-4 h-4" /> New Paper
            </button>
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input type="text" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Search papers..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs font-extrabold uppercase">
                  <th className="pb-3 pr-4">Paper</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Marks</th>
                  <th className="pb-3 px-3">Teacher</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Modified</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading papers...</td></tr>
                ) : filteredPapers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="font-bold text-slate-600">No past papers found</p>
                      <p className="text-slate-400 mt-1">Create your first paper to see it here.</p>
                      <button onClick={() => onNavigate?.('builder')} className="mt-4 inline-flex items-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-xl font-bold cursor-pointer">
                        <Plus className="w-4 h-4" /> Create First Paper
                      </button>
                    </td>
                  </tr>
                ) : filteredPapers.map(paper => (
                  <tr key={paper.id} className="hover:bg-slate-50/70 group">
                    <td className="py-4 pr-4 max-w-[240px]">
                      <button onClick={() => handleOpen(paper.id)} className="text-left">
                        <div className="font-extrabold text-slate-800 text-sm group-hover:text-teal-600 truncate">{paper.title}</div>
                        <div className="text-[11px] text-slate-400">{paper.class_level} · {paper.subject_name} · {paper.created_date}</div>
                      </button>
                    </td>
                    <td className="py-4 px-3"><span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">{paper.test_type}</span></td>
                    <td className="py-4 px-3 font-extrabold">{paper.marks}</td>
                    <td className="py-4 px-3 text-slate-600">{paper.teacher_name}</td>
                    <td className="py-4 px-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${paper.status === 'Printed' ? 'bg-emerald-100 text-emerald-700' : paper.status === 'Final' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{paper.status}</span>
                    </td>
                    <td className="py-4 px-3 text-slate-500">{paper.modified_date}</td>
                    <td className="py-4 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpen(paper.id)} title="Open" className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handlePrint(paper)} title="Print Again" className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => handleDuplicate(paper.id)} title="Duplicate" className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => handleEdit(paper.id)} title="Edit" className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleArchive(paper.id, paper.title)} title="Archive" className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
