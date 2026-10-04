// Pontuacao do Top 100 (ver docs/adr/0011). Quadratica para valorizar o fundo da lista:
// quem arrisca e crava um #95 deve valer muito mais do que varios #20 seguros.
//   #100 -> 100   #95 -> 91   #90 -> 81   #50 -> 25   #20 -> 4   #10 -> 1   #1 -> 1
// Roda no servidor e no navegador (servido em /shared/scoring.js).

/** Pontos de um item na posicao `pos` (1 a 100). Fora da lista vale 0, em quem chama. */
export function pointsFor(pos) {
  return Math.ceil((pos * pos) / 100);
}
