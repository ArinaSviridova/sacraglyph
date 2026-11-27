exports.onPreBuild = async () => {
  const {refreshCatalog} = await import('../../../scripts/render-merch.mjs');
  await refreshCatalog();
};
