# 0001 — Stack e backend de tempo real

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** fundadores do projeto

## Contexto

O jogo exige **estado compartilhado em tempo real** entre vários clientes: ver quem entrou
no lobby, quanto tempo falta na rodada, quem já respondeu, e revelar tudo ao mesmo tempo.
Não pode ser simulado com dados falsos. O time é de duas pessoas e o alvo é um MVP
genuinamente jogável, simples de rodar e de publicar.

## Decisão

- **Backend:** Node.js (ESM) + **Express** + **Socket.IO** (WebSocket com fallback).
- **Servidor autoritativo**: toda a pontuação é calculada no servidor.
- **Frontend:** HTML/CSS/JS puro, servido pelo próprio Express, **sem build step**.
- **Estado das salas em memória**; sem banco de dados no MVP.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Supabase/Firebase Realtime | sem servidor próprio, escala | menos controle, "estado autoritativo" mais difícil, lock-in |
| WebSocket puro (`ws`) | leve, sem dependências | reimplementar reconexão/rooms à mão |
| Build com React/Vite | ecossistema, componentes | mais setup e passos para um "noob" rodar |
| Colyseus (framework de jogos) | pronto para salas/estado | mais conceitos novos para aprender |

## Consequências

- **Positivas:** roda com `npm install && npm start`; um só processo serve UI e realtime;
  fácil de hospedar (Render/Railway/Fly); regras puras e testáveis.
- **Negativas:** estado em memória não sobrevive a restart e não escala horizontalmente
  sem Redis. Sem framework de UI, telas são mais verbosas.
- **Confiança:** alta.
- **Reavaliar se:** precisarmos de múltiplas instâncias, persistência de partidas ou
  crescimento do frontend que justifique um build.
