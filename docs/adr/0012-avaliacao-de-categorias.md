# 0012 — Categorias validadas × experimentais, aleatória e voto no fim da partida

- **Status:** accepted
- **Data:** 2026-10-04
- **Decisores:** Hubert

## Contexto

A ideia do Hubert é ter **dezenas** de categorias, algumas geradas por IA para os jogadores
experimentarem. As validadas por ele ficam em evidência; as geradas por IA precisam de um
sistema de avaliação, com as mais bem avaliadas no topo e um botão de categoria aleatória
que aproveita o jogador para avaliar.

## Decisão (primeira etapa)

- Cada categoria tem `"status": "validada" | "experimental"` no JSON (padrão: experimental).
  Hoje: filmes e nomes validadas (o Hubert jogou as duas); países e cidades experimentais.
- Tela de categoria: botão **🎲 Categoria aleatória**, seção **⭐ Validadas** e seção
  **🧪 Experimentais**, ordenada por `ratingScore` (média de 👍 suavizada:
  `(up+1)/(up+down+2)`, para 1 voto não passar na frente de 40).
- Fim da partida: **"Essa categoria foi divertida?" 👍/👎**, uma vez por partida, com
  destaque quando a categoria veio do sorteio.
- Votos: `POST /api/ratings` (validado contra as categorias, limite de 30 votos por IP a cada
  10 min) somados em `runtime/ratings.json`; `GET /api/ratings` devolve os totais. No arquivo
  único (`npm run celular`), sem servidor, o voto fica só no aparelho (`localStorage`).
- **Gerar categorias por IA fica para um plano próprio**: precisa de checagem de qualidade
  (lista ordenada de verdade, fonte, 100 itens, conferência de grafias) antes de ir para o
  jogo como experimental.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Votos no servidor + aparelho (**escolhida**) | Simples, sem banco; funciona offline | Arquivo some se o servidor não tiver disco persistente (Render free) |
| Banco (SQLite/Postgres) | Durável, permite relatórios | Mais infraestrutura antes de ter jogadores |
| Só no aparelho | Zero servidor | Cada celular vê só os próprios votos |

## Consequências

- **Positivas:** base pronta para dezenas de categorias e para medir quais são divertidas.
- **Negativas / trade-offs:** sem login, alguém pode votar várias vezes (mitigado pelo
  limite por IP); no deploy gratuito os votos podem se perder a cada redeploy.
- **Confiança:** média.
- **Reavaliar se:** entrarem categorias geradas por IA em volume (aí vale banco e moderação).
