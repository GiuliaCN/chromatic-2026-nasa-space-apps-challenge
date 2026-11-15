# Chromatic: Space Mission Designer

**Every choice has a cost. Every failure is a lesson.** A 2D web systems engineering game for the *NASA Space Apps Challenge 2026* (challenge 13, *Space Mission Design Game*). The player designs a fictional Earth observation mission (**Earth Watchers**), launches and operates the satellite for **24 months**, and receives a report explaining how their choices shaped the outcome.

- Static frontend (HTML + CSS + JavaScript ES modules + SVG). No backend, login, database, APIs, or keys.
- The game is in **English**.
- All game content and numbers are in JSON (`public/data/`), allowing for easy editting of parameters. See below.
- Every scientific instruments **are based on technologies used in real NASA missions**.
- Numerical parameters, costs, reliability, and science scores **are simplified for gameplay purposes** and do not represent official NASA specifications.

You can play the deployed version [here](https://chromaticspacemissiondesign.pages.dev/).

## Simplified model and scientific limitations

- Potential science = sum of instrument science × orbit multiplier × priority weight. Science is only credited when data is **transmitted** (buffer, downlink, and overflow).
- The battery only covers the eclipse and never compensates for continuous generation deficits.
- The orbit is an educational profile. Altitude, inclination, and revisit are illustrative, and SSO is a low orbit case. There is no orbital mechanics, propulsion, fuel, real radiation, or link budget sizing.
- Events are draws with weights and multiplicative effects. Reliability only changes the probability of negative events.
- The outcome is deterministic given the design and seed, but it is a teaching model, not a forecast.

## AI Usage Disclosure

Generative AI tools were used to assist with the development of this project.

- Code development: AI assisted in generating the initial MVP and portions of the JavaScript, HTML, and CSS implementation. The team reviewed, tested, corrected, and refined the generated code.
- Documentation: AI was used to identify inconsistencies in documentation created and revised by the team.
- UI/UX references: AI-generated mockups were used as visual references during interface development. These reference images are not included in the final application.
- Team logo: The Chromatic team logo was generated with AI assistance.

The project concept, gameplay mechanics, engineering decisions, and final validation were developed and managed by the Chromatic team.

# Technical Info

Below are some technical information targeted to those looking to modify the game.

## Requirements and commands to run locally

Requires **Node 22 or higher** (uses `node --test` and Vite 8).

```bash
npm install
npm run dev            # development server (Vite)
npm test               # engine tests (node:test), includes calibration
npm run build          # generates dist/ (static site)
npm run preview        # serves dist/ locally
npm run validate:data  # validates JSON files in public/data/ and prints errors
```

## Structure

```text
public/data/        Game JSONs (game, content.en, science-goals, orbits, payloads,
                    spacecraft, launchers, events, audio) + logo.jpeg
public/audio/       music (music/) and sound effects (sfx/) served by the game
music/              original audio files, with README/LICENSE for each sound (not included in the build)
src/core/           pure rules, no DOM: calculations, validation, simulation, rng,
                    game-state, storage, data-loader, config-validator, i18n, rules
src/ui/             shell, navigation, SVG components, and the 10 screens
src/styles/         tokens.css (palette), global.css, screens.css
tests/              engine tests + fixtures/reference-configs.json
scripts/            validate-data.mjs and explore-balance.mjs (calibration tool)
design/references/  visual reference images
```

Separation of concerns: the UI only renders state and dispatches actions. All formulas are in `src/core/`. JSON files have no executable code: effects and event conditions are types known by the engine.

## How to edit the game (JSON)

Edit the files in `public/data/` and run `npm run validate:data`. The game also validates everything on load and shows a friendly error screen with the list of issues if something is wrong.

| File | Content |
|---|---|
| `game.json` | budget, duration, goal, `operationsCostM`, `eventChancePerMonth`, `reliabilitySensitivity`, `batteryAvailabilityFloor`, `minEffectMultiplier`, `lowPowerMarginRatio`, `lowReliabilityThreshold`, `dataVersion`, stage order |
| `science-goals.json` | objectives and their `priorityMultiplier` |
| `orbits.json` | observation multipliers per objective, launch cost, eclipse, altitude, inclination |
| `payloads.json` | instruments: cost, mass, power, data, and science per objective |
| `spacecraft.json` | `buses`, `powers`, `comms` |
| `launchers.json` | capacity, supported orbits, and reliability |
| `events.json` | events: weight, duration, effects, and conditions |
| `content.en.json` | all texts: UI, items, help per screen (`help.<screen>`), glossary, validation and report messages |
| `audio.json` | music and effects files and volumes, music per screen (`musicByScreen`, `null` = silence), fade duration, and credits |

- Units are in the field name: `massKg`, `powerW`, `costM`, `dataGbPerMonth`, `storageGb`, `batteryWh`, `eclipseDurationH`.
- Names and descriptions are referenced by `nameKey` and `descriptionKey` (dotted key in `content.en.json`). `visualSlot` links the item to an existing SVG part.
- Accepted **effects**: `powerGenerationMultiplier`, `instrumentAvailabilityMultiplier`, `downlinkMultiplier`, `scienceOpportunityMultiplier`. Accepted **conditions**: `powerMarginRatioBelow`, `downlinkMarginRatioBelow`, `hasInstrument`, `orbitIs`, `goalPriorityIs`. A new type requires code in `simulation.js` and tests.
- Adding a new item with a new id works without touching JS, but a new `visualSlot` requires a part in `spacecraft-svg.js`.
- When changing relevant numbers, **bump `dataVersion`** in `game.json`: old saves are discarded with a friendly warning.
- After tweaking numbers, run `npm test`. The calibration test (below) warns you if the balance is broken.

### Calibration (`tests/balance.test.js`)

`tests/fixtures/reference-configs.json` stores 3 reference configurations (used only in testing). The values below come from the current execution, with the 10 fixed seeds from `tests/helpers.js`.

| Configuration | Priority | Orbit | Cost | Mass | Wins | Average Science |
|---|---|---|---:|---:|---:|---:|
| `fire-balanced` (4 instruments, average margins) | wildfires | equatorial | $262M | 635 kg | 10/10 | 72.9 |
| `forest-lean-radar` (cheaper and lighter, low reliability, no downlink margin) | deforestation | SSO | $230M | 480 kg | 10/10 | 70.7 |
| `air-premium` (heavy, expensive, with margins) | airQuality | SSO | $295M | 740 kg | 10/10 | 79.8 |

The test requires:

- the 3 with no blocks;
- goal met in at least 9 out of 10 seeds;
- each pair differs ≥10% in at least 2 among cost, mass, and science;
- one configuration per priority;
- there are valid designs that fail: `slow-link` (UHF, 0/10) and `single-camera` (0/10);
- no design with all 5 instruments is launchable (budget and mass force choices);
- no option strictly dominates the others in the same category.

Overview of all designs (`node scripts/explore-balance.mjs`): 14,685 valid designs, of which 687 win in ≥9 out of 10 seeds. The balance points are at 3 to 4 instruments, and 1-instrument designs never win.

## Testing and verification

`npm test` runs 97 tests: configuration validator (including `audio.json`), formulas, validation, simulation, state and save, sound preferences, loader failures, text key coverage, and calibration.

Manually verified in Chrome (1440×900 and 1280×720), with no console errors:

- complete flow from menu to debrief;
- refresh and Continue (even mid-simulation);
- Back and Edit;
- blocked launch;
- Pause, Play, 5×, 10×, and Skip to Results;
- Try Again with a new seed;
- incompatible save and corrupted save;
- `prefers-reduced-motion`;
- invalid JSON;
- subpath build and offline gameplay after loading;
- axe-core (WCAG 2 A/AA and best practices): 0 violations across all screens and the dialog.

## Audio credits

All sounds come from [Freesound](https://freesound.org). The credits also appear in-game, under *Audio credits* in the main menu.

- *Ambient, Pad, Guitar - Dawning*, by Andrewkn: https://freesound.org/s/859582/, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license (requires attribution).
- Under CC0 1.0: *Making Up (Soft Hip Hop)*, by shortiefoeva2; *Menu Selection Click*, by NenadSimic; *Hint*, by dland; *Race Start Ready Go*, by steel2008; *Rocket Launch*, by gracenew; *Tada Fanfare A*, by plasterbrain; *Notification Sound*, by yfjesse; *Liminal Space Alarm* (excerpt), by Johnmode. The links are in `audio.json` and in the READMEs under `music/`.

## Known issues and limitations

- Tested only on **Chrome** (desktop). Firefox and Safari were not tested.
- The art is simple and vector-based; it does not replicate the finish of the reference images.
- The stepper is not clickable, and navigation is only via Back/Next and Edit links.

## License

MIT (see `LICENSE`).