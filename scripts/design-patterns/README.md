# Design pattern handbook

The editable handbook lives in `src/`. Run `python3 scripts/design-patterns/build.py` from the repository root to rebuild `public/design-patterns/index.html`.

`src/en-data.json` contains Chinese-to-English translations generated with the local translation service. `src/en-overrides.json` corrects technical terms and Python example strings. The build checks translation coverage and embeds both languages in the single HTML file, so readers do not need the translation service.
