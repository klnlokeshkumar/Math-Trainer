# Math Practice Hub

A static, GitHub Pages-ready practice site for SSC CGL and other competitive-exam calculation skills. No build step, backend, account, or third-party JavaScript dependency is required.

## Included trainers

1. Tables 20 × 20 (multiplication/division, custom tables and factor limits)
2. Two-digit multiplication
3. Squares and square roots
4. Cubes and cube roots
5. Fractions to decimals (exact values up to two decimal places or rounding to two places)
6. Percentages ↔ fractions
7. Divisibility rules
8. Unit digit and last two digits of powers
9. Approximate division
10. Prime hunt (1–200)
11. Prime or composite

Each trainer has its own `index.html`, `style.css`, and `script.js`. Reusable styles and the session engine live in `assets/` and `shared/`.

## Features

- Question-count, timed, and all-possibilities-once session modes.
- Optional per-question time target.
- Progressive, easy, medium, hard and mixed difficulty choices.
- Correct answers advance immediately; incorrect answers reveal the correct answer for one second.
- Session termination checks on time expiry, count completion, pool completion and manual stop.
- End-of-session question review with entered answer, correct answer, result, response time and explanation where available.
- Browser-local analytics in `localStorage`; history can be exported as JSON or cleared from the homepage.
- Decimal comparison is numeric, so `0.5`, `0.50` and `0.500` are treated as equal when appropriate. Fraction answers are compared as equivalent simplified fractions.
- Responsive layout for desktop and mobile.

## Run locally

Open `index.html` in a modern browser. For the best local development experience, you can use a static local server, but there is no build step.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload the **contents** of this folder to the repository root (so `index.html` is at the root).
3. Go to **Settings → Pages**.
4. Select **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Open the published Pages URL once deployment completes.

All internal links are relative paths and are intended to work under a project Pages URL.

## Local history and privacy

Session history is saved to `localStorage` in the current browser profile and on the current device. It is not sent to a server. Clearing browser site data can remove it. Use **Export history (JSON)** on the homepage to make a backup.

## Project layout

```text
math-practice-hub/
├── index.html
├── README.md
├── .nojekyll
├── assets/
│   ├── css/site.css
│   └── js/hub.js
├── shared/
│   ├── question-utils.js
│   └── session-engine.js
└── trainers/
    └── <trainer-slug>/
        ├── index.html
        ├── style.css
        └── script.js
```

## Notes

- “All possibilities once” uses the finite generated pool for the selected trainer options.
- Timed sessions recycle a shuffled pool only after exhausting it; count-limited and all-once sessions do not intentionally repeat a question before the pool is exhausted.
- Approximate division has an explicit rounding target to make grading unambiguous.
- Fraction/decimal inputs use Enter or the Check button because decimal answers can have different lengths. Numeric questions use automatic submission only when a safe integer digit count is known.
