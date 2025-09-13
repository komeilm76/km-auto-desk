import adapter from './adapter';

const install = (
  entryAdapter: InstanceType<typeof adapter.DefaultAdapter> = new adapter.DefaultAdapter()
) => {
  adapter.register(entryAdapter);
};

export default {
  install,
};
