# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/en/2.0.0/) e o projeto
adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

Tipos de mudança: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

## [Unreleased]

### Added

- **"Qual você quis dizer?"** (modo num celular só, ADR-0015): quando o chute não bate com certeza, o jogo oferece até 3 itens parecidos (busca por trigramas) e "Nenhum desses: enviar como escrevi". "villa nova de goias" passa a achar o Vila Nova (#29); nome ambíguo ("atletico") vira a lista de opções em vez de recusa. Aberta a pergunta, não dá para redigitar.
- **Número de rodadas** (modo num celular só): nova etapa depois da categoria, com barra de 1 a 10 e campo para digitar (padrão 5). O jogo mostra "Rodada 3 de 10" e, na última, a revelação leva ao resultado final. Cravar 95+ continua podendo encerrar antes, e "Mais um round..." no fim abre rodadas extras.
- **Voltar sem sair do jogo** (modo num celular só): o título **TOP 100** no topo leva ao início, e a tela "Atenção ao truque" ganhou **Escolher outra categoria** e **Escolher outros jogadores**. Só pede confirmação se a partida já tem rodada jogada.
- **Selo TOP 100** (mini da arte do topo) no lugar do "Top 100" repetido nos nomes das categorias (cartões, explicação, topo, fim de partida).
- Campo `ui.about` na categoria: contexto mostrado na tela "Atenção ao truque". Primeiro uso: o programa do SBT de 2012, com link para a Wikipédia.
- **Site público instalável como app** (https://jvhubert.github.io/top100/), publicado por GitHub Action a cada merge na `main`; funciona sem internet e se atualiza sozinho (ADR-0013).
- Três categorias novas (experimentais), com listas copiadas dos sites pelo Hubert: **séries segundo o IMDb**, **sobrenomes mais comuns do Brasil** e **nomes de bebês nascidos de 2020 a 2022** (IBGE, Censo 2022).
- Quatro categorias novas (experimentais): **O Maior Brasileiro de Todos os Tempos (SBT, 2012)**, **100 maiores músicas brasileiras (Rolling Stone Brasil)**, **marcas mais valiosas (Interbrand 2025)** e **clubes no Ranking Nacional da CBF (2026)**, todas com conferência de grafias em teste.
- **Morte súbita**: quem crava 95+ que ainda pode ser superado (ex.: #98) abre a opção "Só mais uma rodada (morte súbita)": se ninguém passar da posição, acabou; se alguém passar, o jogo segue.
- `docs/categorias-candidatas.md`: banco de ideias de categorias com validação de fontes, revisado (critérios de jogabilidade e reconhecimento, correções e mais sugestões).
- Melhor palpite de cada jogador fica marcado no painel 1 → 100 (régua e barras) até ser superado.
- **"Mais um round..."** na tela final: reabre a partida mantendo placar e queimados, quantas vezes quiserem.
- Países: nomes em inglês (Iran, Japan, Germany...) e grafias alternativas (Philipinas, Thailandia) valem.
- Categorias **⭐ Validadas** × **🧪 Experimentais** (campo `status`), botão **🎲 Categoria aleatória** e voto **"Essa categoria foi divertida?"** no fim da partida (`/api/ratings`; no arquivo do celular o voto fica no aparelho). Experimentais ordenadas pela avaliação. ADR-0012.
- Nomes: grafias alternativas contam como a forma da lista (Raphael = Rafael, Thyago = Thiago, Kamila = Camila). Checklist de conferência de grafias obrigatória para categoria nova.
- Categoria **Top 100 maiores cidades do Brasil** (IBGE, Censo 2022, SIDRA tabela 4709), com UF e população no ingresso e apelidos (Sampa, Rio, BH, Floripa, POA...).
- Categoria **Top 100 países mais populosos** (ONU, World Population Prospects 2024), com nomes em português, apelidos (EUA, Holanda, Birmânia...) e a população no ingresso.
- Categoria **Top 100 nomes mais comuns do Brasil** (IBGE, Censo 2022), sem tolerância a erro de digitação para nomes parecidos não se confundirem.
- `test/categories.test.js`: checagens que valem para todas as categorias.
- Várias categorias (ADR-0010): o host escolhe no lobby online e o grupo escolhe no
  cadastro offline. Cada categoria traz seus textos (`ui`), opções de reconhecimento
  (`match`) e um detalhe por item (`detail`). O arquivo para celular embute todas.
- Palpite ambíguo ("batman") é recusado no envio com "escreva o nome completo" e o jogador continua com a vez, online e offline (ADR-0009).
- Palpite fora da lista mostra "Não encontramos “tubarão” entre os 100 desta lista.", deixando claro que o nome foi lido.
- Celular: na tela de resposta o campo fica no topo e os erros (filme repetido, campo vazio) aparecem logo abaixo dele, visíveis com o teclado aberto; avisos vão para o topo da tela. Cronômetro vira um chip pequeno no online.
- Celular: a revelação mostra uma barra por jogador (1 → 100, número grande ao lado), no lugar da régua feita para tela de computador. Régua e ingressos agora vêm de `public/reveal-view.js`, compartilhado pelos dois modos.

- Modo offline (`/offline`) refeito com o visual da versão do Zambelli: régua 1→100 com
  os palpites da rodada, ingressos de resultado, placar, painel "Já saíram", pódio.
- Offline: tela "Atenção ao truque" antes da 1ª rodada explicando que o alvo é o nº 100,
  não o nº 1 (#9); filme já revelado é recusado (#7); aviso de 95+ sugerindo encerrar a
  partida, visível para todos (#11).
- `npm run celular`: gera um único HTML do modo offline (fontes e lista embutidas, pôsteres
  opcionais) para abrir no celular sem servidor (`ferramentas/gerar-celular.mjs`).
- Link entre os modos: tela inicial online → passa-o-celular, e vice-versa.
- Report automático: a cada merge na `main`, um GitHub Action comenta na issue fixa
  "📣 Novidades da main" (e-mail para os dois). Ver `docs/adr/0008`.
- Base do jogo trocada pela versão do Zambelli (ADR-0007), convertida para ESM em `src/`:
  reconhecimento de títulos em português e com erro de digitação (`src/matcher.js`),
  sessão com reconexão (F5 não tira ninguém da partida), filme "queimado", host escolhe o
  tempo da rodada, link de convite `/?sala=ABCD`, régua de revelação, pódio e
  "Jogar de novo". Visual da versão antiga de volta no modo online.
- Segurança do servidor: rate limit por conexão, `maxHttpBufferSize`, CSP e cabeçalhos,
  validação fechada de nome/personagem/cor, faxina de salas abandonadas, `GET /healthz`.
- Testes da versão antiga: reconhecimento, regras da sala e ponta a ponta com 3 clientes
  (34 testes no total).
- ADR-0006: convergência das duas versões (jogo da versão do Zambelli, processo da `main`).
- Estrutura inicial do projeto (backend Node + Express + Socket.IO, frontend estático).
- Modo online: criação de sala com código, entrada por código, nome e avatar, início pelo host.
- Mecânica de rodada: timer, respostas ocultas até o fim, revelação com posição real e pontos.
- Pontuação: `pontos = posição no ranking`; item fora do top 100 vale `0`.
- Placar acumulado entre rodadas e tela de resultado final.
- Categoria "Top 100 filmes segundo o IMDb" populada a partir de um snapshot estático.
- Modo offline (passa-o-celular) disponível em `/offline.html`.
- Avaliação de categoria (👍/👎) com destaque das favoritas.
- Botão de "concede" oferecido quando um jogador faz 95+ pontos na rodada.
- Documentação: README, CONTRIBUTING, CLAUDE.md, ROADMAP, STATUS, ADRs e guias.
- Guia `docs/guias/subir-no-github.md`: instalação, autenticação com `gh`, clonagem,
  publicação e abertura do primeiro Pull Request, com tabela de erros comuns.
- Guia `docs/guias/entrar-no-projeto.md`: onboarding do parceiro — aceitar o convite,
  clonar, rodar, fluxo diário, como acompanhar mudanças sem reunião e o que fazer com
  uma versão antiga do jogo.
- Scripts de instalação em um clique para Windows em `ferramentas/`:
  `instalar-top100.cmd` (confere Git e Node, configura a identidade, clona o projeto,
  instala e roda os testes), `jogar-top100.cmd` (atualiza e sobe o servidor) e
  `login-github.cmd` (opcional, para o GitHub CLI).
- `.gitattributes` fixando `*.cmd` como CRLF e `.sh` como LF.

### Fixed

- Mural de novidades falhava no primeiro commit de um repositório (não há commit anterior para comparar).
- Celular: "Passe o celular para" aparecia abaixo do botão na tela de passar o aparelho.
- Pôster de filme aparecia em outra categoria (ex.: #95 de nomes): pôsteres agora são por categoria.
- Celular: linha vazia "1 … 100" acima das barras trocada por uma linha de chegada em cada trilho.
- Fim de linha dos arquivos `.cmd`: o Git os guardava como **LF**, então um clone com
  `core.autocrlf=false` traria os scripts sem CRLF — e aí o `goto` e os rótulos
  (`:sem_git`, `:falhou_clone`) param de funcionar, matando o instalador no meio em vez
  de mostrar a mensagem de erro.

### Changed

- **Pontuação linear** (ADR-0014, substitui o ADR-0011): cada item vale a sua posição (#1 vale 1, #100 vale 100). A quadrática confundia: a revelação mostrava "#37" e "+14" lado a lado (#4).
- A tela de explicação anuncia a categoria em destaque ("🎲 Categoria sorteada" quando veio do sorteio), com "Atenção ao truque" logo abaixo.
- Cravar 95+ **encerra a partida** (antes era só um aviso amarelo); a revelação oferece "Ver resultado final".
- **Fluxo em 3 etapas**: início (num celular só / online "em breve") → jogadores → categoria. No fim da partida: jogar de novo, trocar categoria ou trocar jogadores. `/` abre esse fluxo; o online foi para `/online` (convites `/?sala=` redirecionam).
- **Pontuação quadrática** (ADR-0011): pontos = posição² ÷ 100, arredondado para cima (#95 vale 91, #50 vale 25, #20 vale 4). Arriscar perto do 100 compensa.
- Snapshot do IMDb: passa a ser o da versão do Zambelli (22/09/2026, com títulos em PT e
  apelidos), em JSON (`src/data/categories/top100-filmes-imdb.json`).
- Modo offline usa o mesmo reconhecimento de títulos do online; regras em
  `src/offline-rules.js`. Endereço: `/offline`.
- `old_version/` no `.gitignore` (evita commitar a árvore antiga com `node_modules`).
- Política de revisão de Pull Request passou a ser **opcional e não bloqueante**: o PR é
  registro do que mudou, não porteira (ver `docs/adr/0005`).
- `main` exige Pull Request por combinado, sem aprovação de terceiros. A proteção técnica
  não está disponível no plano gratuito com repositório privado (ver `devlog/2026-10-03-convergencia.md`).

### Removed

- Pôsteres de filme (sem licença livre; ADR-0013).
- E-mail do parceiro como padrão no instalador `.cmd` (agora pergunta nome e e-mail).
- Menções a monetização dos documentos públicos (planos no repositório privado `top100-negocio`).
- Temporariamente: avaliação 👍/👎 de categoria e banner de "concede" (voltam em PRs
  próprios; ver ADR-0007 e issue #11).
- `test/integration.test.js` (substituído por `test/e2e.test.js`).

## [0.1.0] - 2026-10-03

### Added

- Primeira consolidação do projeto no Git, substituindo a versão inicial desenvolvida
  manualmente fora do controle de versão.
