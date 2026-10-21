import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findChrome } from '../cli/lib/browser.js';
import { CdpError, launch, newPage } from '../cli/lib/cdp.js';

const skip = !findChrome() && 'no Chrome';

for (const transport of ['pipe', 'websocket']) {
  test(`cdp over ${transport}: evaluate, events, errors, two pages at once, close`, { skip }, async () => {
    const conn = await launch(findChrome(), { transport });
    try {
      assert.equal(conn.transport, transport);
      const a = await newPage(conn), b = await newPage(conn);
      await Promise.all([a.send('Runtime.enable'), b.send('Runtime.enable')]);
      const logs = [];
      a.on('Runtime.consoleAPICalled', (p) => logs.push(p.args[0].value));
      assert.equal(await a.evaluate('1 + 2'), 3);
      assert.equal(await b.evaluate('Promise.resolve("two")'), 'two'); // promises are awaited
      await a.evaluate('console.log("from a"), 0');
      await b.evaluate('console.log("from b"), 0');
      assert.deepEqual(logs, ['from a'], 'events reach only the page they belong to');
      await assert.rejects(() => a.evaluate('throw new Error("boom")'), /boom/);
      await assert.rejects(() => a.send('No.suchMethod'), CdpError);
      await assert.rejects(() => a.evaluate('new Promise(() => {})', { ms: 200 }), /timed out/);
      // a big message (a 1080p PNG is a few MB of base64) comes through whole
      assert.equal((await a.evaluate('"x".repeat(1 << 20)')).length, 1 << 20);
    } finally { await conn.close(); }
    await assert.rejects(() => conn.send('Browser.getVersion'), /gone|closed|exited/);
  });
}

test('cdp: a browser that cannot start is reported, not hung', async () => {
  await assert.rejects(() => launch('/no/such/chrome', { transport: 'pipe' }).then((c) => c.send('Browser.getVersion')), /Chrome|ENOENT|gone/);
});
