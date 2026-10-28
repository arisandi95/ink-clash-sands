import type { DrawableOp } from '@inkclash/shared';
import { describe, expect, it } from 'vitest';
import { OpHistory } from './history';

const stroke = (id: string): DrawableOp => ({
  id,
  t: 'stroke',
  layer: 0,
  color: '#112233',
  size: 4,
  mode: 'draw',
  pts: [[0, 0]]
});

describe('OpHistory', () => {
  it('tracks ops for undo and redo in order', () => {
    const history = new OpHistory();
    history.add(stroke('a'));
    history.add(stroke('b'));

    expect(history.ops.map((op) => op.id)).toEqual(['a', 'b']);
    expect(history.undo()?.id).toBe('b');
    expect(history.canRedo()).toBe(true);
    expect(history.redo()?.id).toBe('b');
    expect(history.ops.map((op) => op.id)).toEqual(['a', 'b']);
  });

  it('returns null when the stacks are empty', () => {
    const history = new OpHistory();
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
    expect(history.canUndo()).toBe(false);
  });

  it('drops the redo stack after a new op', () => {
    const history = new OpHistory();
    history.add(stroke('a'));
    history.undo();
    history.add(stroke('b'));
    expect(history.canRedo()).toBe(false);
    expect(history.ops.map((op) => op.id)).toEqual(['b']);
  });

  it('trims the oldest ops beyond the limit', () => {
    const history = new OpHistory(2);
    history.add(stroke('a'));
    history.add(stroke('b'));
    history.add(stroke('c'));
    expect(history.ops.map((op) => op.id)).toEqual(['b', 'c']);
  });

  it('resets to the provided ops and clears redo', () => {
    const history = new OpHistory();
    history.add(stroke('a'));
    history.undo();
    history.reset([stroke('x')]);
    expect(history.ops.map((op) => op.id)).toEqual(['x']);
    expect(history.canRedo()).toBe(false);
  });
});
