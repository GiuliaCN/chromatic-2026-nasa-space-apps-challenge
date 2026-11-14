# CHROMATIC — Design do Jogo

**Versão:** 1.1 — MVP NASA Space Apps Challenge 2026 (revisão de consistência com `escopo-mvp.md` v1.1)  
**Formato:** jogo web desktop-first, 2D, JavaScript, sem backend  
**Cenário:** Earth Watchers

## 1. Visão e experiência

**Design. Decide. Discover.** O jogador projeta uma missão de observação da Terra e descobre as consequências das decisões durante uma simulação de 24 meses. Cada escolha resolve problemas e cria compromissos entre custo, massa, energia, comunicação, cobertura e ciência. Não existe uma única combinação ideal.

**Princípio central:** o jogo deve parecer um jogo tradicional de estratégia com etapas claras, e não um dashboard empresarial. Uma decisão principal por tela; indicadores locais à decisão; progressão narrativa; feedback visual; possibilidade de revisar escolhas. **Sem mascote.**

O planejamento acontece em uma interface técnica, escura, com ilustrações vetoriais limpas. O espaço e as cores mais vibrantes aparecem principalmente na sequência de lançamento e na simulação, como recompensa visual pela preparação.

## 2. Direção de arte

## Paleta de cores

A identidade visual do jogo utiliza uma paleta escura, inspirada em interfaces de controle de missões espaciais, com azul-marinho quase preto, ciano neon e cores de destaque para indicadores.

### Cores principais

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#030B18` | Fundo principal, azul-marinho quase preto |
| `--surface` | `#07182C` | Painéis, cards e áreas de configuração |
| `--border` | `#17618A` | Bordas, divisórias e contornos discretos |
| `--text` | `#F1F7FF` | Texto principal, títulos e valores |
| `--muted` | `#A9C4D9` | Descrições, instruções e textos secundários |
| `--primary` | `#00E5FF` | Seleções, botões, navegação e destaques em ciano neon |
| `--warning` | `#FFBF36` | Alertas, orçamento próximo do limite e atenção |
| `--success` | `#39F58A` | Indicadores positivos, objetivos concluídos e viabilidade |
| `--science` | `#A66BFF` | Ciência, dados científicos e indicadores especiais |
| `--danger` | `#FF5364` | Falhas, limites ultrapassados e decisões prejudiciais |

### Cores complementares

| Token | Hex | Uso |
|---|---|---|
| `--surface-alt` | `#0B223B` | Cards internos e elementos elevados |
| `--primary-hover` | `#65F4FF` | Hover e elementos interativos |
| `--primary-glow` | `#00DFFF` | Brilho de bordas e seleções |
| `--secondary` | `#388BFF` | Barras de progresso, ícones e painéis solares |
| `--accent-purple` | `#8554E8` | Elementos espaciais e indicadores secundários |
| `--success-bg` | `#062C24` | Fundo dos painéis de vantagens |
| `--danger-bg` | `#301321` | Fundo dos painéis de desvantagens |
| `--disabled` | `#42566F` | Elementos desabilitados e etapas futuras |

## Diretrizes visuais

- **Fundo:** azul-marinho quase preto, com gradientes sutis.
- **Painéis:** superfícies escuras com bordas finas e cantos arredondados.
- **Interações:** ciano neon para botões, seleções e elementos ativos.
- **Indicadores:** verde para sucesso, amarelo para alertas e vermelho para falhas.
- **Ciência:** roxo para métricas científicas e elementos especiais.
- **Tipografia:** fontes sans-serif modernas, com títulos em estilo tecnológico.
- **Ícones:** vetoriais, com traços simples e cores consistentes.
- **Ilustrações:** estilo cartunesco e vetorizado, evitando realismo fotográfico.

## Efeitos e estados

O efeito neon deve ser utilizado com moderação, principalmente em:

- Botões de ação principal.
- Cards selecionados.
- Etapa atual do progresso da missão.
- Indicadores importantes.
- Elementos interativos em hover ou foco.

Evitar aplicar brilho intenso em todos os componentes simultaneamente, preservando a legibilidade e a hierarquia visual.

## Consistência entre telas

As telas de planejamento devem manter a paleta escura e a mesma estrutura visual:

- Cabeçalho com identidade Chromatic.
- Barra de progresso da missão.
- Painéis com informações e controles.
- Rodapé com navegação e mensagens contextuais.

Durante o lançamento e as animações espaciais, a paleta pode ganhar cores mais vibrantes, como azul, roxo e laranja, sem abandonar a identidade visual estabelecida.

> **Nota:** Os valores hexadecimais são aproximações visuais das telas de referência e podem ser ajustados durante a implementação.

### Linguagem gráfica

- **SVG 2D modular** para satélite, painéis, instrumentos, foguete, órbita e ícones; evitar modelos 3D, fotorealismo e dependências de imagens externas.
- Componentes ilustrados com formas simples e identidade visual consistente, não desenhos técnicos hiper-realistas.
- O satélite deve mudar visualmente quando o jogador adiciona/remova instrumentos ou troca subsistemas. Usar pontos de encaixe predeterminados, sem exigir drag-and-drop no MVP.
- Microanimações CSS/SVG: encaixe de peça, pulso de seleção, trajetória orbital, barra de progresso. Respeitar `prefers-reduced-motion`.
- Desktop prioritário: referência de 1440×900; suportar 1280×720 sem cortes, rolagem vertical quando necessária. Em telas menores, empilhar painéis; não bloquear o jogo.

## 3. Navegação

Fluxo de telas:

`Main Menu → Mission Briefing → Orbit Selection → Payload Design → Spacecraft Design → Launch Planning → Mission Review → Launch Animation → Mission Simulation → Mission Debrief`

- Cabeçalho discreto com nome da missão e progresso por etapa durante o planejamento.
- Botões **Back** e **Continue**; permitir voltar e alterar decisões antes do lançamento.
- **Glossary** e **Why does this matter?** como ajuda contextual em modal/drawer, sem tela permanente. No MVP há um texto de ajuda por tela (`help.<screen>` em `content.en.json`); ajuda específica por escolha é P1.
- Salvar automaticamente o estado no `localStorage`. **Continue Mission** recupera o progresso local.
- Ao aprovar **Approve and Launch**, congelar a configuração (IDs das escolhas) e gerar a seed da simulação. **Try Again** descarta resultado e seed, volta ao planejamento com as escolhas editáveis e uma nova seed será gerada no próximo lançamento.
- Conteúdo visível ao jogador em **inglês**, configurado em JSON, inclusive descrições e textos de ajuda.

## 4. Telas detalhadas

### 4.1 Main Menu

**Objetivo:** entrar no jogo sem sobrecarregar.

**Elementos:** logo Chromatic, tagline, ilustração SVG discreta de satélite em blueprint, **New Mission**, **Continue Mission** (desabilitado sem save), **How to Play**, controle de áudio opcional (não implementar áudio no MVP).

**Interações:** nova missão limpa estado após confirmação; continuar carrega estado salvo; How to Play abre instruções breves.

### 4.2 Mission Briefing

**Objetivo:** entender o problema antes de escolher componentes e escolher uma prioridade científica, não uma solução pronta.

**Elementos:** cartão Earth Watchers, três objetivos científicos (wildfires, deforestation, air quality), prazo de 24 meses, orçamento fictício de $300M, meta de pelo menos 60 pontos científicos, ilustração vetorial da Terra, cada objetivo apresenta benefício e trade-off em 1–2 frases, **Accept Mission**.

**Mecânica do objetivo:** a prioridade escolhida recebe o `priorityMultiplier` definido em `science-goals.json` (valor inicial sugerido: ×1,5; os demais objetivos ×1,0) sobre a ciência obtida naquele objetivo. Não bloqueia instrumentos. A meta global de 60 pontos permanece e é medida sobre a ciência já ponderada. Mostrar os pesos antes da confirmação (por exemplo, "Wildfires ×1.5 · Deforestation ×1.0 · Air Quality ×1.0"). A escolha é salva como `goalPriorityId`. Se o tempo apertar, manter apenas os cards e pesos simples.

**Feedback:** explicações curtas dos objetivos, sem tabela extensa de equipamentos.

### 4.3 Orbit Selection

**Objetivo:** compreender o impacto da órbita na missão.

**Elementos:** ilustração vetorial da Terra com trajetória animada; três opções abstratas de missão — **Low Earth Orbit**, **Sun-Synchronous Orbit**, **Equatorial Orbit** — com indicadores de cobertura/revisita, custo relativo, compatibilidade e explicação contextual.

**Mecânica:** presets JSON com multiplicadores de observação por objetivo, multiplicador de custo de lançamento (é o "custo relativo" exibido), duração de eclipse e requisitos de lançador. A órbita altera a ciência potencial, o custo de lançamento, a necessidade de bateria e a compatibilidade com lançadores; **não altera a quantidade de dados gerados**. **Importante:** SSO é um tipo de órbita terrestre baixa; apresentar opções como *perfis de órbita*, não categorias fisicamente mutuamente exclusivas. Números devem ser rotulados como simplificações didáticas.

**Feedback:** a trajetória e o resumo de trade-offs mudam ao selecionar o preset.

### 4.4 Payload Design

**Objetivo:** escolher instrumentos científicos e perceber seus impactos.

**Layout desktop:** direita com catálogo em cards; centro com satélite SVG modular; esquerda com **apenas** indicadores relevantes: massa, consumo, custo, dados gerados e capacidade científica estimada. Não mostrar checklist de lançamento ou eventos de simulação aqui.

**Equipamentos iniciais (valores de exemplo, editáveis no JSON).** A "ciência base" é a soma de `scienceByGoal`:

| Instrumento | Massa | Ciência base | Wildfires | Deforestation | Air Quality |
|---|---:|---:|---:|---:|---:|
| Multispectral Camera | 120 kg | 20 | 8 | 10 | 2 |
| Thermal Sensor | 95 kg | 15 | 11 | 2 | 2 |
| Atmospheric Spectrometer | 80 kg | 15 | 3 | 0 | 12 |
| Synthetic Aperture Radar | 180 kg | 25 | 6 | 15 | 4 |
| LiDAR | 70 kg | 10 | 1 | 7 | 2 |

O JSON também define custo, potência, dados, descrição e encaixe visual de cada item. **Os valores acima não são especificações reais.**

**Interações:** selecionar/desmarcar instrumentos, atualização instantânea dos totais, entrada/saída animada de componentes SVG, explicação **Why does this matter?**. Sem arrastar peças obrigatoriamente.

### 4.5 Spacecraft Design

**Objetivo:** sustentar os instrumentos escolhidos.

**Subetapas ou abas:** **Power**, **Communications**, **Spacecraft Bus**.

- **Power:** escolher pacote de painéis/baterias; comparar geração e consumo (margem de energia). A bateria cobre apenas o período de eclipse da órbita escolhida (indicador de cobertura da bateria); **bateria não resolve déficit de geração contínua**.
- **Communications:** escolher sistema de transmissão; comparar capacidade de downlink com dados produzidos.
- **Bus:** estrutura com capacidade de massa suportada, armazenamento e confiabilidade; comparar requisitos com capacidades.

**Feedback:** avisos explicativos de incompatibilidade e opções de correção. Exibir somente indicadores ligados à aba atual. Escolhas podem permanecer inválidas temporariamente para permitir experimentação.

### 4.6 Launch Planning

**Objetivo:** escolher lançador coerente com massa, órbita e orçamento.

**Elementos:** cards de 2–3 lançadores fictícios, SVG de foguete e compartimento de carga, capacidade, custo (já com o multiplicador de custo da órbita), compatibilidade orbital e confiabilidade. Dados em JSON.

**Interações:** escolher lançador e visualizar comparação com a massa total; indicar incompatibilidade sem ocultar a alternativa.

### 4.7 Mission Review

**Objetivo:** revisar o projeto antes de comprometer a missão.

**Elementos:** satélite montado, escolhas resumidas, orçamento restante, ciência prevista, checklist com estados **OK / Warning / Blocked**, links **Edit** para etapas relevantes, botão **Approve and Launch**.

**Regras:** bloquear lançamento em violações duras (orçamento negativo, massa superior ao lançador, carga superior à capacidade do bus, potência insuficiente, ausência de instrumento, falta de subsistema obrigatório, órbita incompatível). Avisos não bloqueantes podem incluir baixa margem energética, bateria insuficiente para o eclipse, downlink abaixo da produção de dados ou baixo potencial científico. Mensagens devem indicar ação concreta para resolver.

### 4.8 Launch Animation

**Objetivo:** criar sensação de recompensa e continuidade narrativa.

**Sequência curta (10–20 s ou acelerável):** foguete na plataforma → contagem regressiva → subida → separação simplificada → liberação do satélite → abertura dos painéis → Terra vista do espaço.

**Implementação:** camadas SVG/CSS e transições de estado; botão **Skip**; versão reduzida para `prefers-reduced-motion`. Não simular física orbital realista.

### 4.9 Mission Simulation

**Objetivo:** descobrir as consequências do planejamento.

**Elementos:** ilustração espacial animada com satélite e Terra; indicador de mês (1–24); pontos científicos acumulados; energia/margem; dados coletados/transmitidos/perdidos; estado dos instrumentos; log de eventos curto; botões **Play/Pause**, **Speed Up**, **Skip to Results**.

**Mecânica:** avanço mensal determinístico a partir da configuração e da seed gerada no lançamento, com eventos contextualizados por risco e margens; sem aleatoriedade que anule todas as escolhas. A ciência é creditada no mês em que os dados são transmitidos. Simulação deve concluir em segundos no modo acelerado.

### 4.10 Mission Debrief

**Objetivo:** explicar o resultado, não apenas dar nota.

**Elementos:** sucesso/insucesso da meta, ciência total e por objetivo (já ponderada pela prioridade), dados transmitidos e perdidos, orçamento usado, confiabilidade/eventos, decisões que ajudaram e prejudicaram, seed da execução (texto discreto), **Try Again**, **New Mission**.

**Critério:** missão bem-sucedida quando a ciência efetivamente obtida atingir a meta, desde que a missão tenha sido lançada validamente. Exibir também a qualidade da execução, entendida como a lista de avisos ativos no lançamento, eventos ocorridos e o efeito de cada um sobre o resultado (sem nota adicional). Não declarar que existe uma única solução ótima.

## 5. Transições e feedback

- Entre etapas: transições rápidas de 150–300 ms, preservando contexto.
- Seleção de item: animação discreta de encaixe e números recalculados.
- Alteração de órbita: interpolar ilustração, não simular trajetória física completa.
- Pré-lançamento: mudança deliberada de linguagem visual, saindo do blueprint técnico para espaço colorido.
- Eventos: microanimações específicas (painel reduz brilho, transmissão interrompida, observação da Terra destacada).
- Erros: mensagens em linguagem simples e solução possível, sem penalizar o usuário por experimentar.

## 6. Princípios de UX e acessibilidade

- Uma decisão principal por tela, com resumos relevantes, não painel global persistente de cinco métricas.
- Navegação por teclado, foco visível, labels acessíveis, contraste suficiente e estados textuais além da cor.
- Não depender de hover para informação importante; ajuda disponível por clique.
- Formatar unidades (`kg`, `W`, `Wh`, `GB/month`, `$M`) de modo consistente.
- Avisar que parâmetros são simplificados/ficcionais e não representam dimensionamento aeroespacial real.
- Persistência local com versão do schema e dos dados; erro de leitura do save não pode travar o jogo.

## 7. Referências visuais

- **Referências oficiais:** as imagens em `design/references/` (descritas no `AGENTS.md`) definem aparência e composição de cada tela. Se a pasta não existir ou estiver vazia, seguir este documento, registrar a ausência no README e não inventar referências.
- **Conceitos descartados:** as imagens conceituais iniciais (não incluídas no repositório) serviram apenas de inspiração. A primeira, estilo dashboard realista, foi rejeitada por excesso de informação; a segunda, mais lúdica, também concentrou informações demais e introduziu um mascote indesejado. **Não reproduzir essas composições.** Priorizar telas sequenciais, ilustração vetorial, animações de consequência e separação visual entre planejamento e execução.
