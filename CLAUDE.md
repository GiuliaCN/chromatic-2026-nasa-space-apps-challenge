# AGENTS.md — Instruções para o agente de desenvolvimento do CHROMATIC

## Missão do agente

Implementar um MVP completo e apresentável do jogo **Chromatic: Space Mission Designer** para navegador desktop, com **frontend JavaScript estático**, arte 2D vetorial e dados/conteúdo editáveis em JSON. O projeto deve ser publicável no GitHub Pages ou Cloudflare Pages, sem backend, login, banco de dados ou APIs externas obrigatórias.

**Leia antes de implementar:** `design-jogo.md` (UX, telas e arte) e `escopo-mvp.md` (regras, fórmulas, prioridades, critérios de aceite). Estes documentos são a fonte de verdade do produto.

## Hierarquia de precedência

Em caso de conflito entre documentos, aplicar nesta ordem e registrar a decisão no README:

1. **Restrições inegociáveis** deste arquivo (frontend only, deploy estático, data-driven, separação de responsabilidades).
2. **`escopo-mvp.md`**: funcionalidades, regras, fórmulas, prioridades P0/P1/P2 e critérios de aceite.
3. **`design-jogo.md`**: experiência, navegação, telas e identidade visual.
4. **Imagens em `design/references/`**: apenas aparência e composição.
5. **Demais convenções deste arquivo** (estrutura de pastas, stack sugerida, fluxo de trabalho).

Na dúvida, priorize escopo P0, funcionamento do ciclo completo e restrições técnicas.

## Restrições inegociáveis

1. **Frontend only:** JavaScript, HTML, CSS e SVG. Não criar servidor de aplicação, banco, autenticação ou endpoints próprios.
2. **Static deploy:** todos os assets e JSON devem funcionar em hospedagem estática e em subdiretórios do GitHub Pages.
3. **Data-driven:** custos, massas, potências, instrumentos, lançadores, órbitas, eventos, objetivos, descrições, mensagens, textos de UI, ajuda e glossário em arquivos JSON versionados. Não hardcodar conteúdo do jogo nos componentes.
4. **Separation of concerns:** regras de negócio em módulos puros; UI não implementa fórmulas; JSON não contém código executável.
5. **UX sequencial:** uma etapa/decisão principal por tela. Não recriar dashboard denso; não adicionar mascote.
6. **Visual:** ilustrações vetoriais modulares, cores técnicas no planejamento e espaço mais vibrante após lançamento. Não depender de Three.js, canvas 3D ou imagens externas.
7. **Idioma do jogo:** inglês. Documentação da equipe pode permanecer em português.
8. **Fidelidade:** valores são simplificados/ficcionais. Não afirmar precisão científica inexistente.
9. **Entrega funcional:** preferir uma experiência completa com menos opções a telas bonitas sem motor de simulação.

## Stack recomendada

**Vite + JavaScript ES modules + CSS + SVG**, sem framework obrigatório. Usar React somente se a equipe decidir explicitamente que domina melhor e que acelera a entrega. Evitar dependências pesadas. Testes de lógica com Vitest ou Node test runner. Lint/format se disponíveis, sem bloquear o progresso inicial.

## Estrutura sugerida

```text
/
  AGENTS.md
  design-jogo.md
  escopo-mvp.md
  README.md
  index.html
  package.json
  vite.config.js
  design/
    references/          # imagens de referência visual das telas
  public/
    data/
      game.json
      content.en.json
      science-goals.json
      orbits.json
      payloads.json
      spacecraft.json
      launchers.json
      events.json
  src/
    main.js
    styles/
      tokens.css
      global.css
      screens.css
    core/
      data-loader.js
      config-validator.js
      game-state.js
      calculations.js
      validation.js
      simulation.js
      rng.js
      storage.js
    ui/
      app-shell.js
      navigation.js
      components/
        spacecraft-svg.js
        earth-svg.js
        rocket-svg.js
        metric.js
        choice-card.js
        tooltip.js
        help-drawer.js
      screens/
        main-menu.js
        briefing.js
        orbit-selection.js
        payload-design.js
        spacecraft-design.js
        launch-planning.js
        mission-review.js
        launch-animation.js
        mission-simulation.js
        mission-debrief.js
  tests/
    calculations.test.js
    validation.test.js
    simulation.test.js
    balance.test.js
    fixtures/
      reference-configs.json
```

A estrutura é recomendação, não obrigação; preservar organização equivalente se houver projeto existente.

## Contratos de dados e estado

- Cada opção tem `id` estável e propriedades com unidades no nome: `massKg`, `powerW`, `costM`, `dataGbPerMonth`, `storageGb`, `batteryWh`, `eclipseDurationH`.
- Referenciar nomes e descrições por chaves de localização (`nameKey`, `descriptionKey`) em `content.en.json`. Ajuda por tela em `help.<screen>`.
- Campos obrigatórios de cada categoria (instrumento, energia, comunicação, bus, lançador, órbita, objetivo) e parâmetros globais estão definidos em `escopo-mvp.md` seções 5.1 e 5.2.
- Dados de equipamentos, presets e eventos ficam em JSON; animações SVG podem mapear `visualSlot` ou `visualVariant` para componentes visuais existentes.
- Não criar regras ocultas em strings de descrição. Definir efeitos e condições por tipos explícitos conhecidos pelo motor. Efeitos: `powerGenerationMultiplier`, `instrumentAvailabilityMultiplier`, `downlinkMultiplier`, `scienceOpportunityMultiplier`. Condições: `powerMarginRatioBelow`, `downlinkMarginRatioBelow`, `hasInstrument`, `orbitIs`, `goalPriorityIs`. Validar IDs, referências e tipos ao carregar.
- Um arquivo de configuração pode alterar valores e opções existentes sem editar JS. Para **novos tipos de regra**, implementar código e testes correspondentes.
- Estado mínimo: `schemaVersion`, `dataVersion`, `screen`, `phase` (`planning` | `launched` | `debrief`), `missionId`, `goalPriorityId` (prioridade científica escolhida no Briefing), `orbitId`, `payloadIds`, `powerId`, `communicationId`, `busId`, `launcherId`, `seed` (nula até **Approve and Launch**), `simulationResult`.
- Não salvar objetos de configuração inteiros no save; salvar IDs, `schemaVersion` e `dataVersion`. Se o save não for compatível com os dados atuais, descartá-lo com aviso amigável.
- A configuração "congelada" no lançamento é o conjunto de IDs + seed. **Try Again** descarta `simulationResult` e `seed`; a seed nova é gerada no próximo lançamento.
- Carregar e validar JSON antes de renderizar; apresentar erro amigável em caso de configuração inválida.

## Responsabilidades dos módulos

- `data-loader`: carregar JSON com URLs relativas ao `BASE_URL`, sem assumir raiz `/`.
- `config-validator`: checar schemas, números não negativos, IDs únicos, referências válidas, tipos de efeito e de condição conhecidos, efeitos de eventos acima de `minEffectMultiplier`.
- `game-state`: armazenar escolhas e navegar entre etapas; imutabilidade quando razoável.
- `calculations`: funções puras que recebem configuração + escolhas e devolvem indicadores derivados (custo, massa, consumo, margem, cobertura da bateria, dados, ciência potencial ponderada pela prioridade).
- `validation`: devolver lista de bloqueios e avisos com códigos, mensagens localizadas e etapa para correção.
- `simulation`: receber snapshot válido + seed, simular exatamente 24 meses e devolver timeline + relatório; não manipular DOM ou `localStorage`. Crédito de ciência no mês da transmissão, conforme `escopo-mvp.md` seção 5.5.
- `rng`: PRNG com seed para reprodutibilidade.
- `storage`: salvar/carregar estado versionado em `localStorage` com fallback seguro para saves inválidos.
- `ui/screens`: renderizar estado e despachar ações; sem lógica de cálculo duplicada.

## Regras de implementação da experiência

- Menu → Briefing → Orbit → Payload → Spacecraft → Launch Planning → Review → Launch Animation → Simulation → Debrief.
- Navegação **Back/Continue** no planejamento; mudanças recalculam os indicadores imediatamente.
- Revisão aponta bloqueios e oferece ação **Edit** para a tela correta.
- **Launch** só é permitido se `validation` não tiver bloqueios; ao aprovar, gerar a seed e congelar a configuração.
- A animação de lançamento deve ser curta, pulável e respeitar `prefers-reduced-motion`.
- Simulação permite Play/Pause/Speed Up/Skip to Results e não depende de timers para o cálculo em si: gerar timeline determinística e apenas reproduzi-la visualmente.
- Debrief mostra ciência obtida, ciência por objetivo, dados transmitidos e perdidos, custos, eventos e explicações de trade-offs. **Try Again** volta ao planejamento com escolhas editáveis.
- Evitar drag-and-drop como requisito. Selecionar card já deve adicionar/remover peça SVG em encaixe predeterminado.
- Não usar mascote nem introduzir uma tela de dashboard central com todos os subsistemas.

## Qualidade e testes obrigatórios

Escrever testes automatizados para:

1. Soma de massa e custo sem dupla contagem (incluindo o multiplicador de custo de lançamento da órbita).
2. Potência e margem energética; bateria cobre eclipse e não equivale a geração contínua.
3. Produção, transmissão, buffer e perda de dados por armazenamento insuficiente.
4. Validação de restrições duras (inclusive capacidade do bus) versus avisos.
5. Mudança de órbita, instrumentos e prioridade científica refletida em ciência potencial.
6. Simulação com 24 registros mensais e resultados determinísticos para mesmo snapshot + seed; seed diferente pode gerar resultado diferente.
7. Ciência creditada apenas no mês da transmissão; dados perdidos ou não transmitidos não geram ciência.
8. Configuração inválida tratada sem travar a UI.
9. Calibração (`balance.test.js`): as 3 configurações de `tests/fixtures/reference-configs.json` são válidas, atingem a meta em pelo menos 9 de 10 seeds fixas, têm trade-offs distintos e cobrem cada prioridade científica; nenhuma opção domina estritamente as demais da sua categoria; existe ao menos uma configuração válida que falha na meta.
10. Save com `dataVersion` ou `schemaVersion` incompatível descartado sem travar.

Testar manualmente o fluxo completo no navegador, inclusive refresh/save, Back/Edit, tentativa inválida, lançamento válido, velocidade da simulação e relatório. Verificar ausência de erros no console. Se houver ferramenta de screenshot/browser disponível, conferir layout em 1440×900 e 1280×720.

## Acessibilidade e desempenho

- Usar botões semânticos, foco visível, navegação por teclado, texto alternativo/labels em SVGs relevantes, contraste suficiente e estados não comunicados apenas por cor.
- Respeitar `prefers-reduced-motion`; disponibilizar Skip para animações.
- Evitar renderizar gráficos complexos e atualizar DOM desnecessariamente. Não carregar assets de terceiros em runtime.
- Manter tempos de transição curtos e resposta imediata às escolhas.

## Deploy e README

Criar scripts `dev`, `build`, `preview`, `test`. Documentar no README:

- requisitos de Node e comandos locais;
- como publicar no GitHub Pages e Cloudflare Pages;
- configuração de `base`/`BASE_URL` para subcaminho;
- como editar JSON e validar alterações;
- limitações científicas e simplificações do modelo;
- decisões tomadas em caso de conflito ou ambiguidade nos documentos;
- roteiro de demonstração de 5 minutos.

Não inserir chaves de API ou informações sensíveis no repositório. `localStorage` não é sincronização entre usuários.

## Fluxo de trabalho do agente

1. Inspecionar o repositório e ler os três documentos antes de modificar código.
2. Produzir plano curto de implementação e identificar riscos; não ampliar o escopo sem solicitação.
3. Implementar primeiro **JSON + estado + motor + validação + testes**.
4. Conectar as telas ao motor e concluir o ciclo jogável end-to-end.
5. Adicionar SVG modular, animações e polimento.
6. Rodar testes/build, revisar erros, verificar deploy estático.
7. Informar o que foi implementado, como executar, o que foi testado e quais limitações restaram.

**Se faltar tempo:** cortar variações de itens, efeitos visuais e P1. Nunca substituir a simulação por uma pontuação aleatória nem remover o relatório explicativo.

## Definição de pronto

O agente só deve declarar MVP concluído quando todos os critérios P0 de `escopo-mvp.md` estiverem atendidos, `npm run build` funcionar, testes do motor (incluindo o de calibração) passarem e uma partida completa puder ser jogada sem backend. Caso contrário, relatar precisamente pendências e não alegar conclusão.

## Referências visuais das telas

As imagens em `design/references/` são as referências visuais oficiais para a implementação da interface do Chromatic. Elas substituem os conceitos antigos descartados mencionados em `design-jogo.md`, seção 7. Se a pasta não existir ou estiver vazia, seguir `design-jogo.md`, registrar a ausência no README e não inventar nem baixar referências.

Cada imagem representa o resultado visual desejado para uma tela do jogo.

### Regras de implementação

1. Antes de implementar uma tela, consulte a imagem correspondente em `design/references/`, a descrição em `design-jogo.md` e os requisitos em `escopo-mvp.md`.

2. Reproduza a composição visual da referência, respeitando a hierarquia, distribuição dos elementos, proporções, paleta de cores, tipografia e estilo das ilustrações.

3. Não utilize a imagem inteira como fundo da tela. Todos os elementos de interface devem ser implementados como componentes reais em HTML, CSS, JavaScript e SVG.

4. As imagens são referências visuais, não especificações funcionais. Textos, números, botões e indicadores presentes nas imagens podem ser ilustrativos.

5. Não implemente funcionalidades apenas porque aparecem na imagem. As funcionalidades devem estar previstas nos documentos do projeto.

6. Todos os textos, equipamentos, custos, parâmetros e descrições configuráveis devem vir dos arquivos JSON, conforme a arquitetura definida.

7. Em caso de conflito entre a imagem e os documentos, aplicar a **Hierarquia de precedência** no início deste arquivo: o escopo define funcionalidades e regras, o design define experiência, navegação e identidade visual, e a imagem define aparência e composição.

8. Mantenha consistência visual entre as telas, mesmo quando as referências apresentarem pequenas diferenças de estilo.

9. Preserve a experiência de jogo com telas distintas e progressão guiada. Não transforme as telas em um dashboard único.

10. Quando uma ilustração for complexa, utilize SVGs ou assets locais. Não introduza bibliotecas 3D ou dependências pesadas sem necessidade.

### Validação visual

Após implementar cada tela:

- Compare o resultado com a imagem de referência.
- Verifique a distribuição e o alinhamento dos elementos.
- Verifique a legibilidade em resolução desktop.
- Confirme que os elementos interativos funcionam.
- Confirme que as informações dinâmicas vêm dos dados configuráveis.
- Registre eventuais diferenças intencionais em relação à referência.

A fidelidade visual deve ser alta, mas nunca deve comprometer a funcionalidade, acessibilidade ou os limites do MVP.
