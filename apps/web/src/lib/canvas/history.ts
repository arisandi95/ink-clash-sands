import type { DrawableOp } from '@inkclash/shared';

export class OpHistory {
  private undoStack: DrawableOp[] = [];
  private redoStack: DrawableOp[] = [];

  constructor(private readonly limit = 100) {}

  get ops(): DrawableOp[] {
    return [...this.undoStack];
  }

  add(op: DrawableOp): void {
    this.undoStack.push(op);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): DrawableOp | null {
    const op = this.undoStack.pop();
    if (!op) {
      return null;
    }
    this.redoStack.push(op);
    return op;
  }

  redo(): DrawableOp | null {
    const op = this.redoStack.pop();
    if (!op) {
      return null;
    }
    this.undoStack.push(op);
    return op;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  reset(ops: DrawableOp[] = []): void {
    this.undoStack = ops.slice(-this.limit);
    this.redoStack = [];
  }
}
