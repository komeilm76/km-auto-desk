import { Key, keyboard, KeyboardClass, KeyboardConfig } from '@nut-tree-fork/nut-js';

const setConfig = (config: Partial<KeyboardConfig>) => {
  keyboard.config = { ...keyboard.config, ...config };
};

const type = async (...input: string[] | Key[]) => {
  return keyboard.type(...input);
};
const pressKey = async (...keys: Key[]) => {
  return keyboard.pressKey(...keys);
};
const releaseKey = async (...keys: Key[]) => {
  return keyboard.releaseKey(...keys);
};

const keyup: (...keys: Key[]) => Promise<KeyboardClass> = (...keys) => {
  return new Promise((rs, rj) => {
    keyboard.pressKey(...keys).then((res) => {
      keyboard.releaseKey(...keys).then((res) => {
        rs(res);
      });
    });
  });
};

const shortcut = {
  selectAll: () => {
    return keyup(Key.LeftControl, Key.A);
  },

  copy: () => {
    return keyup(Key.LeftControl, Key.C);
  },

  paste: () => {
    return keyup(Key.LeftControl, Key.V);
  },
  win: {
    switchLanguage: () => {
      return keyup(Key.RightAlt, Key.RightShift);
    },
    closeWindow: () => {
      return keyup(Key.LeftAlt, Key.F4);
    },
    runTools: () => {
      return keyup(Key.LeftWin, Key.R);
    },
    lockScreen: () => {
      return keyup(Key.LeftWin, Key.L);
    },
  },
};

export default {
  setConfig,
  type,
  pressKey,
  releaseKey,
  keyup,
  shortcut,
};
