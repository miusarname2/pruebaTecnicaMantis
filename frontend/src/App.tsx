import { useState, useEffect, useRef, useCallback } from 'react';
import type { User, ProjectSummary, ProjectDetail, Space, CloudWorkerMessage } from './types';
import { api, ApiError } from './api/client';
import { ViewerScene } from './three/ViewerScene';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { ProjectInfoCard } from './components/ProjectInfoCard';
import { SpaceInspector } from './components/SpaceInspector';
import { PointCloudLoader } from './components/PointCloudLoader';
import { LevelFilter } from './components/LevelFilter';
import { IssueModal } from './components/IssueModal';

const USERS: User[] = [
  { token: 'staff-token', name: 'Dana Ortiz', role: 'staff' },
  { token: 'acme-token', name: 'Sam Lee', role: 'client', account: 'acme' },
  { token: 'brick-token', name: 'Rita Gomez', role: 'client', account: 'brick' },
];

export default function App() {
  // ── Authentication & Theme ──────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sv-theme') === 'dark';
    } catch {
      return false;
    }
  });

  // ── Projects State ──────────────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // ── 3D & Selection State ────────────────────────────────────────────
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'massing' | 'wireframe'>('massing');
  const [unit, setUnit] = useState<'m2' | 'ft2'>('m2');

  // ── Point Cloud State ───────────────────────────────────────────────
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [hasCloudLoaded, setHasCloudLoaded] = useState(false);
  const [cloudProgressPercent, setCloudProgressPercent] = useState(0);
  const [cloudLoadedMB, setCloudLoadedMB] = useState('0.0');
  const [cloudTotalMB, setCloudTotalMB] = useState('0.0');
  const [cloudPointCount, setCloudPointCount] = useState<number | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // ── Issue Modal State ───────────────────────────────────────────────
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // ── Three.js & Worker Refs ──────────────────────────────────────────
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // ── Theme Management ────────────────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    try {
      localStorage.setItem('sv-theme', isDarkMode ? 'dark' : 'light');
    } catch {}
    sceneRef.current?.setTheme(isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = (dark?: boolean) => {
    setIsDarkMode((prev) => (typeof dark === 'boolean' ? dark : !prev));
  };

  // ── Cancel any running point cloud worker ───────────────────────────
  const cancelCloudLoad = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsCloudLoading(false);
    setCloudProgressPercent(0);
  }, []);

  // ── Initialize Three.js scene when logged in ────────────────────────
  useEffect(() => {
    if (!currentUser || !mountRef.current) return;

    const scene = new ViewerScene(mountRef.current, (space) => {
      setSelectedSpace(space);
    });
    scene.setTheme(isDarkMode);
    scene.setViewMode(viewMode);
    sceneRef.current = scene;

    const resizeObserver = new ResizeObserver(() => {
      scene.resize();
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      resizeObserver.disconnect();
      cancelCloudLoad();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [currentUser, cancelCloudLoad]);

  // ── Fetch projects whenever current user changes ────────────────────
  const loadProjects = useCallback(async (user: User) => {
    setIsLoadingProjects(true);
    setAppError(null);
    cancelCloudLoad();
    sceneRef.current?.clearPointCloud();
    setHasCloudLoaded(false);
    setCloudPointCount(null);
    setCloudError(null);

    try {
      const list = await api.getProjects(user.token);
      setProjects(list);
      if (list.length > 0) {
        setSelectedProjectId(list[0].id);
      } else {
        setSelectedProjectId(null);
        setProjectDetail(null);
        setSpaces([]);
        sceneRef.current?.clearSpaces();
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch projects. Try again.';
      setAppError(msg);
      setProjects([]);
      setSelectedProjectId(null);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [cancelCloudLoad]);

  useEffect(() => {
    if (currentUser) {
      loadProjects(currentUser);
    }
  }, [currentUser, loadProjects]);

  // ── Fetch project details & spaces whenever project changes ─────────
  const loadProjectData = useCallback(async (id: string, token: string) => {
    setIsLoadingDetails(true);
    setAppError(null);
    setSelectedSpace(null);
    setSelectedLevel('ALL');

    cancelCloudLoad();
    sceneRef.current?.clearPointCloud();
    setHasCloudLoaded(false);
    setCloudPointCount(null);
    setCloudError(null);

    try {
      const [detail, spaceList] = await Promise.all([
        api.getProjectDetail(id, token),
        api.getSpaces(id, token),
      ]);
      setProjectDetail(detail);
      setSpaces(spaceList);

      if (sceneRef.current) {
        sceneRef.current.setSpaces(spaceList);
        sceneRef.current.setViewMode(viewMode);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Error loading project data. Try again.';
      setAppError(msg);
      setProjectDetail(null);
      setSpaces([]);
      sceneRef.current?.clearSpaces();
    } finally {
      setIsLoadingDetails(false);
    }
  }, [cancelCloudLoad, viewMode]);

  useEffect(() => {
    if (selectedProjectId && currentUser) {
      loadProjectData(selectedProjectId, currentUser.token);
    }
  }, [selectedProjectId, currentUser, loadProjectData]);

  // ── Level & ViewMode Toggles ────────────────────────────────────────
  const handleSelectLevel = (level: string) => {
    setSelectedLevel(level);
    sceneRef.current?.filterByLevel(level);
  };

  const handleToggleViewMode = (mode: 'massing' | 'wireframe') => {
    setViewMode(mode);
    sceneRef.current?.setViewMode(mode);
  };

  // ── Point Cloud Loading with Web Worker ──────────────────────────────
  const handleLoadCloud = () => {
    if (!selectedProjectId || !currentUser) return;

    cancelCloudLoad();
    setCloudError(null);
    setIsCloudLoading(true);
    setCloudProgressPercent(0);
    setCloudLoadedMB('0.0');
    setCloudTotalMB('0.0');

    sceneRef.current?.clearPointCloud();
    setHasCloudLoaded(false);

    const cloudUrl = api.getCloudUrl(selectedProjectId);

    const worker = new Worker(
      new URL('./workers/cloudParser.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<CloudWorkerMessage>) => {
      const data = event.data;

      if (data.type === 'progress') {
        setCloudProgressPercent(data.percent);
        setCloudLoadedMB((data.loadedBytes / (1024 * 1024)).toFixed(1));
        setCloudTotalMB((data.totalBytes / (1024 * 1024)).toFixed(1));
      } else if (data.type === 'done') {
        setIsCloudLoading(false);
        setHasCloudLoaded(true);
        setCloudPointCount(data.pointCount);

        sceneRef.current?.setPointCloud(data.positions, data.colors);

        worker.terminate();
        workerRef.current = null;
      } else if (data.type === 'error') {
        setIsCloudLoading(false);
        setCloudError(data.message);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setIsCloudLoading(false);
      setCloudError('Worker failure parsing point cloud. Please try again.');
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({ url: cloudUrl, token: currentUser.token });
  };

  // ── Issue Submission ────────────────────────────────────────────────
  const handleCreateIssue = async (title: string, level: string, spaceId: string | null) => {
    if (!selectedProjectId || !currentUser) return null;
    return api.createIssue(selectedProjectId, currentUser.token, { title, level, spaceId });
  };

  const handleLogout = () => {
    cancelCloudLoad();
    sceneRef.current?.clearSpaces();
    sceneRef.current?.clearPointCloud();
    setCurrentUser(null);
    setSelectedProjectId(null);
    setProjectDetail(null);
    setSpaces([]);
  };

  const spaceCountsByLevel = spaces.reduce<Record<string, number>>((acc, s) => {
    acc[s.level] = (acc[s.level] || 0) + 1;
    return acc;
  }, {});

  // If not logged in, show the redesigned Login screen!
  if (!currentUser) {
    return (
      <LoginView
        users={USERS}
        onLogin={(user) => setCurrentUser(user)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-light-surface dark:bg-dark-surface text-light-on-surface dark:text-dark-on-surface font-body transition-colors duration-state-change">
      {/* Top Utility Header */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        isLoadingProjects={isLoadingProjects}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace: 3D Viewport + Right Inspector Rail */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_24rem] overflow-hidden">
        {/* 3D CAD Viewport */}
        <main className="relative bg-light-surface dark:bg-dark-surface cad-grid flex flex-col justify-between p-gutter-lg min-h-96 overflow-hidden">
          {/* Top Viewport Controls */}
          <div className="z-10 w-full">
            {projectDetail && (
              <LevelFilter
                levels={projectDetail.levels}
                selectedLevel={selectedLevel}
                onSelectLevel={handleSelectLevel}
                spaceCountsByLevel={spaceCountsByLevel}
                viewMode={viewMode}
                onToggleViewMode={handleToggleViewMode}
              />
            )}
          </div>

          {/* Interactive 3D Canvas in center */}
          <div className="absolute inset-0 z-0">
            <div ref={mountRef} className="w-full h-full" />
          </div>

          {/* Bottom Viewport Bar: Navigation Hint + Scale Bar */}
          <div className="flex flex-wrap items-center justify-between gap-gutter-md z-10 pointer-events-auto">
            <div className="inline-flex items-center gap-gutter-sm px-gutter-md py-gutter-xs rounded bg-light-surface-container-lowest/90 dark:bg-dark-surface-container-low/90 backdrop-blur-xs border border-light-outline-variant dark:border-dark-outline-variant shadow-xs">
              <span className="material-symbols-outlined text-light-on-surface-variant dark:text-dark-on-surface-variant text-base" aria-hidden="true">
                3d_rotation
              </span>
              <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-xs">
                Orbit: Drag · Zoom: Scroll · Pan: Right-click / 2 Fingers
              </span>
            </div>

            <div className="inline-flex items-center gap-gutter-md px-gutter-md py-gutter-xs rounded bg-light-surface-container-lowest/90 dark:bg-dark-surface-container-low/90 backdrop-blur-xs border border-light-outline-variant dark:border-dark-outline-variant shadow-xs">
              <div className="flex items-center gap-gutter-xs">
                <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums text-xs">0</span>
                <span className="w-10 h-0.5 bg-light-on-surface dark:bg-dark-on-surface"></span>
                <span className="font-mono text-mono-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums text-xs">10m</span>
              </div>
              <span className="text-light-outline-variant dark:text-dark-outline-variant">|</span>
              <span className="font-mono text-mono-sm text-light-on-surface dark:text-dark-on-surface text-xs">N 0°</span>
            </div>
          </div>
        </main>

        {/* Right Inspector Rail */}
        <aside className="bg-light-surface-container-lowest dark:bg-dark-surface-container-low border-t lg:border-t-0 lg:border-l border-light-outline-variant dark:border-dark-outline-variant flex flex-col justify-between overflow-y-auto z-10 shadow-sm">
          <div className="p-gutter-xl flex flex-col gap-gutter-xl">
            {/* General App Error Banner with Try Again */}
            {appError && (
              <div className="p-gutter-md rounded bg-light-error-container text-light-error-text dark:bg-dark-error-container dark:text-dark-on-error-container text-body-sm flex flex-col gap-gutter-xs border border-light-error/20">
                <span className="font-body text-body-sm">{appError}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProjectId && currentUser) {
                      loadProjectData(selectedProjectId, currentUser.token);
                    } else if (currentUser) {
                      loadProjects(currentUser);
                    }
                  }}
                  className="self-start text-xs font-mono underline font-bold"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Project Details */}
            {isLoadingDetails ? (
              <div className="p-gutter-lg rounded bg-light-surface-container-low dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-center font-mono text-mono-sm text-light-on-surface-variant">
                Loading project specifications...
              </div>
            ) : projectDetail ? (
              <ProjectInfoCard project={projectDetail} />
            ) : null}

            {/* Point Cloud Scan Module */}
            {projectDetail && (
              <PointCloudLoader
                isLoading={isCloudLoading}
                hasLoaded={hasCloudLoaded}
                progressPercent={cloudProgressPercent}
                loadedMB={cloudLoadedMB}
                totalMB={cloudTotalMB}
                pointCount={cloudPointCount}
                errorMessage={cloudError}
                onLoadCloud={handleLoadCloud}
                onCancelLoad={cancelCloudLoad}
              />
            )}

            {/* Volume Selection Inspector */}
            <SpaceInspector
              space={selectedSpace}
              unit={unit}
              onToggleUnit={() => setUnit((u) => (u === 'm2' ? 'ft2' : 'm2'))}
              onOpenReportIssue={() => setIsIssueModalOpen(true)}
              onClose={() => {
                setSelectedSpace(null);
                sceneRef.current?.clearSelection();
              }}
            />
          </div>

          {/* Bottom Action Footer */}
          {projectDetail && (
            <footer className="p-gutter-xl pt-0 mt-auto">
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-gutter-sm px-gutter-lg py-gutter-sm rounded bg-light-surface-container-lowest dark:bg-dark-surface-container-high text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-highest transition-colors duration-state-change font-label text-label-lg shadow-xs"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">flag</span>
                <span>Report an issue</span>
              </button>
            </footer>
          )}
        </aside>
      </div>

      {/* Issue Modal */}
      {projectDetail && (
        <IssueModal
          isOpen={isIssueModalOpen}
          levels={projectDetail.levels}
          spaces={spaces}
          selectedSpace={selectedSpace}
          onClose={() => setIsIssueModalOpen(false)}
          onSubmit={handleCreateIssue}
        />
      )}
    </div>
  );
}
