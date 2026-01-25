'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // Debug: Check initial state
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    setDebugInfo(`Standalone: ${isStandalone}, iOS: ${isIOS}`);
    console.log('[INSTALL_PROMPT] Debug Info:', { isStandalone, isIOS, userAgent: navigator.userAgent });

    const handler = (e: Event) => {
      console.log('[INSTALL_PROMPT] beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (isStandalone) {
      console.log('[INSTALL_PROMPT] App is already installed (standalone mode)');
      setIsInstallable(false);
    } else {
      console.log('[INSTALL_PROMPT] App is not installed, waiting for beforeinstallprompt...');
      // TEMPORARY: Show button always for testing
      console.log('[INSTALL_PROMPT] Showing button for testing (remove in production)');
      setIsInstallable(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('[INSTALL_PROMPT] No deferred prompt - might be iOS');
      alert('iOS: Tippe auf das Teilen-Symbol und wähle "Zum Home-Bildschirm"');
      return;
    }

    console.log('[INSTALL_PROMPT] Showing install prompt');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[INSTALL_PROMPT] User choice:', outcome);
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!isInstallable) {
    console.log('[INSTALL_PROMPT] Button hidden -', debugInfo);
    return null;
  }

  console.log('[INSTALL_PROMPT] Button visible -', debugInfo);

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
      aria-label="App installieren"
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" 
        />
      </svg>
      <span className="hidden sm:inline">App installieren</span>
    </button>
  );
}
