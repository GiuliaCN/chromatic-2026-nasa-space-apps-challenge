# Chromatic: Space Mission Designer

**Design. Decide. Discover.** Jogo web 2D de engenharia de sistemas para o *NASA Space Apps Challenge 2026* (desafio 13, *Space Mission Design Game*). O jogador projeta uma missão fictícia de observação da Terra (**Earth Watchers**), lança e opera o satélite por **24 meses** e recebe um relatório que explica como suas escolhas moldaram o resultado.

- Frontend estático (HTML + CSS + JavaScript ES modules + SVG). Sem backend, login, banco, APIs ou chaves.
- Todo conteúdo e todos os números do jogo estão em JSON (`public/data/`).
- O jogo é em **inglês**; esta documentação está em português.
- Os números do jogo são **simplificados e fictícios**. Não são dados reais de dimensionamento aeroespacial. 

## Requisitos e comandos

Requer **Node 22 ou superior** (usa `node --test` e Vite 8).

```bash
npm install
npm run dev            # servidor de desenvolvimento (Vite)
npm test               # testes do motor (node:test), inclui a calibração
npm run build          # gera dist/ (site estático)
npm run preview        # serve dist/ localmente
npm run validate:data  # valida os JSON de public/data/ e imprime os erros
```

## Estrutura

```text
public/data/        JSON do jogo (game, content.en, science-goals, orbits, payloads,
                    spacecraft, launchers, events, audio) + logo.jpeg
public/audio/       música (music/) e efeitos sonoros (sfx/) servidos pelo jogo
music/              arquivos de áudio originais, com README/LICENSE de cada som (não vai para o build)
src/core/           regras puras, sem DOM: calculations, validation, simulation, rng,
                    game-state, storage, data-loader, config-validator, i18n, rules
src/ui/             shell, navegação, componentes SVG e as 10 telas
src/styles/         tokens.css (paleta), global.css, screens.css
tests/              testes do motor + fixtures/reference-configs.json
scripts/            validate-data.mjs e explore-balance.mjs (ferramenta de calibração)
design/references/  imagens de referência visual
```

Separação de responsabilidades: a UI só renderiza estado e despacha ações. Toda fórmula está em `src/core/`. Os JSON não têm código executável: efeitos e condições de eventos são tipos conhecidos pelo motor.

## Como publicar

O build usa `base: './'`, então todas as URLs (JS, CSS, logo e JSON) são relativas. O mesmo `dist/` funciona na raiz de um domínio e em um subcaminho. A navegação é por estado interno, sem rotas profundas, então não há dependência de fallback do servidor. O build de subcaminho foi testado servindo `dist/` em `/chromatic-2026-nasa-space-apps-challenge/`.

**GitHub Pages**

1. Em *Settings → Pages*, escolha *Source: GitHub Actions*.
2. Faça push na `main`. O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda `npm ci`, `npm test`, `npm run build` e publica `dist/`.
3. Se preferir uma base absoluta, use `BASE_PATH=/nome-do-repo/ npm run build`.

**Cloudflare Pages**

- Build command: `npm run build`. Output directory: `dist`.
- Variável de ambiente `NODE_VERSION=22`.
- Não é preciso configurar base.

**Offline**: depois que a página carrega, todo o jogo roda sem rede (os JSON ficam em memória). Isso foi verificado desligando a rede no navegador e jogando até o Debrief. Se a rede cair no carregamento, o loader tenta o cache do navegador. Não há PWA nem service worker. Os arquivos de áudio são baixados sob demanda; sem rede e sem cache, o jogo simplesmente fica em silêncio.

## Como editar o jogo (JSON)

Edite os arquivos em `public/data/` e rode `npm run validate:data`. O jogo também valida tudo ao carregar e mostra uma tela de erro amigável, com a lista de problemas, se algo estiver errado.

| Arquivo | Conteúdo |
|---|---|
| `game.json` | orçamento, duração, meta, `operationsCostM`, `eventChancePerMonth`, `reliabilitySensitivity`, `batteryAvailabilityFloor`, `minEffectMultiplier`, `lowPowerMarginRatio`, `lowReliabilityThreshold`, `dataVersion`, ordem das etapas |
| `science-goals.json` | objetivos e `priorityMultiplier` de cada um |
| `orbits.json` | multiplicadores de observação por objetivo, custo de lançamento, eclipse, altitude, inclinação |
| `payloads.json` | instrumentos: custo, massa, potência, dados e ciência por objetivo |
| `spacecraft.json` | `buses`, `powers`, `comms` |
| `launchers.json` | capacidade, órbitas suportadas e confiabilidade |
| `events.json` | eventos: peso, duração, efeitos e condições |
| `content.en.json` | todos os textos: UI, itens, ajuda por tela (`help.<tela>`), glossário, mensagens de validação e do relatório |
| `audio.json` | arquivos e volumes da música e dos efeitos, música de cada tela (`musicByScreen`, `null` = silêncio), duração do fade e créditos |

- Unidades ficam no nome do campo: `massKg`, `powerW`, `costM`, `dataGbPerMonth`, `storageGb`, `batteryWh`, `eclipseDurationH`.
- Nomes e descrições são referenciados por `nameKey` e `descriptionKey` (chave pontuada em `content.en.json`). `visualSlot` liga o item a uma peça SVG já existente.
- **Efeitos** aceitos: `powerGenerationMultiplier`, `instrumentAvailabilityMultiplier`, `downlinkMultiplier`, `scienceOpportunityMultiplier`. **Condições** aceitas: `powerMarginRatioBelow`, `downlinkMarginRatioBelow`, `hasInstrument`, `orbitIs`, `goalPriorityIs`. Um tipo novo exige código em `simulation.js` e testes.
- Adicionar um item novo com id novo funciona sem tocar em JS, mas um `visualSlot` novo precisa de uma peça em `spacecraft-svg.js`.
- Ao mudar números relevantes, **suba `dataVersion`** em `game.json`: saves antigos são descartados com aviso amigável.
- Depois de mexer em números, rode `npm test`. O teste de calibração (abaixo) avisa se o equilíbrio quebrou.

### Calibração (`tests/balance.test.js`)

`tests/fixtures/reference-configs.json` guarda 3 configurações de referência (usadas só em teste). Os valores abaixo vêm da execução atual, com as 10 seeds fixas de `tests/helpers.js`.

| Configuração | Prioridade | Órbita | Custo | Massa | Vitórias | Ciência média |
|---|---|---|---:|---:|---:|---:|
| `fire-balanced` (4 instrumentos, margens médias) | wildfires | equatorial | $262M | 635 kg | 10/10 | 72,9 |
| `forest-lean-radar` (mais barata e leve, confiabilidade baixa, sem folga de downlink) | deforestation | SSO | $230M | 480 kg | 10/10 | 70,7 |
| `air-premium` (pesada, cara e com folgas) | airQuality | SSO | $295M | 740 kg | 10/10 | 79,8 |

O teste exige:

- as 3 sem bloqueios;
- meta em pelo menos 9 de 10 seeds;
- cada par difere ≥10% em ao menos 2 entre custo, massa e ciência;
- uma configuração por prioridade;
- existem designs válidos que falham: `slow-link` (UHF, 0/10) e `single-camera` (0/10);
- nenhum design com os 5 instrumentos é lançável (orçamento e massa forçam escolhas);
- nenhuma opção domina estritamente as outras da mesma categoria.

Panorama de todos os designs (`node scripts/explore-balance.mjs`): 14.685 designs válidos, dos quais 687 vencem em ≥9 de 10 seeds. Os pontos de equilíbrio ficam em 3 a 4 instrumentos, e os designs de 1 instrumento nunca vencem.

## Modelo simplificado e limitações científicas

- Ciência potencial = soma da ciência dos instrumentos × multiplicador da órbita × peso da prioridade. A ciência só é creditada quando os dados são **transmitidos** (buffer, downlink e overflow).
- A bateria só cobre o eclipse e nunca compensa déficit de geração contínua.
- A órbita é um perfil didático. Altitude, inclinação e revisita são ilustrativas, e SSO é um caso de órbita baixa. Não há mecânica orbital, propulsão, combustível, radiação real, nem dimensionamento de enlace.
- Eventos são sorteios com pesos e efeitos multiplicativos. A confiabilidade só altera a probabilidade dos eventos negativos.
- O resultado é determinístico dado o design e a seed, mas é um modelo de ensino, não uma previsão.

## Decisões em conflito ou ambiguidade

Aplicada a hierarquia do `CLAUDE.md` (restrições técnicas > escopo > design > imagens).

| Tema | Decisão |
|---|---|
| Nome do arquivo de instruções | O repositório tem `CLAUDE.md`, cujo conteúdo se intitula `AGENTS.md`. Tratado como o mesmo documento. |
| Imagens mostram 3 missões (Easy, Medium, Hard) | Só **Earth Watchers**, conforme o escopo (Marte e outras missões são P2). |
| Imagem do briefing tem a prioridade "Balanced" | Removida: o escopo exige 1 entre 3 prioridades. |
| Stepper de 7 etapas (com "Profile") | Stepper de **6 etapas**: Briefing, Orbit, Payload, Systems, Launch, Review. O briefing já inclui o perfil. |
| Telas de lançamento/simulação/debrief no stepper | Essas telas ocultam o stepper e mostram a fase no cabeçalho, porque o stepper cobre o planejamento. |
| Combustível, contadores de painéis/baterias, "Options", "Credits", "Integrity", TB, "Objectives achieved" | Não aparecem: não estão no escopo. "Objectives achieved" vira pontos por objetivo (o escopo não define meta por objetivo). |
| Título fixo "Spacecraft Design" e textos em português nas imagens | Título por tela; todo o texto em inglês, vindo do JSON. |
| Vitest | O Vitest 5.1 falhou com o Vite 8 nesta máquina, mesmo em um teste trivial. Usado o **runner nativo do Node** (`node --test`), permitido pelo `CLAUDE.md`. |
| `priorityMultiplier` | O design sugere ×1,5 como valor inicial. Calibrado em **×1,8 (wildfires), ×2,0 (deforestation) e ×2,0 (airQuality)** para a meta de 60 pontos ser atingível com 3 a 4 instrumentos. |
| Custos | Custos de subsistemas e lançadores e `operationsCostM` (20) calibrados para o teste (budget $300M). |
| Duração de evento | `durationMonths` é a do próprio evento. Efeitos ativos simultâneos multiplicam-se. Eventos positivos não recebem o fator de confiabilidade. Sempre são consumidos 2 sorteios por mês, para que seeds sejam comparáveis. |
| `powerMarginRatioBelow` e `downlinkMarginRatioBelow` | Usam a margem **nominal** do projeto. |
| Parâmetro extra | `lowReliabilityThreshold` em `game.json`, para o aviso de confiabilidade baixa. |
| Bloqueio de orçamento | O link **Edit** leva ao Payload (principal alavanca de custo). |
| Prioridade ausente | Bloqueio extra `missingPriority`, já que o escopo exige exatamente 1 prioridade. |
| Impacto de eventos no relatório | Calculado por contrafactual exato (simula novamente com aquela ocorrência neutralizada) e agrupado por evento. |
| Save | Guarda só IDs, `schemaVersion`, `dataVersion` e a seed. O resultado da simulação é recalculado ao carregar. Em Continue após refresh no meio da simulação, a reprodução recomeça no mês 1. |
| Try Again | Descarta resultado e seed e volta à tela **Review**, com todas as escolhas editáveis. |
| Animação | O "Skip" vira "Continue" com `prefers-reduced-motion`, e o quadro final é mostrado de imediato. |
| Áudio | O `design-jogo.md` deixava o áudio fora do MVP, mas a equipe pediu a trilha e os efeitos, que foram implementados sem afetar o motor (ver *Áudio* abaixo). Foi usada a faixa **GameLoop2** no lugar de **Gameloop**. |

## Referências visuais

Implementadas a partir de `design/references/` (aparência e composição), sem usar nenhuma imagem como fundo: tudo é HTML, CSS e SVG.

- `07-launch-planning.png` é **idêntica** a `06-spacecraft-design.png` (mesmo md5), e **não existem** imagens para Launch Planning e Mission Review (faltam os arquivos 03 e 08). Essas duas telas seguem `design-jogo.md` e o mesmo sistema visual.
- Diferenças intencionais: paleta e componentes seguem os tokens do `design-jogo.md`; a arte (Terra, satélite, foguete) é SVG próprio e mais simples que as ilustrações de referência; as telas sem referência foram inferidas do documento; não foi carregada nenhuma fonte externa, e o título usa uma pilha de fontes do sistema em itálico/maiúsculas.
- Fonte e logo: `logo.jpeg` e os arquivos de `public/audio/` são os únicos assets binários e estão no repositório.

## Roteiro de demonstração (5 minutos)

1. **Menu e briefing (0:30).** *New Mission*. Mostre Earth Watchers: $300M, 24 meses, meta de 60 pontos. Escolha **Fire Monitoring** (×1,8) e mostre os pesos.
2. **Órbita (0:40).** Compare LEO, SSO e Equatorial: multiplicadores por objetivo, custo de lançamento e eclipse. Escolha **Equatorial**.
3. **Payload (0:50).** Selecione Multispectral Camera, Thermal Sensor e **Synthetic Aperture Radar**. Os indicadores e o satélite mudam a cada clique, com custo, massa, consumo e dados subindo.
4. **Systems e erros reais (1:00).** Em *Communications*, escolha o **X-band**. Em *Spacecraft Bus*, escolha o **Light Bus**: o painel mostra o bloqueio de capacidade (a carga de payload, energia e comunicação passa dos 400 kg suportados); troque para o **Standard Bus**. Em *Power*, escolha o **Compact Array**: aparece o *déficit de potência* (365 W de demanda contra 350 W de geração), e a bateria não resolve. Corrija com o **Standard Array**.
5. **Launch e Review (0:40).** Escolha **Condor-M** (o Sparrow-1 mostra "too heavy"). Na revisão, mostre o checklist (OK, Warning, Blocked) e o *Edit*. *Approve and Launch*.
6. **Animação e simulação (1:00).** Mostre a animação e use *Skip*. Na simulação, use Pause, Play, 5× e 10×, e destaque um evento ligado ao projeto (banner, tabela de eventos, satélite reagindo).
7. **Debrief (0:40).** Mostre o resultado, a ciência por objetivo, dados transmitidos e perdidos, "What helped / What hurt" e a seed. *Try Again* e troque para um **UHF Link** (aviso, mas lançável): o Debrief mostra o downlink gargalando. Mensagem final: outras combinações também funcionam. O resultado varia com a seed, e esse primeiro design costuma ficar perto da meta de 60 pontos; isso também é parte da lição.

## Testes e verificação

`npm test` roda 97 testes: validador de configuração (inclusive `audio.json`), fórmulas, validação, simulação, estado e save, preferências de som, falhas do loader, cobertura de chaves de texto e calibração.

Verificado manualmente no Chrome (1440×900 e 1280×720), sem erros de console:

- fluxo completo do menu ao debrief;
- refresh e Continue (inclusive no meio da simulação);
- Back e Edit;
- lançamento bloqueado;
- Pause, Play, 5×, 10× e Skip to Results;
- Try Again com seed nova;
- save incompatível e save corrompido;
- `prefers-reduced-motion`;
- JSON inválido;
- build em subcaminho e jogo offline após o carregamento;
- axe-core (WCAG 2 A/AA e boas práticas): 0 violações em todas as telas e no diálogo.

## Áudio

O módulo `src/ui/audio.js` só toca sons: não lê nem altera o estado do jogo, e qualquer falha (autoplay bloqueado, arquivo ausente, offline) é silenciosa. Os navegadores só liberam o som depois do primeiro clique ou tecla, então a música começa na primeira interação.

| Momento | Som (`audio.json`) | Arquivo |
|---|---|---|
| Menu principal | música `menu` | `music/main-menu.mp3` (*Main Menu*) |
| Planejamento, lançamento, simulação e debrief | música `mission` | `music/game-loop.wav` (*GameLoop2*) |
| Passar o mouse em botões e links | `hover` | `sfx/button-hover.wav` |
| Clique em botões e links | `click` | `sfx/button-click.wav` |
| Adicionar instrumento, escolher energia, comunicação, bus ou lançador | `purchase` (substitui o clique) | `sfx/purchase.mp3` |
| Abrir *Why does this matter?*, *Glossary* e *How to Play* | `advice` | `sfx/advice-notification.wav` |
| Animação: contagem regressiva, decolagem e satélite em operação | `countdown`, `liftoff`, `arrive` | `sfx/launch-countdown.mp3`, `sfx/rocket-launch.mp3`, `sfx/arrive.mp3` |
| Simulação: evento negativo / positivo | `eventNegative` / `eventPositive` | `sfx/unexpected-event.mp3` / `sfx/advice-notification.wav` |

- Botões **Music** e **Sound effects** no menu e na barra superior. A preferência fica em `localStorage` (`chromatic.audio.v1`), separada do save, e por isso não é apagada por *New Mission*.
- Cliques e hovers são tratados por delegação de eventos. Se a ação do clique já tocou um som mais específico (compra, ajuda, contagem), o clique simples não toca.
- O validador exige todos os efeitos usados pela UI, volumes entre 0 e 1, `musicByScreen` cobrindo todas as telas e caminhos relativos dentro de `public/`. URLs externas são rejeitadas.
- `game-loop.wav` tem ~20 MB (WAV sem compressão, 116 s). Convertê-lo para MP3 (~2 MB) e trocar o `src` em `audio.json` deixa o carregamento bem mais leve.

### Créditos de áudio

Todos os sons vêm do [Freesound](https://freesound.org). Os créditos também aparecem no jogo, em *Audio credits* no menu principal.

- *Ambient, Pad, Guitar - Dawning*, de Andrewkn: https://freesound.org/s/859582/, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (exige atribuição).
- Em CC0 1.0: *Making Up (Soft Hip Hop)*, de shortiefoeva2; *Menu Selection Click*, de NenadSimic; *Hint*, de dland; *Purchase Ka-Ching*, de Qvantor; *Race Start Ready Go*, de steel2008; *Rocket Launch*, de gracenew; *Tada Fanfare A*, de plasterbrain; *Notification Sound*, de yfjesse; *Liminal Space Alarm* (trecho), de Johnmode. Os links estão em `audio.json` e nos README de `music/`.

## Pendências e limitações conhecidas

- Testado apenas no **Chrome** (desktop). Firefox e Safari não foram testados.
- Não há screenshots versionados no repositório.
- **P1 não implementado:** comparação com a tentativa anterior, "Why does this matter?" por escolha e replay com a mesma seed. As microanimações de evento existem de forma básica (banner e efeitos no satélite). Há um texto de ajuda por tela, como pede o P0.
- A arte é simples e vetorial; não replica o acabamento das imagens de referência.
- O stepper não é clicável, e a navegação é só por Back/Next e pelos links Edit.

## Licença

MIT (veja `LICENSE`).
