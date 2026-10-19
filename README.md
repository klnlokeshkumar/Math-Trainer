# Math Practice Hub

A static, GitHub Pages-ready practice site for SSC CGL and other competitive-exam calculation skills. No build step, backend, account, or third-party JavaScript dependency is required.

## Included trainers

1. Tables 20 × 20 (multiplication/division, custom tables and factor limits)
2. Addition (single-digit, two-digit and four-digit sums, with balanced carrying practice)
3. Two-digit multiplication
4. Squares and square roots (optional estimates for non-perfect squares, rounded to 1–3 decimal places)
5. Cubes and cube roots (optional estimates for non-perfect cubes, rounded to 1–3 decimal places)
6. Fractions to decimals (exact decimals up to two places, or include non-terminating values rounded to two places)
7. Percentages ↔ fractions
8. Divisibility rules
9. Unit digit and last two digits of powers
10. Approximate division
11. Prime hunt (1–200)
12. Prime or composite
13. Alphabet–number reasoning (two modes only: letter → number for A–Z = 1–26, and number → letter for 1–32, including 27 = A through 32 = F)

Each trainer has its own `index.html`, `style.css`, and `script.js`. Reusable styles, favicon assets, and the session engine live in `assets/` and `shared/`.

## Features

- Question-count, timed, and all-possibilities-once session modes.
- Optional per-question time target.
- Progressive, easy, medium, hard and mixed difficulty choices.
- Universal answer format: choose typed input or multiple-choice options; the preference follows the learner across all trainers in the same browser.
- Shared difficulty, session mode, question count, time limit and per-question target settings carry across all trainers. Square-root/cube-root approximation mode and rounding precision are shared between the two root trainers; other skill-specific settings are remembered for that individual trainer.
- Correct answers appear inline in green; wrong answers appear in red with strikethrough followed by the green correct answer. All answer outcomes remain visible for one second before the next question, including during timed and per-question timeout flows.
- Session termination checks on time expiry, count completion, pool completion and manual stop.
- End-of-session question review with entered answer, correct answer, result, response time and explanation where available.
- Browser-local analytics and trainer preferences in `localStorage`; history can be exported as JSON or cleared from the homepage. Preferences stay in the current browser profile and are not synced to other devices.
- Decimal comparison is numeric, so `0.5`, `0.50` and `0.500` are treated as equal when appropriate. Fraction answers are compared as equivalent simplified fractions.
- Responsive layout for desktop and mobile.
- A branded SVG, PNG, ICO, and Apple touch favicon are linked from the homepage and all 13 trainer pages using project-relative paths.

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
│   ├── js/hub.js
│   ├── favicon.svg
│   ├── favicon-32.png
│   ├── favicon-180.png
│   └── favicon.ico
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
- Approximate division and optional square-root/cube-root practice have explicit rounding targets to make grading unambiguous.
- Fraction/decimal inputs use Enter or the Check button because decimal answers can have different lengths. Numeric questions use automatic submission when an expected digit count or explicit decimal precision is known; variable-length free-form answers keep an explicit submission path.

### Answer submission and input validation
- Unit-digit multiple-choice questions always show exactly four unique options, all from 0–9, including the correct digit. Distractors prefer the skill-specific common-error candidates, then fill from the remaining digits.
- Typed integer questions auto-submit when the expected answer digit count is reached; unit digit uses one digit and last-two-digits uses two digits, including a leading zero when appropriate.
- Decimal questions with a stated precision auto-submit once the requested fractional digits are entered. Exact-decimal and rounded-division answers use their expected representation length when no fixed precision instruction is present. Decimal and numeric-division grading ignores unnecessary trailing zeros.
- Typed Yes/No and Prime/Composite questions auto-submit when a complete valid answer token is entered. Multiple-select questions and free-form fraction answers keep explicit submission because the system cannot know when a list or fraction is finished. The Enter key remains available as a fallback when a learner wants to submit an answer before reaching the automatic completion boundary.
- The Check answer button is hidden only for answer formats with a defined auto-submit rule; it stays visible for multi-select and free-form fraction questions.

### Multiple-choice behavior and answer reveal
- Single-answer multiple-choice questions submit as soon as an option is selected; the Check answer button is hidden for these questions.
- The resolved answer is inserted into the question line for every trainer and answer format: correct answers are green; incorrect responses show the submitted answer in red with strikethrough, followed by the green correct answer. Single-choice selections are also highlighted, and select-all questions retain a Check answer button.
- After every response—including correct, incorrect, and per-question timeout—the reveal remains visible for one second before moving to the next question or showing timed-session results.
- Numeric distractors are generated from skill-specific error patterns rather than a universal list of arbitrary offsets. The option order is shuffled, choices are deduplicated using the same equivalence rules as grading, and exactly one choice is correct for single-answer items.
- Tables and multiplication use adjacent-factor mistakes; squares and cubes use nearby powers plus common operation confusions; approximate roots and decimals use rounding/place-value errors; fractions and percentages use scale, reciprocal, numerator/denominator and early-rounding errors; powers' last digits use exponent and modulo mistakes; approximate division uses rounding-direction and divisor-estimation mistakes.
- Divisibility and prime/composite items remain Yes/No because they have two meaningful categories. Prime hunt remains a select-all item with the full candidate set. These are not forced into four choices by adding low-quality alternatives.
- Percentage-to-fraction questions are generated only when the displayed percentage is exact at its shown precision. Repeating percentages are reserved for fraction-to-percentage questions with an explicit four-decimal rounding note, avoiding a rounded prompt with a mismatched exact fraction answer.
- The distractors are heuristic, curriculum-informed models of plausible errors, not empirically calibrated against response data from individual learners.

### Distractor-design references
- [University of Bath: How to write effective multiple-choice questions](https://teachinghub.bath.ac.uk/guide/writing-effective-multiple-choice-questions/) — recommends plausible, misconception-based, mutually exclusive options without formatting clues.
- [University of Waterloo: Designing multiple-choice questions](https://uwaterloo.ca/centre-for-teaching-excellence/catalogs/tip-sheets/designing-multiple-choice-questions) — recommends alternatives that are plausible and incorrect, and notes the challenge of adding extra useful distractors.
- [INFORMS Transactions on Education: Practical guidance for writing multiple-choice test questions](https://pubsonline.informs.org/doi/full/10.1287/ited.2022.0274) — describes using numerical error patterns as distractors to reveal likely mistakes.

## Alphabet–number reasoning trainer

- It has exactly two question types: **letter → number** (A = 1 through Z = 26) and **number → letter** (1 = A through 32 = F, so 27 = A, 28 = B, …, 32 = F).
- It never asks for number values above 32. The letter-to-number mode only expects values from 1 to 26.
- The universal answer preference applies: typed input accepts a numeric answer or any A–Z letter, and multiple-choice mode provides four choices with one correct answer.
- Selecting a multiple-choice answer submits immediately; correct and incorrect answers resolve inline and remain visible for one second.

## v9 interaction and mixed-mode prompt refinements

- Percentage-to-fraction questions use the compact `55% = ?` format. In mixed direction only, an instructional subtitle such as `Fraction in simplest form?` appears beneath the question; the subtitle is about half the question font size.
- All trainers and sprint modes now reveal the resolved answer inline after a response: correct answers in green; on incorrect answers, the entered answer appears red and struck through followed immediately by the green correct answer. Suffixes such as `%` are included with both values.
- Correct, incorrect, and question-timeout resolutions stay visible for one second before the next question or timed-session results. Timed-session expiration is deferred during this reveal interval.

### Dropdown persistence and interface consistency
- The question-category label uses a separate `questionCategory` ID, distinct from trainer setting dropdowns named `questionType`. This prevents the first question render from overwriting a dropdown's options; this also protects the Divisibility Rules trainer.
- Dynamic trainer settings are accessed through the `#trainerOptions` container first, avoiding accidental collisions with similarly named elements elsewhere in the page.
- Trainer badges share one responsive style. The alphabet–number trainer uses a letter ↔ number mapping badge consistent with the hub's violet icon system.

## Addition trainer

- Three question ranges: **single-digit** (0–9 + 0–9), **two-digit** (10–99 + 10–99), and **four-digit** (1,000–9,999 + 1,000–9,999).
- Single- and two-digit modes use every unique unordered operand pair in the selected range. The four-digit mode uses a finite, unique sample of 1,200 pairs balanced across 0–4 carry columns; generating every four-digit pair would mean over 40 million questions and is not practical for an individual sprint.
- Multiple-choice distractors are based on likely addition mistakes: omitted carries, misread place values, subtraction instead of addition, and nearby carry-related totals. Every option is checked against the valid sum range and duplicate answers are removed.
- Difficulty levels use carry count for two- and four-digit addition; the single-digit level uses the size of the sum. Fixed-length numeric answers can auto-submit under the universal input setting.
