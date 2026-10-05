// Pontuacao do Top 100 (ver docs/adr/0014). Linear: o item vale a propria posicao.
//   #100 -> 100   #95 -> 95   #50 -> 50   #1 -> 1
// Roda no servidor e no navegador (servido em /shared/scoring.js).

/** Pontos de um item na posicao `pos` (1 a 100). Fora da lista vale 0, em quem chama. */
export function pointsFor(pos) {
  return pos;
}
