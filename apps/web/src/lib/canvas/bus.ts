import type { DrawableOp } from '@inkclash/shared';

type OpsListener = (ops: DrawableOp[]) => void;
type FullListener = (ops: DrawableOp[]) => void;

class CanvasBus {
  private opsListeners = new Set<OpsListener>();
  private fullListeners = new Set<FullListener>();
  private pendingFull: DrawableOp[] | null = null;

  onOps(listener: OpsListener): () => void {
    this.opsListeners.add(listener);
    return () => this.opsListeners.delete(listener);
  }

  onFull(listener: FullListener): () => void {
    this.fullListeners.add(listener);
    if (this.pendingFull) {
      const ops = this.pendingFull;
      this.pendingFull = null;
      queueMicrotask(() => {
        if (this.fullListeners.has(listener)) {
          listener(ops);
        }
      });
    }
    return () => this.fullListeners.delete(listener);
  }

  emitOps(ops: DrawableOp[]): void {
    for (const listener of this.opsListeners) {
      listener(ops);
    }
  }

  emitFull(ops: DrawableOp[]): void {
    this.pendingFull = this.fullListeners.size > 0 ? null : ops;
    for (const listener of this.fullListeners) {
      listener(ops);
    }
  }

  reset(): void {
    this.opsListeners.clear();
    this.fullListeners.clear();
    this.pendingFull = null;
  }
}

export const canvasBus = new CanvasBus();
