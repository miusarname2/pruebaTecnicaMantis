import React from 'react';
import type { ProjectDetail } from '../types';

interface ProjectInfoCardProps {
  project: ProjectDetail;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not recorded';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const ProjectInfoCard: React.FC<ProjectInfoCardProps> = ({ project }) => {
  const isDelivered = project.status.toLowerCase() === 'delivered';
  const isInProduction = project.status.toLowerCase().includes('production');

  return (
    <div className="flex flex-col gap-gutter-lg pb-gutter-lg border-b border-light-outline-variant dark:border-dark-outline-variant">
      {/* Project Identity & Status */}
      <section className="flex flex-col gap-gutter-sm">
        <div className="flex items-start justify-between gap-gutter-sm">
          <div className="flex flex-col gap-gutter-xs">
            <h1 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface leading-tight">
              {project.name}
            </h1>
            <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              {project.address}
            </span>
          </div>

          {/* Status Badge */}
          <span
            role="status"
            className={`inline-flex items-center px-gutter-sm py-gutter-xs rounded font-mono text-mono-sm uppercase tracking-wider shrink-0 border ${
              isDelivered
                ? 'bg-success-container text-on-success-container border-success/30'
                : isInProduction
                ? 'bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container border-light-secondary/30'
                : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800'
            }`}
          >
            {project.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-gutter-md pt-gutter-xs">
          <div className="flex flex-col gap-gutter-xs">
            <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase">
              Client
            </span>
            <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface font-medium">
              {project.clientName}
            </span>
          </div>
          <div className="flex flex-col gap-gutter-xs">
            <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase">
              Levels
            </span>
            <span className="font-mono text-mono-sm text-light-on-surface dark:text-dark-on-surface">
              {project.levels.join(' · ')}
            </span>
          </div>
        </div>
      </section>

      {/* Milestone Dates */}
      <section className="flex flex-col gap-gutter-sm">
        <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase">
          Milestone dates
        </span>
        <div className="grid grid-cols-2 gap-gutter-md p-gutter-md rounded bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
          <div className="flex flex-col">
            <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Signed</span>
            <span className={`font-mono text-mono-sm tabular-nums ${!project.dates.signed ? 'text-light-outline dark:text-dark-outline italic' : 'text-light-on-surface dark:text-dark-on-surface'}`}>
              {formatDate(project.dates.signed)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Scan</span>
            <span className={`font-mono text-mono-sm tabular-nums ${!project.dates.scan ? 'text-light-outline dark:text-dark-outline italic' : 'text-light-on-surface dark:text-dark-on-surface'}`}>
              {formatDate(project.dates.scan)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Est. Delivery</span>
            <span className={`font-mono text-mono-sm tabular-nums ${!project.dates.estimatedDelivery ? 'text-light-outline dark:text-dark-outline italic' : 'text-light-on-surface dark:text-dark-on-surface'}`}>
              {formatDate(project.dates.estimatedDelivery)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">Delivered</span>
            <span className={`font-mono text-mono-sm tabular-nums ${project.dates.delivered ? 'text-success font-semibold' : 'text-light-outline dark:text-dark-outline italic'}`}>
              {formatDate(project.dates.delivered)}
            </span>
          </div>
        </div>
      </section>

      {/* Primary Contact */}
      {project.contacts && project.contacts.length > 0 && (
        <section className="flex flex-col gap-gutter-sm">
          <span className="font-label text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase">
            Primary contact
          </span>
          <div className="flex flex-col gap-gutter-xs p-gutter-md rounded bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
            {project.contacts.map((c, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-gutter-sm">
                <div className="flex flex-col">
                  <span className="font-title text-title-md text-light-on-surface dark:text-dark-on-surface font-semibold">
                    {c.name}
                  </span>
                  {c.email && (
                    <span className="font-mono text-mono-sm text-light-secondary dark:text-dark-secondary">
                      {c.email}
                    </span>
                  )}
                </div>
                {c.phone && (
                  <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    {c.phone}
                  </span>
                )}
                {!c.email && !c.phone && (
                  <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant uppercase text-xs">
                    ({c.role})
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
