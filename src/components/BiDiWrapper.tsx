import React from 'react';

interface BiDiWrapperProps {
  language: 'ENGLISH' | 'URDU' | 'ARABIC' | 'MIXED' | string;
  children: React.ReactNode;
  className?: string;
}

export const BiDiWrapper: React.FC<BiDiWrapperProps> = ({ language, children, className = '' }) => {
  const isRTL = language === 'URDU' || language === 'ARABIC';
  
  // Apply our custom typography rules from index.css
  const fontClass = language === 'URDU' 
    ? 'font-urdu text-xl leading-relaxed' 
    : language === 'ARABIC' 
    ? 'font-arabic text-lg font-semibold leading-relaxed' 
    : 'font-sans text-sm';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`${fontClass} ${className}`}
      style={{
        // Isolate bidirectional text so LTR English words inside Urdu sentences don't break layout
        unicodeBidi: 'isolate',
        textAlign: isRTL ? 'right' : 'left'
      }}
    >
      {children}
    </div>
  );
};