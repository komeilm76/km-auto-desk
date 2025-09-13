import { centerOf, FileType, mouse, singleWord, straightTo, screen } from '@nut-tree-fork/nut-js';
import lib from './lib';
import Tesseract from 'tesseract.js';
import plugins from './lib/plugins';
import ocrPlugin from './lib/plugins/ocr-plugin';
import nlMatcherPlugin from './lib/plugins/nl-matcher-plugin';
const kmAutoDesk = lib;
export default kmAutoDesk;

const run = async () => {
  plugins.register(ocrPlugin.install, nlMatcherPlugin.install);
  // await screen.capture('screenshot.png', FileType.PNG, 'enh');
  // const app_frame = ['close', 'maximize', 'minimize', 'title'].map((item) => {
  //   return `app_frame/${item}`;
  // });
  // const app_bar = ['admin', 'file', 'help', 'run', 'tools'].map((item) => {
  //   return `app_bar/${item}`;
  // });
  // const app_tabs = ['general_input', 'players_data', 'result'].map((item) => {
  //   return `app_tabs/${item}`;
  // });
  // const general_input_tab_content = [
  //   'analyze_networking',
  //   'bayesian_updating',
  //   'both',
  //   'coalition_network',
  //   'flexibility',
  //   'position',
  //   'salience',
  //   'influence',
  //   'optimize',
  // ].map((item) => {
  //   return `general_input_tab_content/${item}`;
  // });
  // const buttons = [...app_frame, ...app_bar, ...app_tabs, ...general_input_tab_content].map(
  //   (item) => {
  //     return `./enh/win-app/${item}.png`;
  //   }
  // );
  // let output = [...buttons].map((item) => {
  //   return async () => {
  //     const findedElementPoint1 = await screen.find(imageResource(item));
  //     await mouse.move(straightTo(centerOf(findedElementPoint1)));
  //     await sleep(1000);
  //   };
  // });
  // output.forEach(async (item) => {
  //   await item();
  // });

  // text finder example
  const x = screen.find(singleWord('Go'));
  await mouse.move(straightTo(centerOf(x)));
};
run();
