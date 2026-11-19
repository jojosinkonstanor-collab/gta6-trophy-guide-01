# Leonida Ledger — GTA VI Trophy Guide & Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/jojosinkonstanor-collab/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/jojosinkonstanor-collab/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI — built as an entry for the [make.fun bounty](https://make.fun/bounty/gta6-trophy-guide-01).

## What it is

- **The official list, whole.** Every trophy with its official name, description and grade exactly as PlayStation publishes them: 1 platinum, 2 gold, 6 silver, 46 bronze. Names, descriptions and grades were verified 19 Nov 2026 against Exophase and PSNProfiles, which agree on all 55.
- **A tracker that remembers.** Tick trophies off and progress is saved in the browser (localStorage). Export it to a JSON file and import it back. Per-trophy progress counts (e.g. 0/250 stunts) and your own notes are saved too.
- **Filters that matter.** By grade, by kind (story, collectibles, activities, platinum, online), missable-only, hide-earned, and free-text search.
- **A spoiler guard.** Story trophies you have not earned yet show as hidden until you earn them — or turn the guard off to see everything.
- **A roadmap to the platinum.** Six stages in order, from the story (Chapters 1–5) through the optional questlines, activities, collectibles and the money/crime work, ending in the 100% checklist and the platinum. Difficulty 4/10, about 200 hours, one playthrough.
- **One missable trophy, flagged honestly.** PowerPyx and GTABase both flag Positive Mental Attitude as the only potentially missable trophy (a Chapter 1 meditation). This guide flags exactly that one and explains why the rest are not missable — including the no-mission-replay warning and the save advice that goes with it.
- **A cited guide to every trophy.** Each guide is written in our own words and names its sources beside it. Where the best available guide (PowerPyx, 18 Nov 2026) marks a trophy "not yet known", this guide says so instead of inventing a method.

## Run it offline

No build step, no network. Serve `app/` with any static server and open `index.html`:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` directly from the files. The app loads only its own files.

## Hand it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the app taken with headless Chrome:

```sh
node shots.mjs
```

## Sources

- Exophase — official trophy list (name, description, grade): https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/
- PSNProfiles — PSN progress targets: https://psnprofiles.com/trophies/43531-grand-theft-auto-vi
- PowerPyx — GTA 6 Trophy Guide & Roadmap (18 Nov 2026): https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/

An unofficial fan guide. Not affiliated with Rockstar Games, Sony or PlayStation. No Rockstar logo, artwork or game screenshots are used.

## License

MIT — see [LICENSE](LICENSE).
