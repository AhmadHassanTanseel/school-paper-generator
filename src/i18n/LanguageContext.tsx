import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'EN' | 'UR';

interface Translations {
  appTitle: string;
  appSubtitle: string;
  dashboard: string;
  questionBank: string;
  createPaper: string;
  oldPapers: string;
  facultySubjects: string;
  schoolSetup: string;
  dbConnected: string;
  dbConnecting: string;
  dbError: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  nextStepTip: string;
  langBtnText: string;
}

const dictionary: Record<Language, Translations> = {
  EN: {
    appTitle: 'Paper Generator',
    appSubtitle: 'Desktop Pilot Edition',
    dashboard: 'Dashboard',
    questionBank: 'Question Bank',
    createPaper: 'Create Paper',
    oldPapers: 'Old Papers',
    facultySubjects: 'Faculty & Subjects',
    schoolSetup: 'School Setup',
    dbConnected: 'Local Database Connected',
    dbConnecting: 'Connecting SQLite...',
    dbError: 'Database Error',
    welcomeTitle: 'Welcome to Your Workspace',
    welcomeSubtitle: 'You are currently viewing the module:',
    nextStepTip: '💡 Next Step: Navigate to Create Paper in the sidebar to assemble your saved questions into a printable exam!',
    langBtnText: 'اردو انٹرفیس (Urdu UI)',
  },
  UR: {
    appTitle: 'پیپر جنریٹر',
    appSubtitle: 'ڈیسک ٹاپ پائلٹ ایڈیشن',
    dashboard: 'ڈیش بورڈ',
    questionBank: 'سوالات کا بینک',
    createPaper: 'پیپر بنائیں',
    oldPapers: 'محفوظ پیپرز',
    facultySubjects: 'اساتذہ اور مضامین',
    schoolSetup: 'سکول سیٹ اپ',
    dbConnected: 'لوکل ڈیٹا بیس منسلک ہے',
    dbConnecting: 'ڈیٹا بیس سے رابطہ جاری...',
    dbError: 'ڈیٹا بیس کی خرابی',
    welcomeTitle: 'آپ کے ورک سپیس میں خوش آمدید',
    welcomeSubtitle: 'آپ اس وقت یہ ماڈیول دیکھ رہے ہیں:',
    nextStepTip: '💡 اگلا قدم: سائیڈ بار میں پیپر بنائیں پر کلک کریں اور اپنے محفوظ کردہ سوالات سے نیا امتحانی پیپر تیار کریں!',
    langBtnText: 'English UI (انگریزی)',
  },
};

interface LanguageContextType {
  language: Language;
  isUrdu: boolean;
  toggleLanguage: () => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('EN');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'EN' ? 'UR' : 'EN'));
  };

  const t = (key: keyof Translations): string => {
    return dictionary[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isUrdu: language === 'UR', toggleLanguage, t }}>
      <div className={language === 'UR' ? 'lang-urdu' : 'lang-english'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};