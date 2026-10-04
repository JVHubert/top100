// Votos "essa categoria foi divertida?" (👍/👎), somados por categoria e guardados num JSON
// em runtime/ (ignorado pelo Git). Ver docs/adr/0012.

import fs from 'node:fs';
import path from 'node:path';

export { ratingScore } from './category-ui.js';

export const VOTES = Object.freeze(['up', 'down']);

export function createRatingsStore(file) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    data = {}; // primeira vez (ou arquivo corrompido): começa do zero
  }

  function save() {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('[avaliacoes] não foi possível salvar:', err.message);
    }
  }

  return {
    /** { idDaCategoria: { up, down } } */
    all() {
      return JSON.parse(JSON.stringify(data));
    },
    add(categoryId, vote) {
      if (!VOTES.includes(vote)) throw new Error('voto inválido');
      const entry = (data[categoryId] ??= { up: 0, down: 0 });
      entry[vote] += 1;
      save();
      return { ...entry };
    },
  };
}
