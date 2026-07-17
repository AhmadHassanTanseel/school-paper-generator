import type { PaperSection, SchoolConfig } from '../../types';

export interface PrintSettings {
  paperSize: string;
  margins: string;
  fontSize: number;
  showHeader: boolean;
  showFooter: boolean;
  pageNumbering: boolean;
  watermark: boolean;
  showAnswerKey: boolean;
  zoom: number;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  margins: '20mm',
  fontSize: 12,
  showHeader: true,
  showFooter: true,
  pageNumbering: true,
  watermark: false,
  showAnswerKey: false,
  zoom: 85,
};

interface PaperPreviewProps {
  school: SchoolConfig | null;
  title: string;
  classLevel: string;
  subject: string;
  testType: string;
  date: string;
  duration: string;
  targetMarks: number;
  teacherName: string;
  language: string;
  template: string;
  sections: PaperSection[];
  settings?: Partial<PrintSettings>;
  instructions?: string;
}

function isRtl(language: string) {
  return language.includes('Urdu') || language.includes('Arabic') || language === 'Mixed';
}

function mapTemplate(template: string): 'board' | 'minimal' | 'standard' {
  if (template.includes('Board') || template === 'standard') return 'board';
  if (template.includes('Minimal') || template === 'minimal') return 'minimal';
  return 'standard';
}

export default function PaperPreview({
  school, title, classLevel, subject, duration, targetMarks, language, template, sections, settings = {}, instructions,
}: PaperPreviewProps) {
  const s = { ...DEFAULT_PRINT_SETTINGS, ...settings };
  const schoolName = school?.name || 'School Name';
  const schoolAddress = school?.address || '';
  const schoolPhone = school?.phone || '';
  const layout = mapTemplate(template);
  const rtl = isRtl(language);
  const initials = schoolName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const renderQuestion = (q: { content: string; marks: number; direction?: string }, idx: number, prefix: string) => {
    const dir = q.direction === 'rtl' || rtl ? 'rtl' : 'ltr';
    return (
      <div key={`${prefix}-${idx}`} className="flex items-start justify-between gap-4 break-inside-avoid">
        <div className={`flex items-start gap-2 flex-1 text-sm leading-relaxed ${dir === 'rtl' ? 'text-right font-serif' : ''}`} dir={dir}>
          <span className="font-bold shrink-0">{prefix}{idx + 1}.</span>
          <p className="whitespace-pre-line">{q.content}</p>
        </div>
        <span className="text-xs font-bold shrink-0">({q.marks})</span>
      </div>
    );
  };

  const renderSections = (style: 'board' | 'minimal' | 'standard') => (
    <div className="space-y-6">
      {sections.map(sec => {
        const secType = sec.type || 'questions';
        return (
        <div key={sec.id} className="space-y-3 break-inside-avoid">
          {secType === 'instruction' ? (
            <p className="text-xs italic text-gray-600 bg-gray-50 p-2 border-l-4 border-teal-500">{sec.description}</p>
          ) : secType === 'pagebreak' ? (
            <div className="border-t-2 border-dashed border-gray-300 py-2 text-center text-[10px] text-gray-400 print:break-before-page">— Page Break —</div>
          ) : (
            <>
              <div className={
                style === 'board' ? 'bg-black text-white p-1.5 font-bold text-xs uppercase flex justify-between px-3' :
                style === 'minimal' ? 'border-b border-dotted border-slate-400 pb-1 font-extrabold text-xs uppercase flex justify-between' :
                'bg-gray-100 p-2 font-bold text-xs border-y border-black flex justify-between'
              }>
                <span>{sec.title}</span>
                <span>({sec.questions.reduce((sum, q) => sum + (q.marks || 0), 0)} marks)</span>
              </div>
              {sec.description && (
                <p className="text-[11px] italic text-gray-600 pl-2">
                  {sec.attempt_any ? `Attempt any ${sec.attempt_any} out of ${sec.questions.length}. ` : ''}{sec.description}
                </p>
              )}
              <div className="space-y-3 pl-2">
                {sec.questions.map((q, i) => renderQuestion(q, i, style === 'board' ? 'Q.' : ''))}
              </div>
            </>
          )}
        </div>
      );})}
    </div>
  );

  return (
    <div
      className="bg-white text-black shadow-2xl print:shadow-none transition-transform origin-top"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: s.margins === '15mm' ? '15mm' : s.margins === '25mm' ? '25mm' : '20mm',
        fontSize: `${s.fontSize}px`,
        transform: `scale(${s.zoom / 100})`,
      }}
    >
      {s.watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 text-6xl font-black rotate-[-30deg]">
          {schoolName}
        </div>
      )}

      {s.showHeader && layout === 'board' && (
        <div className="border-[3px] border-black p-4 text-center space-y-1.5 mb-6">
          <h1 className="text-lg font-extrabold uppercase tracking-widest font-sans">{schoolName}</h1>
          {schoolAddress && <p className="text-xs font-sans">{schoolAddress}{schoolPhone ? ` · ${schoolPhone}` : ''}</p>}
          <div className="text-sm font-black underline pt-1 uppercase">{title}</div>
          <div className="grid grid-cols-4 gap-2 text-xs font-bold pt-3 border-t-2 border-black mt-3 font-sans uppercase">
            <div>Class: {classLevel}</div><div>Subject: {subject}</div><div>Time: {duration}</div><div>Max: {targetMarks}</div>
          </div>
        </div>
      )}

      {s.showHeader && layout === 'minimal' && (
        <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-end justify-between font-sans">
          <div>
            <h1 className="text-base font-black uppercase">{schoolName}</h1>
            <h2 className="text-lg font-extrabold text-teal-700">{title}</h2>
          </div>
          <div className="text-right text-xs font-bold">
            <div>Class: {classLevel} | Subject: {subject}</div>
            <div>Time: {duration} | Marks: {targetMarks}</div>
          </div>
        </div>
      )}

      {s.showHeader && layout === 'standard' && (
        <div className={`text-center border-b-2 border-black pb-5 mb-6 space-y-1 ${rtl ? 'font-serif' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
          <div className="w-12 h-12 rounded-full bg-[#1B365D] text-white font-sans font-black text-base flex items-center justify-center mx-auto mb-2">{initials}</div>
          <h1 className="text-xl font-extrabold uppercase font-sans">{schoolName}</h1>
          {(schoolAddress || schoolPhone) && <p className="text-xs text-gray-600 font-sans">{schoolAddress}{schoolPhone ? ` · ${schoolPhone}` : ''}</p>}
          <h2 className="text-lg font-bold underline pt-2 font-sans">{title}</h2>
          <div className="flex justify-between text-xs font-bold pt-4 border-t border-gray-300 mt-4 px-2 font-sans">
            <span>Class: <strong>{classLevel}</strong></span>
            <span>Subject: <strong>{subject}</strong></span>
            <span>Time: <strong>{duration}</strong></span>
            <span>Marks: <strong>{targetMarks}</strong></span>
          </div>
        </div>
      )}

      {instructions && (
        <p className="text-xs italic text-gray-700 mb-4 font-sans"><strong>Instructions:</strong> {instructions}</p>
      )}

      {renderSections(layout)}

      {s.showFooter && (
        <div className="mt-16 pt-4 border-t border-gray-300 flex justify-between text-[11px] text-gray-500 font-sans">
          <span>{s.pageNumbering ? 'Page 1' : ''} · Paper Generator — School Edition</span>
          <span className="font-bold text-black">Examiner Signature: _______________</span>
        </div>
      )}
    </div>
  );
}
