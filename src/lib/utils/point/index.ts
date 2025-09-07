import { Point, straightTo } from '@nut-tree-fork/nut-js';

const _straightTo = (target: Point | Promise<Point>) => {
  return straightTo(target);
};
export default { straightTo: _straightTo };
