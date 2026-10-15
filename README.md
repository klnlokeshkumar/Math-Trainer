# Math Practice Hub

A static, GitHub Pages-friendly collection of small maths practice trainers. Everything runs in the browser; there is no build step, backend, account, or package installation.

## Included trainers

- **Table Trainer** — multiplication and division, table selection from 1–30, custom start/end factor range, question-count or timed sessions, and all selected combinations once.
- **Fractions to Decimals** — convert terminating common fractions to decimals with question-count, timed, or all-examples mode.
- **Percentage Trainer** — calculate percentages of numbers with question-count, timed, or all-combinations mode.

Each trainer has its own `index.html`, `style.css`, and `script.js` inside its directory so it can be maintained independently.

## Folder structure

```text
math-practice-hub/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── trainers/
│   ├── table-trainer/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   ├── fractions-decimals/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── percentage-trainer/
│       ├── index.html
│       ├── style.css
│       └── script.js
└── README.md
```

## Run locally

Open the root `index.html` in a browser. For a closer match to a hosted static site, start a simple local server from this folder, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Create a GitHub repository and upload the contents of this folder to the repository root.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose your default branch (usually `main`) and the `/(root)` folder, then save.
5. Wait for the Pages deployment to complete. The published site URL will appear in the Pages settings.

This structure uses relative links, so it also works when GitHub Pages publishes the site under a repository subpath.

## Add another trainer

1. Create `trainers/your-trainer/`.
2. Add `index.html`, `style.css`, and `script.js` to that folder.
3. Link the CSS and JS from the trainer HTML using relative paths, and add a return link to `../../index.html`.
4. Add a trainer card to the root `index.html`, pointing to `trainers/your-trainer/index.html`.
5. Update the included-trainers section in this README.

## Notes

- Trainer progress is not uploaded or synced. Sessions run client-side in the current browser tab.
- The table trainer automatically submits an answer once its digit count reaches the expected answer's digit count, matching the rapid-entry design. Fractions and percentages use a Check answer button / Enter because decimal and alternate numeric formatting can have variable lengths.
