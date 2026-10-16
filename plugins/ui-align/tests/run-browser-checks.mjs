// Run with `bb browser-automation run <session> --script-file <absolute path>
// --script-host <host-id> --json`. Serve this directory over HTTP first.
const p = await browser.getPage('main');
await p.setViewport({ width: 1280, height: 800 });
await p.goto('http://127.0.0.1:8765/compact-header.html');
const { tests } = await p.$eval('html', async () => await window.runChecks());
const check = (condition, name) => tests.push({ name, status: condition ? 'passed' : 'failed' });
for (const width of [700, 840, 1000, 1280]) {
  await p.setViewport({ width, height: 800 });
  const status = await p.$eval('html', async () => { await window.fixture.tick(); return window.fixture.getStatus(); });
  check(width < 768 ? status.reason === 'compact-viewport' : status.active, `responsive viewport ${width}px`);
}
await p.setViewport({ width: 1280, height: 800, hasTouch: true });
let status = await p.$eval('html', async () => { await window.fixture.tick(); return window.fixture.getStatus(); });
check(status.reason === 'compact-viewport', 'touch layout keeps the native header');
await p.setViewport({ width: 1280, height: 800, hasTouch: false });
await p.$eval('html', async () => { await window.fixture.tick(); });
await p.goto('http://127.0.0.1:8765/fixture.html');
const alignment = await p.$eval('html', async () => await window.runChecks());
check(alignment.passed > 0, `existing alignment fixture: ${alignment.passed} assertions`);
console.log(JSON.stringify({ tests }));
