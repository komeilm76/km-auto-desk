import {
  FileType,
  Image,
  OptionalSearchParameters,
  Point,
  Region,
  RegionResultFindInput,
  screen,
  ScreenClass,
  ScreenConfig,
  WindowCallback,
  WindowResultFindInput,
} from '@nut-tree-fork/nut-js';

const setConfig = (config: Partial<ScreenConfig>) => {
  screen.config = { ...screen.config, ...config };
};

const width = async () => {
  return screen.width();
};
const height = async () => {
  return screen.height();
};
const find = async <PROVIDER_DATA_TYPE>(
  searchInput: RegionResultFindInput | Promise<RegionResultFindInput>,
  params?: OptionalSearchParameters<PROVIDER_DATA_TYPE>
) => {
  return screen.find(searchInput, params);
};
const findAll = async <PROVIDER_DATA_TYPE>(
  searchInput: RegionResultFindInput | Promise<RegionResultFindInput>,
  params?: OptionalSearchParameters<PROVIDER_DATA_TYPE>
) => {
  return screen.findAll(searchInput, params);
};
const highlight = async (regionToHighlight: Region | Promise<Region>) => {
  return screen.highlight(regionToHighlight);
};
const waitFor = async <PROVIDER_DATA_TYPE>(
  searchInput: RegionResultFindInput | Promise<RegionResultFindInput>,
  timeoutMs?: number,
  updateInterval?: number,
  params?: OptionalSearchParameters<PROVIDER_DATA_TYPE>
) => {
  return screen.waitFor(searchInput, timeoutMs, updateInterval, params);
};
const on = async (searchInput: WindowResultFindInput, callback: WindowCallback) => {
  return screen.on(searchInput, callback);
};
const capture = async (
  fileName: string,
  fileFormat?: FileType,
  filePath?: string,
  fileNamePrefix?: string,
  fileNamePostfix?: string
) => {
  return screen.capture(fileName, fileFormat, filePath, fileNamePrefix, fileNamePostfix);
};
const grab = async () => {
  return screen.grab();
};
const captureRegion = async (
  fileName: string,
  regionToCapture: Region | Promise<Region>,
  fileFormat?: FileType,
  filePath?: string,
  fileNamePrefix?: string,
  fileNamePostfix?: string
) => {
  return screen.captureRegion(
    fileName,
    regionToCapture,
    fileFormat,
    filePath,
    fileNamePrefix,
    fileNamePostfix
  );
};
const grabRegion = async (regionToGrab: Region | Promise<Region>) => {
  return screen.grabRegion(regionToGrab);
};
const colorAt = async (point: Point | Promise<Point>) => {
  return screen.colorAt(point);
};

export default {
  setConfig,
  width,
  height,
  find,
  findAll,
  highlight,
  waitFor,
  on,
  capture,
  grab,
  captureRegion,
  grabRegion,
  colorAt,
};
