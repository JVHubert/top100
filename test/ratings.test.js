// Avaliação das categorias: API /api/ratings e ordenação por nota.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../src/server.js';
import { ratingScore } from '../src/ratings.js';

test('ratingScore: suaviza poucos votos', () => {
  assert.equal(ratingScore(), 0.5);
  assert.ok(ratingScore({ up: 40, down: 2 }) > ratingScore({ up: 1, down: 0 })); // 40 votos > 1 voto
  assert.ok(ratingScore({ up: 0, down: 3 }) < 0.5);
});

test('API de votos: soma, valida e guarda no arquivo', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'top100-'));
  const ratingsFile = path.join(dir, 'ratings.json');
  const { server, io } = createServer({ logger: { log() {}, error() {} }, ratingsFile });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const post = (body) => fetch(`${base}/api/ratings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ categoryId: 'top100-cidades-brasil', vote: 'up' })).status, 200);
    const second = await (await post({ categoryId: 'top100-cidades-brasil', vote: 'down' })).json();
    assert.deepEqual([second.up, second.down], [1, 1]);
    assert.equal((await post({ categoryId: 'nao-existe', vote: 'up' })).status, 400);
    assert.equal((await post({ categoryId: 'top100-cidades-brasil', vote: 'talvez' })).status, 400);

    const all = await (await fetch(`${base}/api/ratings`)).json();
    assert.deepEqual(all['top100-cidades-brasil'], { up: 1, down: 1 });
    assert.deepEqual(JSON.parse(fs.readFileSync(ratingsFile, 'utf8'))['top100-cidades-brasil'], { up: 1, down: 1 });

    const list = await (await fetch(`${base}/api/categories`)).json();
    assert.equal(list.find((c) => c.id === 'top100-filmes-imdb' || c.id === 'imdb-top100-filmes').status, 'validada');
    assert.equal(list.find((c) => c.id === 'top100-cidades-brasil').status, 'experimental');
  } finally {
    io.close();
    await new Promise((r) => server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
