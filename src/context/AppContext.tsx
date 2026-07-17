import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface NavigateOptions {
  paperId?: number | null;
  viewPaperId?: number | null;
  answerKeyPaperId?: number | null;
  questionId?: number;
  openEditor?: boolean;
}

interface AppContextValue {
  activeTab: string;
  editPaperId: number | null;
  viewPaperId: number | null;
  answerKeyPaperId: number | null;
  openQuestionEditor: boolean;
  editQuestionId: number | null;
  navigate: (tab: string, options?: NavigateOptions) => void;
  clearEditPaper: () => void;
  clearViewPaper: () => void;
  showToast: (message: string, type?: ToastType) => void;
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmState: (ConfirmOptions & { open: boolean }) | null;
  handleConfirm: (confirmed: boolean) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

let confirmResolver: ((value: boolean) => void) | null = null;

export function AppProvider({ children, initialTab = 'dashboard' }: { children: ReactNode; initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editPaperId, setEditPaperId] = useState<number | null>(null);
  const [viewPaperId, setViewPaperId] = useState<number | null>(null);
  const [answerKeyPaperId, setAnswerKeyPaperId] = useState<number | null>(null);
  const [openQuestionEditor, setOpenQuestionEditor] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const navigate = useCallback((tab: string, options?: NavigateOptions) => {
    setActiveTab(tab);
    if (options?.paperId !== undefined) setEditPaperId(options.paperId);
    if (options?.viewPaperId !== undefined) setViewPaperId(options.viewPaperId);
    if (options?.answerKeyPaperId !== undefined) setAnswerKeyPaperId(options.answerKeyPaperId);
    if (options?.questionId !== undefined) setEditQuestionId(options.questionId);
    if (options?.openEditor) setOpenQuestionEditor(true);
    if (tab !== 'builder' && options?.paperId === undefined) setEditPaperId(null);
    if (tab !== 'paper-details' && options?.viewPaperId === undefined) setViewPaperId(null);
    if (tab !== 'answer-key' && options?.answerKeyPaperId === undefined) setAnswerKeyPaperId(null);
    if (tab !== 'questions' && !options?.openEditor) {
      setOpenQuestionEditor(false);
      if (!options?.questionId) setEditQuestionId(null);
    }
  }, []);

  const clearEditPaper = useCallback(() => setEditPaperId(null), []);
  const clearViewPaper = useCallback(() => setViewPaperId(null), []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      confirmResolver = resolve;
      setConfirmState({ ...options, open: true });
    });
  }, []);

  const handleConfirm = useCallback((confirmed: boolean) => {
    setConfirmState(null);
    confirmResolver?.(confirmed);
    confirmResolver = null;
  }, []);

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <AppContext.Provider value={{
      activeTab, editPaperId, viewPaperId, answerKeyPaperId, openQuestionEditor, editQuestionId,
      navigate, clearEditPaper, clearViewPaper, showToast, toasts, dismissToast,
      confirm, confirmState, handleConfirm, refreshKey, triggerRefresh,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
