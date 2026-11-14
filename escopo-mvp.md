# CHROMATIC — Escopo do MVP

**Versão:** 1.1 (revisão de consistência entre `AGENTS.md`, `design-jogo.md` e este documento)

**Objetivo:** entregar, em um hackathon de aproximadamente 48 horas, um jogo completo e demonstrável no navegador, sem instalação, sem login, sem servidor de aplicação ou APIs obrigatórias.

## 1. Proposta de valor

O jogador projeta uma missão fictícia de observação da Terra (**Earth Watchers**), administra recursos limitados e acompanha uma operação simulada de **24 meses**. A missão busca **pelo menos 60 pontos científicos** dentro de um orçamento fictício de **$300 milhões**. O jogo ensina trade-offs de engenharia de sistemas, permitindo várias soluções viáveis.

**Critério de sucesso do MVP:** uma pessoa consegue iniciar, escolher missão, órbita, instrumentos, subsistemas e lançador, revisar, lançar, simular 24 meses e receber um relatório que explique o impacto de suas escolhas, tudo em um site estático público.

## 2. Escopo obrigatório (P0)

1. **Fluxo completo de telas:** Main Menu, Mission Briefing, Orbit Selection, Payload Design, Spacecraft Design, Launch Planning (escolha do lançador), Mission Review, Launch Animation, Mission Simulation, Mission Debrief.
2. **Configuração orientada por JSON:** textos, opções, atributos, custos, parâmetros, presets, eventos e mensagens não devem estar espalhados em componentes JS.
3. **Seleções com impacto imediato:** massa, custo, potência, geração, dados e ciência previstos recalculados após cada escolha.
4. **Restrições coerentes:** orçamento, capacidade do lançador/estrutura, energia, comunicação/armazenamento, compatibilidade orbital; diferenciar bloqueios de alertas.
5. **Simulação mensal:** 24 passos, acúmulo de ciência e dados transmitidos, eventos dependentes de escolhas, progresso visível.
6. **Controles da simulação e da animação:** Play/Pause, Speed Up e Skip to Results na simulação; Skip na animação de lançamento (respeitando `prefers-reduced-motion`).
7. **Resultado explicável:** relatório com sucesso/falha, métricas, motivos, forças e limitações, e opção de tentar novamente.
8. **Visual 2D vetorial:** montagem visual simples de satélite, órbita, foguete e animação curta de lançamento, sem mascote.
9. **Persistência local:** salvar e continuar via `localStorage`; reset claro; app utilizável offline após carregamento quando os arquivos estiverem disponíveis no cache do navegador (sem exigir PWA).
10. **Deploy estático:** build funcionando em GitHub Pages (inclusive subcaminho do repositório) ou Cloudflare Pages; sem secrets.
11. **Inglês no produto:** textos, ajuda e glossário configuráveis em JSON.
12. **Glossário e ajuda básica:** modal/drawer de Glossary e um texto **Why does this matter?** por tela (chave `help.<screen>` em `content.en.json`).
13. **Testes automatizados do motor:** fórmulas, validação, simulação e calibração das configurações de referência (ver seções 5.5 e 8).

## 3. Escopo desejável (P1)

- Pequenas animações específicas para eventos (falha de instrumento, degradação de painel, oportunidade de observação).
- Comparação do resultado atual com a tentativa anterior (armazenada localmente).
- **Why does this matter?** específico por escolha (no P0 existe um texto por tela).
- Reexecutar o mesmo projeto com a mesma seed (modo "replay").

## 4. Fora do MVP (P2 / não implementar)

- Multiplayer em tempo real, salas, confirmação por equipe e sincronização entre dispositivos.
- Cenário Mars, múltiplas missões ou árvore de campanha.
- Login, ranking online, banco de dados, API, analytics obrigatórios.
- Física orbital de alta fidelidade, modelagem 3D, Three.js, física de lançamento real.
- Editor de equipamentos dentro do jogo, drag-and-drop complexo, criação procedural de naves.
- Dependência de serviços externos para completar a partida.

## 5. Modelo de jogo e fórmulas simplificadas

Todos os valores numéricos devem vir de JSON. As fórmulas e validações ficam no código e devem ser documentadas/testadas. A equipe deve calibrar números para permitir **pelo menos três configurações viáveis com trade-offs distintos** (ver 5.5).

### 5.1 Campos dos itens

Todos os itens que entram no projeto têm: `id`, `nameKey`, `descriptionKey`, `costM`, `massKg`, `powerW` (consumo; 0 se não consome) e `visualSlot`. Nomes e descrições são resolvidos em `content.en.json`.

| Categoria | Campos específicos |
|---|---|
| Instrumento (payload) | `dataGbPerMonth`, `scienceByGoal` (`wildfires`, `deforestation`, `airQuality`), tags de compatibilidade opcionais |
| Energia (power) | `generationW` (geração contínua com o satélite iluminado), `batteryWh` |
| Comunicação (comm) | `downlinkGbPerMonth` |
| Estrutura (bus) | `maxSupportedMassKg` (massa máxima de payload + energia + comunicação que a estrutura suporta), `storageGb`, `reliability` (0–1) |
| Lançador | `maxPayloadKg`, `supportedOrbitIds`, `reliability` (0–1) |
| Órbita (perfil) | `observationMultiplierByGoal`, `launchCostMultiplier`, `eclipseDurationH`, textos de cobertura/revisita |
| Objetivo científico | `priorityMultiplier` (peso quando escolhido como prioridade) |

**Unidades explícitas:** massa em kg, potência em W, bateria em Wh, dados em GB por mês, armazenamento em GB, custo em milhões de dólares fictícios, duração de eclipse em horas.

**Itens obrigatórios:** exatamente 1 bus, 1 pacote de energia, 1 sistema de comunicação, 1 lançador, 1 órbita, 1 prioridade científica e pelo menos 1 instrumento.

### 5.2 Parâmetros globais (`game.json`)

`dataVersion`, `budgetM` (300), `durationMonths` (24), `targetSciencePoints` (60), `operationsCostM`, `eventChancePerMonth`, `reliabilitySensitivity`, `batteryAvailabilityFloor`, `minEffectMultiplier`, `lowPowerMarginRatio`.

### 5.3 Indicadores derivados

- `totalCostM = bus.costM + sum(payload.costM) + power.costM + comm.costM + launcher.costM × orbit.launchCostMultiplier + operationsCostM`.
- `totalMassKg = bus.massKg + sum(payload.massKg) + power.massKg + comm.massKg` (massa a lançar).
- `supportedLoadKg = sum(payload.massKg) + power.massKg + comm.massKg` (comparada com `bus.maxSupportedMassKg`).
- `totalPowerDemandW = sum(payload.powerW) + comm.powerW + bus.powerW` (itens sem consumo contam 0).
- `powerMarginW = power.generationW - totalPowerDemandW`.
- `eclipseEnergyNeedWh = totalPowerDemandW × orbit.eclipseDurationH` e `batteryCoverage = min(1, power.batteryWh / eclipseEnergyNeedWh)` (1 se a necessidade for 0). **A bateria não compensa déficit de geração contínua; ela só cobre o eclipse.**
- `payloadDataGbPerMonth = sum(payload.dataGbPerMonth)` (a órbita não altera a geração de dados, apenas a ciência).
- `downlinkMarginGbPerMonth = comm.downlinkGbPerMonth - payloadDataGbPerMonth`.
- `sciencePotentialByGoal[g] = sum(payload.scienceByGoal[g]) × orbit.observationMultiplierByGoal[g] × goalWeight[g]`, onde `goalWeight[g] = priorityMultiplier` se `g` é a prioridade escolhida e `1.0` nos demais. **É potencial, não pontuação já conquistada.**
- `sciencePotentialTotal = sum(sciencePotentialByGoal)`.
- `budgetRemainingM = budgetM - totalCostM`.
- `missionReliability = launcher.reliability × bus.reliability`.

O motor trata armazenamento como buffer: dados produzidos mensalmente entram no buffer, transmissão retira até a capacidade de downlink e o excesso acima de `storageGb` é perdido. **Não** usar capacidade de armazenamento como se fosse velocidade de transmissão.

### 5.4 Regras de revisão

**Bloqueios de lançamento:**

- orçamento ultrapassado (`budgetRemainingM < 0`);
- `totalMassKg > launcher.maxPayloadKg`;
- `supportedLoadKg > bus.maxSupportedMassKg`;
- `powerMarginW < 0` (geração abaixo do consumo nominal);
- nenhum instrumento selecionado;
- subsistema obrigatório ausente (bus, energia, comunicação, lançador ou órbita);
- lançador incompatível com a órbita (`orbitId` fora de `supportedOrbitIds`).

**Avisos (não bloqueiam):** margem energética pequena (`powerMarginW / totalPowerDemandW < lowPowerMarginRatio`), `batteryCoverage < 1`, downlink menor que a produção de dados, risco de overflow de armazenamento, potencial científico abaixo da meta, confiabilidade baixa. Avisos podem levar a resultados ruins, mas não impedem o lançamento. Toda mensagem indica a ação concreta para resolver e a etapa onde corrigir.

### 5.5 Simulação mensal

**Seed:** gerada quando o jogador aprova **Approve and Launch**, salva no estado junto com os IDs da configuração congelada e exibida no Debrief. **Try Again** descarta o resultado e a seed; um novo lançamento gera outra seed. Os testes usam seeds fixas. A mesma configuração + a mesma seed produz o mesmo relatório.

**Estado do buffer:** `bufferGb` e `bufferScience[g]` (um valor por objetivo). A ciência é guardada no buffer junto com os dados que a carregam.

Para cada mês de 1 a `durationMonths`:

1. **Eventos.** Sorteio com o PRNG da seed: com probabilidade `eventChancePerMonth` ocorre no máximo um novo evento, escolhido por peso entre os eventos elegíveis (condições satisfeitas, não ativos). O peso de eventos negativos é multiplicado por `1 + (1 - missionReliability) × reliabilitySensitivity`. Eventos duram `durationMonths` e aplicam multiplicadores conhecidos pelo motor.
2. **Energia e operação.** `effectiveGenerationW = power.generationW × powerGenerationMultiplier`. `operatingFraction = clamp((effectiveGenerationW - (bus.powerW + comm.powerW)) / sum(payload.powerW), 0, 1) × instrumentAvailabilityMultiplier × (batteryAvailabilityFloor + (1 - batteryAvailabilityFloor) × batteryCoverage)`, limitado a 0–1.
3. **Produção.** `dataGenerated = payloadDataGbPerMonth × operatingFraction`. `scienceObserved[g] = sciencePotentialByGoal[g] / durationMonths × operatingFraction × scienceOpportunityMultiplier`. Ambos entram no buffer.
4. **Transmissão e crédito.** `transmittedGb = min(bufferGb, comm.downlinkGbPerMonth × downlinkMultiplier)`. A fração `transmittedGb / bufferGb` da ciência do buffer é **creditada neste mês** (ciência só conta quando os dados chegam à Terra) e removida junto com os dados.
5. **Overflow.** Se `bufferGb > bus.storageGb`, o excesso é perdido, junto com a mesma fração de `bufferScience`. Dados e ciência perdidos aparecem no relatório.
6. **Registro.** Gravar mês, eventos ativos, margem de energia, dados gerados/transmitidos/perdidos, ciência creditada por objetivo e uma explicação curta.

Dados que sobram no buffer ao fim do mês 24 **não** são creditados.

**Eventos (`events.json`):** cada evento tem `id`, `nameKey`, `descriptionKey`, `kind` (`negative` | `positive`), `weight`, `durationMonths`, `effects` (lista de `{ "type", "value" }`) e `conditions` opcionais. Tipos de efeito conhecidos: `powerGenerationMultiplier`, `instrumentAvailabilityMultiplier`, `downlinkMultiplier`, `scienceOpportunityMultiplier`. Tipos de condição conhecidos: `powerMarginRatioBelow`, `downlinkMarginRatioBelow`, `hasInstrument`, `orbitIs`, `goalPriorityIs`. O validador rejeita tipos desconhecidos e valores abaixo de `minEffectMultiplier` (evita derrotas arbitrárias).

**Sucesso:** `totalScienceEarned >= targetSciencePoints` ao fim dos 24 meses, para missão lançada validamente. `totalScienceEarned` é a soma da ciência creditada (já ponderada pela prioridade). Mostrar resultado por objetivo e consequências das escolhas mesmo quando falha.

### 5.6 Balanceamento, calibração e integridade

- Números são **ilustrativos** e devem ser identificados como tais no jogo.
- Nenhum item deve ser estritamente superior em custo, massa, potência e ciência a todos os outros da mesma categoria sem motivo pedagógico (teste automático de dominância por categoria).
- As três prioridades científicas precisam gerar escolhas significativas.
- Mudança de um instrumento deve alterar pelo menos uma métrica derivada e sua representação visual.
- Uma missão com potência insuficiente não pode passar no checklist; uma missão válida deve ser simulável até o fim.
- **Configurações de referência:** manter `tests/fixtures/reference-configs.json` com 3 configurações, usadas apenas em testes (não aparecem no jogo). Teste de calibração (`tests/balance.test.js`) exige que: (a) as 3 passem na validação sem bloqueios; (b) cada uma atinja a meta em pelo menos 9 de 10 seeds fixas; (c) cada par difira em pelo menos 10% em pelo menos duas métricas entre custo total, massa total e ciência obtida; (d) cada prioridade científica tenha ao menos uma configuração viável; (e) existam configurações válidas que falhem na meta (por exemplo, downlink insuficiente), para o Debrief ter o que ensinar; (f) a configuração com os 5 instrumentos não seja válida e vencedora ao mesmo tempo (orçamento ou massa devem forçar escolhas).
- **Ponto de partida de calibração:** os 5 instrumentos de exemplo somam 85 pontos base contra uma meta de 60; multiplicadores de órbita, eventos e perda de dados reduzem esse total. Ajustar orçamento, massas e capacidades para que 3 a 4 instrumentos sejam o ponto de equilíbrio.

## 6. Organização dos dados JSON

```text
public/data/
  game.json          # parâmetros globais (seção 5.2)
  content.en.json    # UI, briefing, ajuda por tela, glossário, mensagens, nomes e descrições
  science-goals.json # objetivos e priorityMultiplier
  orbits.json        # perfis, multiplicadores, eclipse, custo de lançamento
  payloads.json      # instrumentos científicos
  spacecraft.json    # opções de bus, energia e comunicação
  launchers.json     # lançadores
  events.json        # eventos, pesos, efeitos e condições
tests/fixtures/
  reference-configs.json  # 3 configurações de referência para teste de calibração
```

**Exemplo ilustrativo** de item em `payloads.json` (`scienceByGoal` soma a "ciência base" exibida):

```json
{
  "id": "thermal-sensor",
  "nameKey": "payload.thermalSensor.name",
  "descriptionKey": "payload.thermalSensor.description",
  "costM": 18,
  "massKg": 95,
  "powerW": 60,
  "dataGbPerMonth": 120,
  "scienceByGoal": { "wildfires": 11, "deforestation": 2, "airQuality": 2 },
  "visualSlot": "front-sensor"
}
```

**Exemplo ilustrativo** em `orbits.json`:

```json
{
  "id": "sun-synchronous",
  "nameKey": "orbit.sso.name",
  "descriptionKey": "orbit.sso.description",
  "observationMultiplierByGoal": { "wildfires": 0.9, "deforestation": 1.1, "airQuality": 1.0 },
  "launchCostMultiplier": 1.1,
  "eclipseDurationH": 0.4
}
```

**Exemplo ilustrativo** em `events.json`:

```json
{
  "id": "solar-degradation",
  "nameKey": "event.solarDegradation.name",
  "descriptionKey": "event.solarDegradation.description",
  "kind": "negative",
  "weight": 3,
  "durationMonths": 3,
  "effects": [{ "type": "powerGenerationMultiplier", "value": 0.8 }],
  "conditions": [{ "type": "powerMarginRatioBelow", "value": 0.3 }]
}
```

O nome/descrição são resolvidos em `content.en.json`. A equipe altera conteúdo e números nos JSON; **não precisa editar código**. Adições de novos IDs exigem validação; novos tipos de efeito ou de condição exigem implementação e testes.

## 7. Estrutura técnica mínima

- **Preferência:** Vite + JavaScript vanilla modular + CSS + SVG; React só se a equipe já dominar e isso acelerar a entrega.
- **Sem backend:** lógica e dados carregados no cliente. `localStorage` para save, com `schemaVersion` e `dataVersion` (save incompatível com os dados atuais é descartado com aviso amigável).
- **Módulos:** `data-loader`, `state`, `selectors/calculations`, `validation`, `simulation`, `screens`, `svg-components`, `storage`.
- **Sem dependência obrigatória de rede em runtime**, além do download inicial dos arquivos estáticos.
- Configurar `base` do Vite para GitHub Pages em subdiretório; Cloudflare Pages pode usar base `/`.
- Usar rotas internas simples/estado de navegação; evitar depender de fallback de servidor para URLs profundas no GitHub Pages.

## 8. Critérios de aceite testáveis

- [ ] O site abre por URL pública em desktop sem instalar nada.
- [ ] O jogador conclui o fluxo inteiro em aproximadamente 5–10 minutos.
- [ ] Há pelo menos três configurações válidas com compromissos diferentes, comprovadas pelo teste de calibração (5.6).
- [ ] Alterar equipamento atualiza massa, custo, energia, dados, ciência potencial e nave visual.
- [ ] Trocar órbita altera cobertura/ciência prevista, custo de lançamento e pode afetar compatibilidade do lançador.
- [ ] Trocar a prioridade científica altera o peso por objetivo e a ciência potencial.
- [ ] Não é possível lançar com restrição dura violada; erro explica como corrigir.
- [ ] Simulação de 24 meses avança e produz resultado reproduzível com seed; **Try Again** gera nova seed.
- [ ] A ciência só é creditada quando os dados são transmitidos; dados perdidos por overflow aparecem no relatório.
- [ ] O relatório explica pelo menos dois impactos reais das escolhas do jogador.
- [ ] Save/continue funciona após atualizar a página.
- [ ] Textos e parâmetros podem ser ajustados em JSON sem editar telas ou motor.
- [ ] O site não depende de backend, conta ou chave de API.
- [ ] Animação de lançamento é pulável e respeita redução de movimento.
- [ ] Play/Pause, Speed Up e Skip to Results funcionam na simulação.
- [ ] Não há mascote e não existe tela principal sobrecarregada com todos os dados.

## 9. Plano de implementação para 48 horas

| Ordem | Entrega | Prioridade |
|---|---|---|
| 1 | Scaffold, deploy inicial, JSON e validação de schema | P0 |
| 2 | Estado, fórmulas, checklist, simulação e testes do motor (incluindo calibração) | P0 |
| 3 | Main Menu, Briefing (prioridade científica), Orbit e Payload | P0 |
| 4 | Spacecraft, Launch Planning e Review | P0 |
| 5 | Mission Simulation e Debrief | P0 |
| 6 | SVG modular e animação de lançamento | P0 |
| 7 | Polimento, acessibilidade, balanceamento, deploy final | P0 |
| 8 | Animações de eventos, comparação de tentativas, ajuda por escolha | P1 |

**Corte de escopo:** se faltar tempo, reduzir opções, complexidade visual e eventos; **não cortar o ciclo completo de planejar → lançar → simular → aprender**.

## 10. Roteiro de demonstração

1. Apresentar briefing e meta.
2. Escolher uma prioridade científica e órbita.
3. Montar payload e mostrar métricas mudando.
4. Demonstrar um erro de energia e corrigi-lo.
5. Escolher lançador, revisar e lançar.
6. Acelerar os 24 meses e destacar um evento ligado ao projeto.
7. Exibir o relatório e comentar que outras combinações podem funcionar.
