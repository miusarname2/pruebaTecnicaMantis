import React from 'react';
import type { User, ProjectSummary } from '../types';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  isLoadingProjects: boolean;
  isDarkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  projects,
  selectedProjectId,
  onSelectProject,
  isLoadingProjects,
  isDarkMode,
  onToggleTheme,
}) => {
  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="bg-light-surface-container-lowest dark:bg-dark-surface-container-low border-b border-light-outline-variant dark:border-dark-outline-variant px-gutter-lg py-gutter-sm flex flex-wrap items-center justify-between gap-gutter-md z-20 shrink-0">
      {/* Left: Brand + Project Switcher */}
      <div className="flex items-center gap-gutter-lg">
        <div className="flex items-center gap-gutter-sm">
          <div className="w-8 h-8 rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">deployed_code</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">Site Viewer</span>
            <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase tracking-wider text-xs">3D Digital Twin</span>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-light-outline-variant dark:bg-dark-outline-variant"></div>

        {/* Project Selector */}
        <label className="flex items-center gap-gutter-sm">
          <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase hidden md:inline">
            Project
          </span>
          <select
            aria-label="Select project"
            value={selectedProjectId || ''}
            disabled={isLoadingProjects || projects.length === 0}
            onChange={(e) => onSelectProject(e.target.value)}
            className="min-h-[44px] rounded bg-light-surface-container-low dark:bg-dark-surface-container text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-base py-gutter-xs pl-gutter-md pr-8 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary focus:ring-1 focus:ring-light-primary dark:focus:ring-dark-primary cursor-pointer transition-colors duration-state-change"
          >
            {isLoadingProjects ? (
              <option value="">Loading projects...</option>
            ) : projects.length === 0 ? (
              <option value="">No projects available</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {/* Right: Theme Toggle + User Role + Sign Out */}
      <div className="flex items-center gap-gutter-sm">
        {/* Light / Dark Mode Switch */}
        <div className="inline-flex items-center rounded bg-light-surface-container-low dark:bg-dark-surface-container p-0.5 border border-light-outline-variant dark:border-dark-outline-variant" role="group" aria-label="Theme mode">
          <button
            type="button"
            onClick={() => onToggleTheme(false)}
            className={`min-h-[44px] inline-flex items-center gap-gutter-xs px-gutter-md py-gutter-xs rounded-sm font-label text-label-sm transition-colors duration-state-change ${
              !isDarkMode
                ? 'bg-light-surface-container-lowest text-light-on-surface shadow-xs'
                : 'bg-transparent text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-dark-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">light_mode</span>
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleTheme(true)}
            className={`min-h-[44px] inline-flex items-center gap-gutter-xs px-gutter-md py-gutter-xs rounded-sm font-label text-label-sm transition-colors duration-state-change ${
              isDarkMode
                ? 'bg-dark-surface-container-high text-dark-on-surface shadow-xs'
                : 'bg-transparent text-light-on-surface-variant hover:text-light-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">dark_mode</span>
            <span>Dark</span>
          </button>
        </div>

        {/* User / Role Badge */}
        <div className="flex items-center gap-gutter-sm px-gutter-md py-gutter-xs rounded bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
          <span className="w-6 h-6 rounded-sm bg-light-secondary dark:bg-dark-secondary text-light-on-secondary dark:text-dark-on-secondary font-mono text-mono-sm flex items-center justify-center font-bold text-xs">
            {initials}
          </span>
          <span className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface font-medium hidden sm:inline">
            {currentUser.name}
          </span>
          <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-xs">
            {currentUser.role.toUpperCase()}
          </span>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out of workspace"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded bg-light-surface-container-lowest dark:bg-dark-surface-container text-light-on-surface-variant dark:text-dark-on-surface-variant border border-light-outline-variant dark:border-dark-outline-variant hover:text-light-primary dark:hover:text-dark-primary hover:border-light-primary dark:hover:border-dark-primary transition-colors duration-state-change"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">logout</span>
        </button>
      </div>
    </header>
  );
};
