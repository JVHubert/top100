# 0013 — Repositório público, site instalável no GitHub Pages e negócio separado

- **Status:** accepted
- **Data:** 2026-10-04
- **Decisores:** Hubert (com o ok do Zambelli)

## Contexto

O Hubert quer o jogo num endereço fixo, como o afinador (`jvhubert.github.io/afinador`).
O GitHub Pages gratuito só publica repositórios públicos e só serve arquivos estáticos.
O modo num celular só já é um HTML único (`npm run celular`); o modo online precisa de
servidor e não roda no Pages. Planos de monetização não podem ficar públicos.

## Decisão

- **`JVHubert/top100` fica público.** Antes, os dados sensíveis saem do código: o e-mail
  do Zambelli deixa de ser o padrão do instalador (`ferramentas/instalar-top100.cmd`
  agora pergunta nome e e-mail), e menções a monetização saem do ROADMAP e da arquitetura.
- **Negócio em repositório privado:** `JVHubert/top100-negocio` (estudo de monetização do
  Zambelli e o que vier de preços, parcerias e números). Nada de lá vai para o público.
- **Site:** `.github/workflows/site.yml` roda os testes, gera `dist/site` e publica no
  Pages a cada merge na `main` (`https://jvhubert.github.io/top100/`). O site é o modo num
  celular só, instalável como app (manifesto + service worker, funciona sem internet). O
  service worker recebe uma versão nova a cada build (data + commit): quem instalou recebe
  a atualização sozinho, sem ninguém lembrar de "aumentar a VERSAO".
- **Sem pôsteres de filme.** Os pôsteres da Wikipedia não têm licença livre, e pôsteres
  gerados por IA que lembrem o filme continuam sendo obra derivada (personagens, marca do
  título, rosto dos atores). A função foi removida.
- O modo online continua no código (`/online`), "em breve" na tela inicial.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Público + Pages via Action (**escolhida**) | Grátis; publica sozinho a cada merge; dá para ligar proteção da `main` | Código e histórico visíveis |
| Repositório público só com o arquivo gerado | Código continua privado | Dois repositórios; token entre eles |
| GitHub Pro | Pages com repositório privado | US$ 4/mês |

## Consequências

- **Positivas:** link fixo e app instalável; publicar = fazer merge; proteção da `main`
  passa a ser possível (repositório público).
- **Negativas / trade-offs:** o histórico antigo continua visível (ver nota abaixo);
  votos 👍/👎 no site ficam só no aparelho (não há servidor).
- **Histórico:** reescrever não bastaria (o GitHub guarda uma cópia fixa de cada PR, e o
  PR #3 tinha o e-mail do Zambelli). Decisão: o repositório antigo virou
  `JVHubert/top100-historico` (privado, arquivado, com todos os PRs até 04/10/2026) e o
  `top100` público recomeçou do estado de 04/10/2026 num único commit. Números de PR
  citados no CHANGELOG e no devlog (#1 a #31) são os do repositório histórico.
- **Confiança:** alta.
- **Reavaliar se:** o modo online for para produção (aí precisa de um host com servidor).
