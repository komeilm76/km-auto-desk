import {
  centerOf,
  FileType,
  providerRegistry,
  screen,
  ScreenClass,
  sleep,
  straightTo,
} from '@nut-tree-fork/nut-js';
import lib from './lib';
import mouse from './lib/mouse';
import jetpack, { write } from 'fs-jetpack';
import sharp from 'sharp';
import utils from './lib/utils';
const kmAutoDesk = lib;
export default kmAutoDesk;

const run = async () => {
  //   mouse.setConfig({ mouseSpeed: 10000 });
  //   const point = await straightTo({ x: 10, y: 20 });
  //   console.log('point', point);
  //   mouse.move(point);
  //   //   mouse.setPosition({ x: 0, y: 0 });
  //   const center = await centerOf({
  //     top: 10,
  //     left: 10,
  //     width: 100,
  //     height: 100,
  //     area: () => 0,
  //   });

  //   console.log('center', center);
  await screen.capture('screenshot.png', FileType.PNG, 'enh');
  let img = await utils.img.imageResource('./enh/screenshot.png');
  // @ts-ignore
  await utils.img.saveImage(img, './enh/screenshot.new.png', 'png');
  await utils.img.enhancement.enhanceTextInImage(
    './enh/screenshot.new.png',
    './enh/screenshot.enhanced.text.png'
  );
  await utils.img.enhancement.enhanceImageQuality(
    './enh/screenshot.new.png',
    './enh/screenshot.enhanced.image.png'
  );
  utils.img.defaultFinderAdapter.register(
    new utils.img.defaultFinderAdapter.DefaultTemplateImageFinder()
  );
  const s = new ScreenClass(providerRegistry);
  const findedElementPoint = await s.find(utils.img.imageResource(`./enh/file-button.png`));
  await mouse.move(straightTo(centerOf(findedElementPoint)));
};
run();
