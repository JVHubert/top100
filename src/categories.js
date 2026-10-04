// Registro de categorias disponiveis. Cada categoria e um snapshot JSON em
// src/data/categories/ (formato: { id, name, snapshot, items: [{ pos, title, pt, aliases }] }).
// Para adicionar uma, crie o JSON e registre o arquivo em FILES. Ver docs/categorias.md.

import fs from 'node:fs';

const FILES = ['top100-filmes-imdb.json', 'top100-nomes-brasil.json', 'top100-paises-populacao.json', 'top100-cidades-brasil.json',
  'top100-maior-brasileiro-sbt.json', 'top100-musicas-brasileiras-rs.json', 'top100-marcas-interbrand.json', 'top100-clubes-cbf.json',
  'top100-series-imdb.json', 'top100-sobrenomes-brasil.json', 'top100-nomes-bebes-2020-2022.json',
];

const REGISTRY = FILES.map((file) =>
  JSON.parse(fs.readFileSync(new URL(`./data/categories/${file}`, import.meta.url), 'utf8')),
);

export const DEFAULT_CATEGORY_ID = REGISTRY[0].id;

/** Lista enxuta (sem os itens) para montar a UI de selecao. */
export function listCategories() {
  return REGISTRY.map((c) => ({
    id: c.id,
    name: c.name,
    source: c.snapshot.source,
    snapshotDate: c.snapshot.date,
    itemCount: c.items.length,
    status: c.status === 'validada' ? 'validada' : 'experimental', // validada pelo Hubert ou em teste
  }));
}

export function getCategory(id) {
  return REGISTRY.find((c) => c.id === id) ?? null;
}
