import React from 'react';

interface PointCloudLoaderProps {
  isLoading: boolean;
  hasLoaded: boolean;
  progressPercent: number;
  loadedMB: string;
  totalMB: string;
  pointCount: number | null;
  errorMessage: string | null;
  onLoadCloud: () => void;
  onCancelLoad: () => void;
}

export const PointCloudLoader: React.FC<PointCloudLoaderProps> = ({
  isLoading,
  hasLoaded,
  progressPercent,
  loadedMB,
  totalMB,
  pointCount,
  errorMessage,
  onLoadCloud,
  onCancelLoad,
}) => {
  return (
    <article className="p-gutter-lg rounded-md bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-md">
      <header className="flex items-start justify-between gap-gutter-sm">
        <div className="flex flex-col gap-gutter-xs">
          <h2 className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface font-semibold">
            Point Cloud Scan
          </h2>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            {hasLoaded
              ? `${pointCount?.toLocaleString()} LiDAR points loaded`
              : 'Full building 3D laser scan (PTS1 binary)'}
          </p>
        </div>
        <span className="material-symbols-outlined text-light-primary dark:text-dark-primary" aria-hidden="true">
          grain
        </span>
      </header>

      {/* Progress Bar when loading */}
      {isLoading && (
        <div className="flex flex-col gap-gutter-xs p-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Streaming PTS1 data...
            </span>
            <span className="font-mono text-mono-sm text-light-primary dark:text-dark-primary font-bold tabular-nums">
              {loadedMB} MB {totalMB !== '0.0' ? `/ ${totalMB} MB` : ''} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded bg-light-surface-container-high dark:bg-dark-surface-container-high overflow-hidden">
            <div
              className="h-full bg-light-primary dark:bg-dark-primary progress-animated transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Honest Error Notification */}
      {errorMessage && (
        <div className="p-gutter-md rounded bg-light-error-container text-light-error-text dark:bg-dark-error-container dark:text-dark-on-error-container text-body-sm flex flex-col gap-gutter-sm border border-light-error/20">
          <div className="flex items-start gap-gutter-sm">
            <span className="material-symbols-outlined text-base mt-0.5" aria-hidden="true">error</span>
            <span className="font-body text-body-sm leading-tight">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onLoadCloud}
            className="self-start px-gutter-md py-gutter-xs rounded bg-light-error dark:bg-dark-error text-white font-label text-label-sm hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      )}

      {/* Primary Action Button */}
      <footer>
        {!isLoading && !hasLoaded && (
          <button
            type="button"
            onClick={onLoadCloud}
            className="w-full inline-flex items-center justify-center gap-gutter-sm px-gutter-lg py-gutter-sm rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary hover:bg-light-primary-container dark:hover:bg-dark-primary-container transition-colors duration-state-change font-label text-label-lg shadow-xs"
          >
            <span>Load point cloud</span>
          </button>
        )}

        {isLoading && (
          <button
            type="button"
            onClick={onCancelLoad}
            className="w-full inline-flex items-center justify-center gap-gutter-sm px-gutter-lg py-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container-high text-light-error dark:text-dark-error border border-light-error/30 dark:border-dark-error/30 hover:bg-light-error-container/20 transition-colors duration-state-change font-label text-label-lg"
          >
            <span>Cancel download</span>
          </button>
        )}

        {hasLoaded && (
          <button
            type="button"
            onClick={onLoadCloud}
            className="w-full inline-flex items-center justify-center gap-gutter-sm px-gutter-lg py-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container-high text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-highest transition-colors duration-state-change font-label text-label-lg"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">refresh</span>
            <span>Reload scan</span>
          </button>
        )}
      </footer>
    </article>
  );
};
