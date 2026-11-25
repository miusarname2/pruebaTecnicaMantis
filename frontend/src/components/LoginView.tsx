import React, { useState } from 'react';
import type { User } from '../types';

interface LoginViewProps {
  users: User[];
  onLogin: (user: User) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  onLogin,
  isDarkMode,
  onToggleTheme,
}) => {
  const [nameInput, setNameInput] = useState('Dana Ortiz');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const query = nameInput.trim().toLowerCase();
    if (!query) {
      setError('Please enter your name.');
      return;
    }

    // Match by full name, first name, token or account
    const matched = users.find(
      (u) =>
        u.name.toLowerCase() === query ||
        u.name.toLowerCase().includes(query) ||
        u.role.toLowerCase() === query ||
        (u.account && u.account.toLowerCase() === query)
    );

    if (matched) {
      onLogin(matched);
    } else {
      setError('User not recognized. Choose Dana Ortiz, Sam Lee, or Rita Gomez.');
    }
  };

  const handleSelectUser = (user: User) => {
    setNameInput(user.name);
    setError(null);
    onLogin(user);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-light-surface dark:bg-dark-surface text-light-on-surface dark:text-dark-on-surface font-body transition-colors duration-state-change">
      {/* Left Column: Sign In Form */}
      <div className="flex flex-col justify-between p-gutter-xl lg:p-section bg-light-surface-container-lowest dark:bg-dark-surface border-b lg:border-b-0 lg:border-r border-light-outline-variant dark:border-dark-outline-variant">
        {/* Top Bar: Brand + Theme Toggle */}
        <header className="flex items-center justify-between gap-gutter-md">
          <div className="flex items-center gap-gutter-md">
            <div className="w-9 h-9 rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined" aria-hidden="true">deployed_code</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">Site Viewer</span>
              <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider">3D Digital Twin</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle light and dark mode"
            className="min-h-[44px] inline-flex items-center gap-gutter-xs px-gutter-md py-gutter-xs rounded bg-light-surface-container-low dark:bg-dark-surface-container text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors duration-state-change"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="font-label text-label-sm">
              {isDarkMode ? 'Light' : 'Dark'}
            </span>
          </button>
        </header>

        {/* Main Form */}
        <main className="w-full max-w-md mx-auto py-section flex flex-col gap-gutter-xl">
          <div className="flex flex-col gap-gutter-xs">
            <h1 className="font-headline text-display-md-mobile lg:text-display-md text-light-on-surface dark:text-dark-on-surface">
              Sign in to workspace
            </h1>
            <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Enter your name to access your projects, 3D building models, and laser point-clouds.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-gutter-lg">
            {error && (
              <div className="p-gutter-md rounded bg-light-error-container text-light-error-text dark:bg-dark-error-container dark:text-dark-on-error-container font-body text-body-sm flex items-center gap-gutter-sm border border-light-error/20">
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Name Input */}
            <label className="flex flex-col gap-gutter-xs">
              <span className="font-label text-label-lg text-light-on-surface dark:text-dark-on-surface">
                Your Full Name
              </span>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-light-outline dark:text-dark-outline absolute left-3 pointer-events-none" aria-hidden="true">
                  person
                </span>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Dana Ortiz, Sam Lee, or Rita Gomez"
                  className="w-full min-h-[44px] pl-10 pr-gutter-md py-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface placeholder:text-light-outline dark:placeholder:text-dark-outline border border-light-outline-variant dark:border-dark-outline-variant font-body text-base focus:outline-none focus:border-light-primary dark:focus:border-dark-primary focus:ring-1 focus:ring-light-primary dark:focus:ring-dark-primary transition-colors duration-state-change"
                  autoFocus
                />
              </div>
            </label>

            {/* Quick Demo User Selector */}
            <div className="flex flex-col gap-gutter-xs">
              <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider">
                Or select active account
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter-xs">
                {users.map((u) => {
                  const isSelected = nameInput.toLowerCase() === u.name.toLowerCase();
                  return (
                    <button
                      key={u.token}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className={`min-h-[44px] text-left p-gutter-sm rounded border transition-colors duration-state-change flex flex-col ${
                        isSelected
                          ? 'bg-light-secondary-container dark:bg-dark-secondary-container border-light-secondary dark:border-dark-secondary'
                          : 'bg-light-surface-container-low dark:bg-dark-surface-container border-light-outline-variant dark:border-dark-outline-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high'
                      }`}
                    >
                      <span className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface text-sm font-semibold truncate">
                        {u.name}
                      </span>
                      <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase text-xs">
                        {u.role}{u.account ? ` · ${u.account}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-gutter-sm px-gutter-lg py-gutter-md rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary hover:bg-light-primary-container dark:hover:bg-dark-primary-container transition-colors duration-state-change font-label text-label-lg shadow-sm"
            >
              <span>Sign in to workspace</span>
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </button>
          </form>
        </main>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-gutter-md pt-gutter-lg border-t border-light-outline-variant dark:border-dark-outline-variant">
          <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">SITE VIEWER</span>
          <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">PTS1 Binary Format</span>
        </footer>
      </div>

      {/* Right Column: Architectural Drafting Preview */}
      <aside className="hidden lg:flex flex-col justify-between p-section bg-light-surface dark:bg-dark-surface-container-lowest cad-grid relative overflow-hidden">
        {/* Top Metadata Strip */}
        <div className="flex items-center justify-between gap-gutter-md">
          <div className="inline-flex items-center gap-gutter-sm px-gutter-md py-gutter-xs rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
            <span className="font-mono text-mono-sm text-light-on-surface dark:text-dark-on-surface tabular-nums">PRJ 1201-30002</span>
            <span className="text-light-outline-variant dark:text-dark-outline-variant">|</span>
            <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">77 Mill St Warehouse</span>
          </div>

          <div className="inline-flex items-center gap-gutter-xs px-gutter-sm py-gutter-xs rounded bg-success-container text-on-success-container border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            <span className="font-mono text-mono-sm uppercase tracking-wider">Delivered</span>
          </div>
        </div>

        {/* Center Isometric Architectural Diagram */}
        <div className="flex-1 flex items-center justify-center my-section">
          <svg viewBox="0 0 560 380" className="w-full max-w-lg select-none opacity-90" aria-hidden="true">
            {/* Ground Grid Lines */}
            <g className="stroke-light-outline-variant dark:stroke-dark-outline-variant" strokeWidth="0.75" opacity="0.6">
              <line x1="60" y1="260" x2="300" y2="120" />
              <line x1="140" y1="306" x2="380" y2="166" />
              <line x1="220" y1="352" x2="460" y2="212" />
              <line x1="100" y1="236" x2="340" y2="376" />
              <line x1="180" y1="190" x2="420" y2="330" />
              <line x1="260" y1="144" x2="500" y2="284" />
            </g>

            {/* Volume Main Hall */}
            <g>
              <polygon points="180,140 340,232 340,305 180,213" className="fill-light-surface-container-high dark:fill-dark-surface-container stroke-light-on-surface dark:stroke-dark-outline" strokeWidth="1.5" />
              <polygon points="340,232 500,140 500,213 340,305" className="fill-light-surface-container-lowest dark:fill-dark-surface-container-low stroke-light-on-surface dark:stroke-dark-outline" strokeWidth="1.5" />
              <polygon points="180,140 340,48 500,140 340,232" className="fill-light-surface-container-low dark:fill-dark-surface-container-high stroke-light-on-surface dark:stroke-dark-outline" strokeWidth="1.5" />
            </g>

            {/* Volume Loading Dock */}
            <g>
              <polygon points="100,210 220,280 220,330 100,260" className="fill-light-surface-container-high dark:fill-dark-surface-container stroke-light-on-surface dark:stroke-dark-outline" strokeWidth="1.2" />
              <polygon points="220,280 320,222 320,272 220,330" className="fill-light-surface-container-lowest dark:fill-dark-surface-container-low stroke-light-on-surface dark:stroke-dark-outline" strokeWidth="1.2" />
              <polygon points="100,210 200,152 320,222 220,280" className="fill-light-surface-container-low dark:fill-dark-surface-container-high stroke-light-on-surface dark:stroke-dark-outline" strokeWidth="1.2" />
            </g>
          </svg>
        </div>

        {/* Bottom Technical Readout */}
        <div className="flex items-center justify-end gap-gutter-md">
          <div className="inline-flex items-center gap-gutter-xs px-gutter-md py-gutter-xs rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
            <span className="font-mono text-mono-sm text-light-on-surface dark:text-dark-on-surface tabular-nums">N 0°</span>
            <span className="text-light-outline-variant dark:text-dark-outline-variant">|</span>
            <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">CAD Z-UP</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
