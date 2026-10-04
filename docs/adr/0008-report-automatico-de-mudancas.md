# 0008 — Report automático das mudanças da `main`, sem trava

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** Hubert

## Contexto

A proteção técnica da `main` não está disponível no plano gratuito com repositório
privado (HTTP 403), e o Hubert decidiu que **não quer trava**: quer só saber, sem
precisar perguntar, o que mudou em cada versão. O Zambelli trabalha em outro ritmo e
precisa do mesmo resumo.

## Decisão

Um workflow do GitHub Actions (`.github/workflows/novidades.yml`) roda a cada push na
`main` e comenta numa issue fixa, com a label `novidades`, contendo: título e descrição
do PR, linhas novas do `CHANGELOG.md`, autor e arquivos alterados, mencionando
`@artur-zambelli` e `@JVHubert`. O GitHub envia e-mail para quem está inscrito na issue.

Um push direto na `main` (sem PR) também aparece, marcado como "sem PR": o combinado
continua sendo PR sempre, e o report deixa visível quando isso não acontece.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Comentário numa issue fixa (**escolhida**) | E-mail nativo do GitHub, histórico num lugar só, sem segredo/token extra | Depende de cada um continuar inscrito na issue |
| GitHub Release a cada merge | Página de versões bonita | Exige versionar cada merge; e-mail só para quem acompanha releases |
| WhatsApp/Telegram | Chega no celular | Precisa de bot, token e serviço externo |
| Proteção da `main` | Impede push direto | Pago no repo privado; e o Hubert não quer trava |

## Consequências

- **Positivas:** ninguém precisa avisar ninguém; o `CHANGELOG` vira o próprio aviso.
- **Negativas / trade-offs:** usa minutos do Actions (≈15 s por merge; o plano grátis
  dá 2.000 min/mês para repositório privado).
- **Confiança:** alta.
- **Reavaliar se:** os e-mails virarem ruído (aí agrupar num resumo diário).
