import { ShieldCheck } from 'lucide-react';

export default function BackupSecurity() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-3">
      <ShieldCheck className="w-12 h-12 mx-auto text-emerald-600 opacity-80" />
      <h2 className="text-xl font-bold text-slate-800">Offline Backup & Data Security</h2>
      <p className="text-xs text-slate-500">Export database backups (.JSON) to a USB flash drive or restore previous school records.</p>
    </div>
  );
}