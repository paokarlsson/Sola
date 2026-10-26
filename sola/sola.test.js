import { test } from 'node:test';
import assert from 'node:assert/strict';

test('#sola resolves through package.json imports', async () => {
  const sola = await import('#sola');
  assert.deepEqual(Object.keys(sola), []);
});
