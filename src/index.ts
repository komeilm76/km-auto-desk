import {
  Button,
  centerOf,
  ColorMode,
  FileType,
  Key,
  straightTo,
  textLine,
} from '@nut-tree-fork/nut-js';
import lib from './lib';
const kmAutoDesk = lib;
export default {
  keyboard: kmAutoDesk.keyboard,
  mouse: kmAutoDesk.mouse,
  screen: kmAutoDesk.screen,
  _screen: kmAutoDesk.screen,
  plugins: kmAutoDesk.plugins,
  utils: kmAutoDesk.utils,
};

export type IAutoDeskEnum = {
  button: Button;
  colorMode: ColorMode;
  fileType: FileType;
  key: Key;
};
