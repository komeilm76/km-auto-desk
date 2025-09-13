const register = (...plugins: (() => void)[]) => {
  plugins.forEach((item) => {
    item();
  });
};
export default { register };
