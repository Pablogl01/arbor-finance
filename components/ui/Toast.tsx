'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let fadeOutId: NodeJS.Timeout;

    if (isVisible) {
      setIsShowing(true);
      // Automatically hide after duration
      timeoutId = setTimeout(() => {
        setIsShowing(false);
        fadeOutId = setTimeout(onClose, 300); // Wait for transition to finish before unmounting
      }, duration);
    } else {
      setIsShowing(false);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(fadeOutId);
    };
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-arbor-border/50 bg-white px-4 py-3 shadow-xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isShowing ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-arbor-mint text-arbor-darkmint">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-arbor-text">{message}</p>
      <button
        onClick={() => {
          setIsShowing(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 rounded-full p-1 text-arbor-textmuted hover:bg-slate-100 hover:text-arbor-text transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
