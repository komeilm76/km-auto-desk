import { centerOf, Region, straightTo } from '@nut-tree-fork/nut-js';

const _centerOf = (target: Region | Promise<Region>) => {
  return centerOf(target);
};

export default {
  centerOf: _centerOf,
};
