import { Button, EasingFunction, mouse, MouseConfig, Point } from '@nut-tree-fork/nut-js';

const setConfig = (config: Partial<MouseConfig>) => {
  mouse.config = { ...mouse.config, ...config };
};
const setPosition = async (target: Point) => {
  return mouse.setPosition(target);
};
const getPosition = async () => {
  return mouse.getPosition();
};
const move = async (path: Point[] | Promise<Point[]>, movementType?: EasingFunction) => {
  return mouse.move(path, movementType);
};
const leftClick = async () => {
  return mouse.leftClick();
};
const rightClick = async () => {
  return mouse.rightClick();
};
const scrollDown = async (amount: number) => {
  return mouse.scrollDown(amount);
};
const scrollUp = async (amount: number) => {
  return mouse.scrollUp(amount);
};
const scrollLeft = async (amount: number) => {
  return mouse.scrollLeft(amount);
};
const scrollRight = async (amount: number) => {
  return mouse.scrollRight(amount);
};
const drag = async (path: Point[] | Promise<Point[]>) => {
  return mouse.drag(path);
};
const pressButton = async (btn: Button) => {
  return mouse.pressButton(btn);
};
const releaseButton = async (btn: Button) => {
  return mouse.releaseButton(btn);
};
const click = async (btn: Button) => {
  return mouse.click(btn);
};
const doubleClick = async (btn: Button) => {
  return mouse.doubleClick(btn);
};
export default {
  setConfig,
  setPosition,
  getPosition,
  move,
  leftClick,
  rightClick,
  scrollDown,
  scrollUp,
  scrollLeft,
  scrollRight,
  drag,
  pressButton,
  releaseButton,
  click,
  doubleClick,
};
