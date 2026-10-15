# Math Practice Hub

A static, GitHub Pages-ready practice site for SSC CGL and other competitive-exam calculation skills. No build step, backend, account, or third-party JavaScript dependency is required.

## Included trainers

1. Tables 20 × 20 (multiplication/division, custom tables and factor limits)
2. Two-digit multiplication
3. Squares and square roots (optional estimates for non-perfect squares, rounded to 1–3 decimal places)
4. Cubes and cube roots (optional estimates for non-perfect cubes, rounded to 1–3 decimal places)
5. Fractions to decimals (exact decimals up to two places, or include non-terminating values rounded to two places)
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
- Universal answer format: choose typed input or multiple-choice options; the preference follows the learner across all trainers in the same browser.
- Shared difficulty, session mode, question count, time limit and per-question target settings carry across all trainers. Square-root/cube-root approximation mode and rounding precision are shared between the two root trainers; other skill-specific settings are remembered for that individual trainer.
- Correct answers advance immediately; incorrect answers reveal the correct answer for one second.
- Session termination checks on time expiry, count completion, pool completion and manual stop.
- End-of-session question review with entered answer, correct answer, result, response time and explanation where available.
- Browser-local analytics and trainer preferences in `localStorage`; history can be exported as JSON or cleared from the homepage. Preferences stay in the current browser profile and are not synced to other devices.
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
- Approximate division and optional square-root/cube-root practice have explicit rounding targets to make grading unambiguous.
- Fraction/decimal inputs use Enter or the Check button because decimal answers can have different lengths. Numeric questions use automatic submission when an expected digit count or explicit decimal precision is known; variable-length free-form answers keep an explicit submission path.

### Answer submission and input validation (v8)
- Unit-digit multiple-choice questions always show exactly four unique options, all from 0–9, including the correct digit. Distractors prefer the skill-specific common-error candidates, then fill from the remaining digits.
- Typed integer questions auto-submit when the expected answer digit count is reached; unit digit uses one digit and last-two-digits uses two digits, including a leading zero when appropriate.
- Decimal questions with a stated precision auto-submit once the requested fractional digits are entered. Exact-decimal and rounded-division answers use their expected representation length when no fixed precision instruction is present. Decimal and numeric-division grading ignores unnecessary trailing zeros.
- Typed Yes/No and Prime/Composite questions auto-submit when a complete valid answer token is entered. Multiple-select questions and free-form fraction answers keep explicit submission because the system cannot know when a list or fraction is finished. The Enter key remains available as a fallback when a learner wants to submit an answer before reaching the automatic completion boundary.
- The Check answer button is hidden only for answer formats with a defined auto-submit rule; it stays visible for multi-select and free-form fraction questions.

### Multiple-choice behavior (v7)
- Single-answer multiple-choice questions submit as soon as an option is selected; the Check answer button is hidden for these questions.
- The resolved answer is inserted into the question line and colored green for correct responses or red for incorrect responses. The correct choice is highlighted green, and a wrong selected choice is highlighted red.
- Multiple-choice single-answer feedback stays visible for one second before the next question. Select-all-that-apply questions retain a Check answer button.
- Numeric distractors are generated from skill-specific error patterns rather than a universal list of arbitrary offsets. The option order is shuffled, choices are deduplicated using the same equivalence rules as grading, and exactly one choice is correct for single-answer items.
- Tables and multiplication use adjacent-factor mistakes; squares and cubes use nearby powers plus common operation confusions; approximate roots and decimals use rounding/place-value errors; fractions and percentages use scale, reciprocal, numerator/denominator and early-rounding errors; powers' last digits use exponent and modulo mistakes; approximate division uses rounding-direction and divisor-estimation mistakes.
- Divisibility and prime/composite items remain Yes/No because they have two meaningful categories. Prime hunt remains a select-all item with the full candidate set. These are not forced into four choices by adding low-quality alternatives.
- Percentage-to-fraction questions are generated only when the displayed percentage is exact at its shown precision. Repeating percentages are reserved for fraction-to-percentage questions with an explicit four-decimal rounding note, avoiding a rounded prompt with a mismatched exact fraction answer.
- The distractors are heuristic, curriculum-informed models of plausible errors, not empirically calibrated against response data from individual learners.

### Distractor-design references
- [University of Bath: How to write effective multiple-choice questions](https://teachinghub.bath.ac.uk/guide/writing-effective-multiple-choice-questions/) — recommends plausible, misconception-based, mutually exclusive options without formatting clues.
- [University of Waterloo: Designing multiple-choice questions](https://uwaterloo.ca/centre-for-teaching-excellence/catalogs/tip-sheets/designing-multiple-choice-questions) — recommends alternatives that are plausible and incorrect, and notes the challenge of adding extra useful distractors.
- [INFORMS Transactions on Education: Practical guidance for writing multiple-choice test questions](https://pubsonline.informs.org/doi/full/10.1287/ited.2022.0274) — describes using numerical error patterns as distractors to reveal likely mistakes.
