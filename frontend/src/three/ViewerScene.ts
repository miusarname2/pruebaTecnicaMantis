import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Space, CloudLevelBucket } from '../types';

// Design System palette matching Site Viewer Studio
const LEVEL_COLORS: Record<string, number> = {
  'Ground': 0x33628B,   // Blueprint Slate
  'Level 1': 0x33628B,  // Blueprint Slate
  'Level 2': 0x2E6F40,  // Forest Moss
  'Roof': 0xAB2E07,     // Signal Vermilion
  'Basement': 0x006191, // Deep Blue
};

function getLevelColor(level: string): number {
  if (LEVEL_COLORS[level]) return LEVEL_COLORS[level];
  let hash = 0;
  for (let i = 0; i < level.length; i++) {
    hash = level.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff);
  return c || 0x33628B;
}

export class ViewerScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private grid: THREE.GridHelper;
  private animationFrameId: number | null = null;
  private isDarkMode: boolean = false;
  private viewMode: 'massing' | 'wireframe' = 'massing';
  private currentLevelFilter: string = 'ALL';

  // Space management
  private spaceGroup: THREE.Group = new THREE.Group();
  private spaceMeshes: THREE.Mesh[] = [];
  private selectedSpaceMesh: THREE.Mesh | null = null;
  private originalMaterials: Map<THREE.Mesh, THREE.MeshStandardMaterial> = new Map();

  // Point cloud management: partitioned per level for instant 60 FPS filtering
  private cloudGroup: THREE.Group = new THREE.Group();
  private levelCloudMeshes: Map<string, THREE.Points> = new Map();
  private levelPointCounts: Map<string, number> = new Map();

  // LOD & FPS performance monitoring
  private isInteracting: boolean = false;
  private adaptiveLodRatio: number = 1.0;
  private currentLodRatio: number = 1.0;
  private lodSettleTimer: number | null = null;
  private fpsFrameCount: number = 0;
  private fpsLastSampleTime: number = performance.now();
  private lastReportedFps: number = 60;
  private onPerfUpdate?: (stats: { fps: number; renderedPoints: number; totalPoints: number; lodRatio: number }) => void;

  // Interaction
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private onSpaceSelected?: (space: Space | null) => void;

  constructor(
    container: HTMLElement,
    onSpaceSelected?: (space: Space | null) => void,
    onPerfUpdate?: (stats: { fps: number; renderedPoints: number; totalPoints: number; lodRatio: number }) => void
  ) {
    this.container = container;
    this.onSpaceSelected = onSpaceSelected;
    this.onPerfUpdate = onPerfUpdate;

    this.isDarkMode = document.documentElement.classList.contains('dark');

    // ── Scene ────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.isDarkMode ? 0x15130F : 0xFEF9F0);

    // ── Camera ───────────────────────────────────────────────────────
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 1000);
    this.camera.position.set(35, 28, 45);

    // ── Renderer ─────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // ── OrbitControls ────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.maxDistance = 350;
    this.controls.minDistance = 1;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // ── Lights ───────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight1.position.set(40, 60, 40);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd4d0c8, 0.4);
    dirLight2.position.set(-40, -20, -40);
    this.scene.add(dirLight2);

    // ── CAD Ground Grid ──────────────────────────────────────────────
    const gridColor1 = this.isDarkMode ? 0x494740 : 0xCAC6BE;
    const gridColor2 = this.isDarkMode ? 0x2A2823 : 0xE2DDD4;
    this.grid = new THREE.GridHelper(80, 80, gridColor1, gridColor2);
    this.grid.position.y = -0.01;
    this.scene.add(this.grid);

    // ── Groups ───────────────────────────────────────────────────────
    this.scene.add(this.spaceGroup);
    this.scene.add(this.cloudGroup);

    // ── Event Listeners ──────────────────────────────────────────────
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.controls.addEventListener('start', this.onControlsStart);
    this.controls.addEventListener('end', this.onControlsEnd);

    this.animate();
  }

  // ── Smooth theme update without touching 3D objects ────────────────
  public setTheme(isDark: boolean) {
    this.isDarkMode = isDark;
    this.scene.background = new THREE.Color(isDark ? 0x15130F : 0xFEF9F0);

    const gridColor1 = isDark ? 0x494740 : 0xCAC6BE;
    const gridColor2 = isDark ? 0x2A2823 : 0xE2DDD4;

    this.scene.remove(this.grid);
    this.grid.geometry.dispose();
    this.grid = new THREE.GridHelper(80, 80, gridColor1, gridColor2);
    this.grid.position.y = -0.01;
    this.scene.add(this.grid);

    // Update edge line colors seamlessly
    const edgeColor = isDark ? 0x949089 : 0x1D1C16;
    this.spaceMeshes.forEach((mesh) => {
      mesh.children.forEach((c) => {
        if (c instanceof THREE.LineSegments && c.material instanceof THREE.LineBasicMaterial) {
          c.material.color.setHex(edgeColor);
          c.material.needsUpdate = true;
        }
      });
    });
  }

  public setViewMode(mode: 'massing' | 'wireframe') {
    this.viewMode = mode;
    const opacity = mode === 'wireframe' ? 0.08 : 0.65;
    this.spaceMeshes.forEach((mesh) => {
      if (mesh !== this.selectedSpaceMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = opacity;
        mat.needsUpdate = true;
      }
    });
  }

  private onControlsStart = () => {
    this.isInteracting = true;
    if (this.lodSettleTimer !== null) {
      window.clearTimeout(this.lodSettleTimer);
      this.lodSettleTimer = null;
    }
    this.updateCloudLod();
  };

  private onControlsEnd = () => {
    this.isInteracting = false;
    if (this.lodSettleTimer !== null) {
      window.clearTimeout(this.lodSettleTimer);
    }
    this.lodSettleTimer = window.setTimeout(() => {
      this.lodSettleTimer = null;
      this.updateCloudLod();
    }, 180);
  };

  private getVisiblePointStats(): { totalPoints: number; renderedPoints: number } {
    let totalPoints = 0;
    let renderedPoints = 0;
    this.levelCloudMeshes.forEach((mesh, lvl) => {
      if (!mesh.visible) return;
      const total = this.levelPointCounts.get(lvl) ?? 0;
      totalPoints += total;
      const rangeCount = mesh.geometry.drawRange.count;
      renderedPoints += rangeCount === Infinity ? total : Math.min(total, rangeCount);
    });
    return { totalPoints, renderedPoints };
  }

  private updateCloudLod() {
    let totalVisible = 0;
    this.levelCloudMeshes.forEach((mesh, lvl) => {
      if (mesh.visible) {
        totalVisible += this.levelPointCounts.get(lvl) ?? 0;
      }
    });

    let targetRatio = 1.0;
    if (totalVisible > 350_000) {
      targetRatio = this.isInteracting
        ? Math.min(0.25, this.adaptiveLodRatio)
        : this.adaptiveLodRatio;
    }

    this.currentLodRatio = targetRatio;
    const pointSize = targetRatio < 1.0 ? 2.2 : 1.5;

    this.levelCloudMeshes.forEach((mesh, lvl) => {
      const total = this.levelPointCounts.get(lvl) ?? 0;
      const drawCount = targetRatio >= 1.0 ? total : Math.max(1, Math.floor(total * targetRatio));
      mesh.geometry.setDrawRange(0, drawCount);
      if (mesh.material instanceof THREE.PointsMaterial && mesh.material.size !== pointSize) {
        mesh.material.size = pointSize;
        mesh.material.needsUpdate = true;
      }
    });

    const stats = this.getVisiblePointStats();
    this.onPerfUpdate?.({
      fps: this.lastReportedFps,
      renderedPoints: stats.renderedPoints,
      totalPoints: stats.totalPoints,
      lodRatio: this.currentLodRatio,
    });
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.fpsFrameCount++;
    const now = performance.now();
    const elapsed = now - this.fpsLastSampleTime;
    if (elapsed >= 500) {
      const fps = Math.round((this.fpsFrameCount * 1000) / elapsed);
      this.fpsFrameCount = 0;
      this.fpsLastSampleTime = now;
      this.lastReportedFps = fps;

      const { totalPoints, renderedPoints } = this.getVisiblePointStats();
      if (totalPoints > 350_000) {
        if (fps < 24 && this.adaptiveLodRatio > 0.25) {
          this.adaptiveLodRatio = Math.max(0.25, this.adaptiveLodRatio * 0.5);
          this.updateCloudLod();
          return;
        }
        if (!this.isInteracting && fps >= 50 && this.adaptiveLodRatio < 1.0) {
          this.adaptiveLodRatio = Math.min(1.0, this.adaptiveLodRatio * 2);
          this.updateCloudLod();
          return;
        }
      }

      this.onPerfUpdate?.({
        fps,
        renderedPoints,
        totalPoints,
        lodRatio: this.currentLodRatio,
      });
    }
  };

  private onPointerDown = (event: PointerEvent) => {
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent) => {
    const dist = Math.hypot(
      event.clientX - this.pointerDownPos.x,
      event.clientY - this.pointerDownPos.y
    );
    if (dist > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const visibleMeshes = this.spaceMeshes.filter((m) => m.visible);
    const intersects = this.raycaster.intersectObjects(visibleMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      this.selectSpaceMesh(hitMesh);
    } else {
      this.clearSelection();
    }
  };

  public selectSpaceById(spaceId: string | null) {
    if (!spaceId) {
      this.clearSelection();
      return;
    }
    const mesh = this.spaceMeshes.find((m) => (m.userData as Space)?.id === spaceId);
    if (mesh) {
      this.selectSpaceMesh(mesh);
    } else {
      this.clearSelection();
    }
  }

  private selectSpaceMesh(mesh: THREE.Mesh) {
    if (this.selectedSpaceMesh && this.selectedSpaceMesh !== mesh) {
      const orig = this.originalMaterials.get(this.selectedSpaceMesh);
      if (orig) this.selectedSpaceMesh.material = orig;
    }

    this.selectedSpaceMesh = mesh;
    mesh.material = new THREE.MeshStandardMaterial({
      color: 0xF4613A,
      emissive: 0xAB2E07,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });

    const space = mesh.userData as Space;
    this.onSpaceSelected?.(space);
  }

  public clearSelection() {
    if (this.selectedSpaceMesh) {
      const orig = this.originalMaterials.get(this.selectedSpaceMesh);
      if (orig) this.selectedSpaceMesh.material = orig;
      this.selectedSpaceMesh = null;
    }
    this.onSpaceSelected?.(null);
  }

  // ── Spaces Rendering ───────────────────────────────────────────────
  public setSpaces(spaces: Space[]) {
    this.clearSpaces();

    const bounds = new THREE.Box3();

    spaces.forEach((space) => {
      const geometry = new THREE.BoxGeometry(space.w, space.h, space.d);

      const posX = space.x + space.w / 2;
      const posY = space.z + space.h / 2;
      const posZ = space.y + space.d / 2;

      const color = getLevelColor(space.level);
      const opacity = this.viewMode === 'wireframe' ? 0.08 : 0.65;
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(posX, posY, posZ);
      mesh.userData = space;

      // 1px drafting wireframe edge
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: this.isDarkMode ? 0x949089 : 0x1D1C16,
        transparent: true,
        opacity: 0.45,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      this.spaceGroup.add(mesh);
      this.spaceMeshes.push(mesh);
      this.originalMaterials.set(mesh, material);

      bounds.expandByObject(mesh);
    });

    if (spaces.length > 0) {
      this.fitCameraToBounds(bounds);
    }

    // Reapply current level filter if set
    if (this.currentLevelFilter !== 'ALL') {
      this.filterByLevel(this.currentLevelFilter);
    }
  }

  // ── Level Filtering for Spaces AND Point Clouds ────────────────────
  public filterByLevel(level: string) {
    this.currentLevelFilter = level;

    // 1. Filter space volumes
    this.spaceMeshes.forEach((mesh) => {
      const space = mesh.userData as Space;
      const visible = level === 'ALL' || space.level === level;
      mesh.visible = visible;
      if (!visible && this.selectedSpaceMesh === mesh) {
        this.clearSelection();
      }
    });

    // 2. Filter point cloud points by level!
    this.levelCloudMeshes.forEach((cloudMesh, lvl) => {
      cloudMesh.visible = (level === 'ALL' || lvl === level);
    });
    this.updateCloudLod();
  }

  public clearSpaces() {
    this.clearSelection();
    this.spaceMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
      mesh.children.forEach((c) => {
        if (c instanceof THREE.LineSegments) {
          c.geometry.dispose();
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material.dispose();
        }
      });
      this.spaceGroup.remove(mesh);
    });
    this.spaceMeshes = [];
    this.originalMaterials.clear();
  }

  // ── Point Cloud Rendering per Level (partitioned in Web Worker) ─────
  public setPointCloud(buckets: CloudLevelBucket[]) {
    this.clearPointCloud();
    this.adaptiveLodRatio = 1.0;

    buckets.forEach(({ level, positions, colors }) => {
      if (positions.length === 0) return;

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
      geom.computeBoundingSphere();

      const mat = new THREE.PointsMaterial({
        size: 1.5,
        sizeAttenuation: false,
        vertexColors: true,
      });

      const mesh = new THREE.Points(geom, mat);
      mesh.visible = (this.currentLevelFilter === 'ALL' || this.currentLevelFilter === level);

      this.cloudGroup.add(mesh);
      this.levelCloudMeshes.set(level, mesh);
      this.levelPointCounts.set(level, positions.length / 3);
    });

    this.updateCloudLod();
  }

  public clearPointCloud() {
    this.levelCloudMeshes.forEach((mesh) => {
      this.cloudGroup.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.levelCloudMeshes.clear();
    this.levelPointCounts.clear();
    this.currentLodRatio = 1.0;
    this.adaptiveLodRatio = 1.0;
    this.onPerfUpdate?.({ fps: this.lastReportedFps, renderedPoints: 0, totalPoints: 0, lodRatio: 1.0 });
  }

  public fitCameraToBounds(box: THREE.Box3) {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 15);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.65;

    this.camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.6, center.z + cameraZ * 0.9);
    this.controls.target.copy(center);
    this.controls.update();
  }

  public resize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.lodSettleTimer !== null) {
      window.clearTimeout(this.lodSettleTimer);
    }
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.removeEventListener('end', this.onControlsEnd);

    this.clearSpaces();
    this.clearPointCloud();
    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
