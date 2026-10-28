import {
  AmbientLight,
  Clock,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three';

function tokenColor(name: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new Color(value || 'black');
}

export class TimeoutAnimation {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private readonly clock = new Clock();
  private readonly marker = new Group();
  private readonly note = new Mesh(
    new PlaneGeometry(2.8, 2.2),
    new MeshStandardMaterial({ roughness: 0.9, metalness: 0, side: DoubleSide })
  );
  private readonly bodyMaterial = new MeshStandardMaterial({ roughness: 0.42, metalness: 0.08 });
  private readonly darkMaterial = new MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
  private readonly accentMaterial = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  private readonly keyLight = new DirectionalLight(undefined, 2.4);
  private readonly fillLight = new DirectionalLight(undefined, 0.8);
  private readonly ambientLight = new AmbientLight(undefined, 0.7);
  private frame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearAlpha(0);

    this.camera.position.set(0, 0.2, 7.4);
    this.camera.lookAt(0, -0.1, 0);

    this.buildScene();
    this.applyTheme();
    this.resize();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
    }

    if (typeof MutationObserver !== 'undefined') {
      this.themeObserver = new MutationObserver(() => this.applyTheme());
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }
  }

  start(): void {
    if (this.frame !== null || this.disposed) {
      return;
    }
    this.clock.start();
    this.renderer.render(this.scene, this.camera);
    const tick = () => {
      const time = this.clock.getElapsedTime();
      this.marker.position.y = 0.05 + Math.sin(time * 3.4) * 0.14;
      this.marker.rotation.z = -0.28 + Math.sin(time * 2.2) * 0.07;
      this.marker.rotation.x = Math.sin(time * 1.7) * 0.03;
      this.note.rotation.z = -0.08 + Math.sin(time * 1.6 + 1) * 0.025;
      this.note.position.y = -0.15 + Math.sin(time * 1.6) * 0.02;
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();

    const materials = new Set<MeshStandardMaterial>();
    this.scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) {
          if (material instanceof MeshStandardMaterial) {
            materials.add(material);
          }
        }
      }
    });
    for (const material of materials) {
      material.dispose();
    }
    this.renderer.dispose();
  }

  private buildScene(): void {
    this.note.position.set(0, -0.15, -0.8);
    this.note.rotation.z = -0.08;
    this.scene.add(this.note);

    const noteOutline = new Mesh(
      new PlaneGeometry(3.02, 2.42),
      new MeshStandardMaterial({ roughness: 0.8, metalness: 0, side: DoubleSide })
    );
    noteOutline.position.set(0, -0.15, -0.82);
    noteOutline.rotation.z = -0.08;
    noteOutline.name = 'note-outline';
    this.scene.add(noteOutline);

    const tape = new Mesh(
      new PlaneGeometry(0.9, 0.34),
      new MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: DoubleSide })
    );
    tape.position.set(0, 1.08, -0.78);
    tape.rotation.z = -0.08;
    tape.name = 'tape';
    this.scene.add(tape);

    const body = new Mesh(new CylinderGeometry(0.42, 0.42, 2, 32), this.bodyMaterial);
    body.position.y = 0.15;
    this.marker.add(body);

    const band = new Mesh(new CylinderGeometry(0.435, 0.435, 0.18, 32), this.accentMaterial);
    band.position.y = 1.06;
    this.marker.add(band);

    const cap = new Mesh(new CylinderGeometry(0.46, 0.46, 0.72, 32), this.darkMaterial);
    cap.position.y = 1.48;
    this.marker.add(cap);

    const tip = new Mesh(new ConeGeometry(0.32, 0.75, 32), this.darkMaterial);
    tip.rotation.x = Math.PI;
    tip.position.y = -1.22;
    this.marker.add(tip);

    this.marker.position.set(0.25, 0.05, 0.1);
    this.marker.rotation.z = -0.28;
    this.scene.add(this.marker);

    this.keyLight.position.set(3, 5, 6);
    this.fillLight.position.set(-4, -2, 4);
    this.scene.add(this.keyLight, this.fillLight, this.ambientLight);

    this.scene.traverse((object) => {
      if (object instanceof Mesh && object.name === 'note-outline') {
        object.userData.role = 'outline';
      }
      if (object instanceof Mesh && object.name === 'tape') {
        object.userData.role = 'tape';
      }
    });
  }

  private applyTheme(): void {
    this.bodyMaterial.color.copy(tokenColor('--marker-red'));
    this.darkMaterial.color.copy(tokenColor('--ink'));
    this.accentMaterial.color.copy(tokenColor('--highlight'));
    this.note.material.color.copy(tokenColor('--highlight'));
    this.keyLight.color.copy(tokenColor('--board'));
    this.fillLight.color.copy(tokenColor('--board'));
    this.ambientLight.color.copy(tokenColor('--board'));

    this.scene.traverse((object) => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) {
        return;
      }
      if (object.userData.role === 'outline') {
        object.material.color.copy(tokenColor('--ink'));
      }
      if (object.userData.role === 'tape') {
        object.material.color.copy(tokenColor('--panel-raised'));
      }
    });
  }

  private resize(): void {
    const width = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 1;
    const height = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
