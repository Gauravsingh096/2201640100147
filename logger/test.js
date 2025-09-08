const { log } = require('./index');

(async () => {
  try {
    const res = await log('backend','info','service','Logger test run from script');
    console.log('OK', res);
  } catch (e) {
    console.error('FAIL', e && e.response ? e.response : e.message || e);
    process.exitCode = 1;
  }
})();
