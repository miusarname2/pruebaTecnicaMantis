import React from 'react';

interface LevelFilterProps {
  levels: string[];
  selectedLevel: string;
  onSelectLevel: (level: string) => void;
  spaceCountsByLevel: Record<string, number>;
  viewMode: 'massing' | 'wireframe';
  onToggleViewMode: (mode: 'massing' | 'wireframe') => void;
}

export const LevelFilter: React.FC<LevelFilterProps> = ({
  levels,
  selectedLevel,
  onSelectLevel,
  spaceCountsByLevel,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-gutter-md z-10 pointer-events-auto">
      {/* Level Filter Bar */}
      <div className="inline-flex items-center gap-gutter-xs p-gutter-xs rounded-md bg-light-surface-container-lowest/90 dark:bg-dark-surface-container-low/90 backdrop-blur-xs border border-light-outline-variant dark:border-dark-outline-variant shadow-xs">
        <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant px-gutter-sm uppercase text-xs">
          Level
        </span>
        <button
          type="button"
          onClick={() => onSelectLevel('ALL')}
          className={`px-gutter-md py-gutter-xs rounded-sm font-label text-label-sm transition-colors duration-state-change ${
            selectedLevel === 'ALL'
              ? 'bg-light-secondary dark:bg-dark-secondary text-light-on-secondary dark:text-dark-on-secondary font-semibold shadow-xs'
              : 'text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high'
          }`}
        >
          <span>All Levels</span>
        </button>
        {levels.map((lvl) => {
          const count = spaceCountsByLevel[lvl] || 0;
          const isActive = selectedLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => onSelectLevel(lvl)}
              className={`px-gutter-md py-gutter-xs rounded-sm font-label text-label-sm transition-colors duration-state-change ${
                isActive
                  ? 'bg-light-secondary dark:bg-dark-secondary text-light-on-secondary dark:text-dark-on-secondary font-semibold shadow-xs'
                  : 'text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high'
              }`}
            >
              <span>{lvl} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Render Mode Controls */}
      <div className="inline-flex items-center gap-gutter-xs p-gutter-xs rounded-md bg-light-surface-container-lowest/90 dark:bg-dark-surface-container-low/90 backdrop-blur-xs border border-light-outline-variant dark:border-dark-outline-variant shadow-xs">
        <button
          type="button"
          onClick={() => onToggleViewMode('massing')}
          className={`inline-flex items-center gap-gutter-xs px-gutter-sm py-gutter-xs rounded-sm font-label text-label-sm transition-colors duration-state-change ${
            viewMode === 'massing'
              ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high text-light-on-surface dark:text-dark-on-surface font-semibold shadow-xs'
              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">view_in_ar</span>
          <span>Massing</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleViewMode('wireframe')}
          className={`inline-flex items-center gap-gutter-xs px-gutter-sm py-gutter-xs rounded-sm font-label text-label-sm transition-colors duration-state-change ${
            viewMode === 'wireframe'
              ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high text-light-on-surface dark:text-dark-on-surface font-semibold shadow-xs'
              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">grid_4x4</span>
          <span>Wireframe</span>
        </button>
      </div>
    </div>
  );
};
