// Textos que dependem da categoria ("filme", "cidade", "nome"...). Cada JSON de categoria
// pode trazer um bloco "ui"; o que faltar cai nestes padroes. Roda no servidor e no
// navegador (servido em /shared/category-ui.js), por isso sem dependencias de Node.

const DEFAULTS = Object.freeze({
  noun: 'item',
  prompt: 'Qual item está perto do fundo do top 100?',
  placeholder: 'Digite sua resposta',
  empty: 'Digite uma resposta.',
  ambiguous: 'Esse nome serve para mais de um item da lista. Escreva o nome completo.',
  burned: '{item} já saiu nesta partida. Escolha outro.',
  example: null, // posicao de um item baixo da lista para a tela "Atencao ao truque"
  about: null, // contexto da lista (paragrafos) mostrado na tela "Atencao ao truque"
  aboutLink: null, // { href, label } para saber mais
});

/** Textos da categoria com os padroes preenchidos. */
export function categoryUi(category) {
  return { ...DEFAULTS, ...(category?.ui || {}) };
}

/**
 * Nome da categoria sem o "Top 100" do começo: a tela mostra o selo TOP 100 no lugar.
 * "Top 100 maiores cidades do Brasil" -> "Maiores cidades do Brasil".
 */
export function categoryTitle(name) {
  const rest = String(name).replace(/^top\s*100\s+/i, '').trim();
  return rest.charAt(0).toLocaleUpperCase('pt-BR') + rest.slice(1);
}

/** Troca {chave} pelo valor correspondente. */
export function fillText(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (all, k) => (k in vars ? String(vars[k]) : all));
}

/**
 * Nota para ordenar categorias pela avaliação: média de 👍 com suavização (começa em 50% e só
 * se afasta com votos de verdade), para 1 voto não passar na frente de 40.
 */
export function ratingScore({ up = 0, down = 0 } = {}) {
  return (up + 1) / (up + down + 2);
}
