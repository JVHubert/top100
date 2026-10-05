// Teste ponta a ponta: sobe o servidor de verdade e conecta 3 clientes Socket.IO.
import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { createServer } from '../src/server.js';

function call(socket, event, payload = {}) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}
function nextState(socket, predicate) {
  return new Promise((resolve) => {
    const h = (s) => { if (predicate(s)) { socket.off('state', h); resolve(s); } };
    socket.on('state', h);
  });
}

test('3 jogadores jogam uma partida inteira em tempo real', async () => {
  const { server, io } = createServer({ logger: { log() {}, error: console.error } });
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}`;
  const opts = { transports: ['websocket'], forceNew: true };
  const [ana, beto, caio] = [connect(url, opts), connect(url, opts), connect(url, opts)];
  let beto2 = null;

  try {
    const created = await call(ana, 'room:create', { name: 'Ana', avatar: '🍿', color: '#FF5A5F' });
    assert.equal(created.ok, true);
    assert.match(created.code, /^[A-Z]{4}$/);

    const bad = await call(beto, 'room:join', { code: 'ZZZZ', name: 'Beto' });
    assert.equal(bad.ok, false);

    const lobbyFull = nextState(ana, (s) => s.players.length === 3);
    assert.equal((await call(beto, 'room:join', { code: created.code.toLowerCase(), name: 'Beto', avatar: '🤖' })).ok, true);
    const caioJoin = await call(caio, 'room:join', { code: created.code, name: 'Caio', avatar: '🦖' });
    assert.equal(caioJoin.ok, true);
    await lobbyFull;

    // não-host não inicia
    assert.equal((await call(beto, 'game:start')).ok, false);
    assert.equal((await call(ana, 'room:settings', { roundSeconds: 30 })).ok, true);

    const roundOnCaio = nextState(caio, (s) => s.phase === 'round');
    assert.equal((await call(ana, 'game:start')).ok, true);
    const r1 = await roundOnCaio;
    assert.equal(r1.round.number, 1);
    assert.ok(r1.round.endsAt > r1.serverNow);

    // Ana responde; Beto vê que ela respondeu mas não o quê
    const betoSeesAna = nextState(beto, (s) => s.players.find((p) => p.name === 'Ana')?.answered);
    assert.equal((await call(ana, 'round:submit', { text: 'A Caça' })).ok, true);
    const sb = await betoSeesAna;
    assert.equal(JSON.stringify(sb).includes('Caça'), false);

    const reveal = nextState(ana, (s) => s.phase === 'reveal');
    await call(beto, 'round:submit', { text: 'Titanic' });
    // nome ambíguo é recusado sem gastar a vez; Caio especifica e é aceito
    const vague = await call(caio, 'round:submit', { text: 'Batman' });
    assert.equal(vague.ok, false);
    assert.match(vague.error, /mais de um filme/);
    assert.equal((await call(caio, 'round:submit', { text: 'Cavaleiro das Trevas Ressurge' })).ok, true);
    const rev = await reveal;
    const byName = Object.fromEntries(rev.lastReveal.results.map((r) => [r.name, r]));
    assert.equal(byName.Ana.points, 99);
    assert.equal(byName.Beto.status, 'miss');
    assert.equal(byName.Caio.pos, 78);
    assert.equal(rev.lastReveal.jackpot.name, 'Ana');
    assert.deepEqual(rev.used.map((u) => u.pos), [78, 99]);

    // Beto cai e volta com a sessão (simula F5)
    beto.disconnect();
    beto2 = connect(url, opts);
    const resumed = await call(beto2, 'room:resume', { code: created.code, playerId: sb.me.id, token: 'x' });
    assert.equal(resumed.ok, false); // token errado é recusado

    // rodada 2 e encerramento
    const r2 = nextState(caio, (s) => s.phase === 'round' && s.round.number === 2);
    await call(ana, 'round:next');
    await r2;
    const dup = await call(caio, 'round:submit', { text: 'The Hunt' });
    assert.equal(dup.ok, false); // filme já queimado
    const reveal2 = nextState(ana, (s) => s.phase === 'reveal' && s.lastReveal.number === 2);
    await call(caio, 'round:submit', { text: 'Coringa' });
    await call(ana, 'round:submit', { text: 'Matrix' });
    await reveal2; // Beto está offline, então a rodada fecha sem ele

    const final = nextState(caio, (s) => s.phase === 'final');
    await call(ana, 'game:end');
    const f = await final;
    assert.deepEqual(f.ranking.map((r) => [r.name, r.score]), [['Caio', 169], ['Ana', 115], ['Beto', 0]]); // 78+91 e 99+16
  } finally {
    ana.close(); beto.close(); caio.close(); beto2?.close();
    io.close();
    await new Promise((r) => server.close(r));
  }
});
