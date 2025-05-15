// Preload script for CommonJS compatibility
window.exports = {};
window.module = { exports: {} };
window.global = window;
window.process = { env: { NODE_ENV: 'development' } };
window.require = function(id) {
  console.warn(`Module "${id}" was required through CommonJS 'require' which is not supported in ESM.`);
  return {}; // Return empty module
};