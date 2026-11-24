import React from 'react';
import type { Space } from '../types';

interface SpaceInspectorProps {
  space: Space | null;
  unit: 'm2' | 'ft2';
  onToggleUnit: () => void;
  onOpenReportIssue: (space: Space) => void;
  onClose: () => void;
}

export const SpaceInspector: React.FC<SpaceInspectorProps> = ({
  space,
  unit,
  onToggleUnit,
  onOpenReportIssue,
  onClose,
}) => {
  if (!space) {
    return (
      <section className="p-gutter-lg rounded-md border border-dashed border-light-outline-variant dark:border-dark-outline-variant flex flex-col items-center text-center gap-gutter-sm">
        <span className="material-symbols-outlined text-light-outline dark:text-dark-outline text-3xl" aria-hidden="true">
          deployed_code
        </span>
        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
          Select any 3D room volume in the viewport to inspect its area and structural specifications.
        </p>
      </section>
    );
  }

  const areaM2 = space.w * space.d;
  const areaFt2 = areaM2 * 10.7639;
  const displayArea = unit === 'm2' ? `${areaM2.toFixed(1)} m²` : `${areaFt2.toFixed(1)} ft²`;

  return (
    <section className="p-gutter-lg rounded-md bg-light-surface-container-low dark:bg-dark-surface-container border border-light-primary dark:border-dark-primary flex flex-col gap-gutter-md shadow-xs transition-all duration-state-change">
      <div className="flex items-center justify-between gap-gutter-sm">
        <div className="flex items-center gap-gutter-sm">
          <span className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface font-semibold">
            {space.name}
          </span>
          <span className="font-mono text-mono-sm text-light-primary dark:text-dark-primary uppercase font-bold text-xs">
            {space.level}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Clear selection"
          className="min-w-[44px] min-h-[44px] -mr-2 inline-flex items-center justify-center rounded text-light-outline dark:text-dark-outline hover:text-light-on-surface dark:hover:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-gutter-sm text-left">
        <div>
          <span className="block font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Floor Area</span>
          <div className="flex items-center gap-gutter-xs mt-0.5">
            <span className="font-mono text-mono-sm text-light-on-surface dark:text-dark-on-surface font-bold tabular-nums text-sm">
              {displayArea}
            </span>
            <button
              type="button"
              onClick={onToggleUnit}
              className="min-w-[44px] min-h-[44px] px-2 inline-flex items-center justify-center rounded text-xs font-mono text-light-secondary dark:text-dark-secondary underline hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high cursor-pointer transition-colors"
              title="Toggle m² and ft²"
            >
              ({unit === 'm2' ? 'ft²' : 'm²'})
            </button>
          </div>
        </div>

        <div>
          <span className="block font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Clear Height</span>
          <span className="font-mono text-mono-sm text-light-on-surface dark:text-dark-on-surface tabular-nums">
            {space.h} m
          </span>
        </div>

        <div>
          <span className="block font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Primary Use</span>
          <span className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface font-medium">
            {space.use}
          </span>
        </div>

        <div>
          <span className="block font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Dimensions</span>
          <span className="font-mono text-mono-sm text-light-on-surface dark:text-dark-on-surface tabular-nums">
            {space.w}m × {space.d}m
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpenReportIssue(space)}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-gutter-sm px-gutter-md py-gutter-xs rounded bg-light-surface-container-lowest dark:bg-dark-surface-container-high text-light-primary dark:text-dark-primary border border-light-primary/30 dark:border-dark-primary/30 hover:bg-light-primary/10 transition-colors font-label text-label-sm"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">flag</span>
        <span>Report issue in {space.name}</span>
      </button>
    </section>
  );
};
