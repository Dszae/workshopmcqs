# WorkshopMCQs

A browser-based MCQ learning platform for **ENME 106 Engineering Workshop**. Study chapter by chapter, practise with immediate feedback, run exam simulations, and keep revision progress locally in your browser.

**Live app:** https://dszae.github.io/workshopmcqs/

## What it includes

- Eight curriculum modules covering workshop safety, bench work, thread cutting, sheet metal, machine tools, forging and casting, welding, and brazing and soldering.
- Learning mode with immediate answer feedback, explanations, and the reference links already supplied with the question data.
- Search across question text, answer options, and chapter names.
- Combined filters for chapter, unanswered questions, incorrect answers, bookmarks, and later review.
- Bookmarks and later-review marks for building a personal revision queue.
- Exam practice with configurable question count, optional chapter selection, randomized question and option order, question navigation, and optional countdown timing.
- Exam results with score, attempted count, unanswered count, accuracy, and a complete answer review.
- Progress dashboard with overall accuracy, attempted questions, bookmark count, chapter coverage, and recent exam attempts.
- Dark and light themes with saved preference, responsive layouts, keyboard focus states, semantic controls, and reduced-motion support.
- Progress export and validated JSON import for moving saved study data between browsers.

## Learning modes

### Learn

Questions are shown in the normal bank with immediate feedback. Once an answer is selected, the card identifies the selected and correct answers and shows the verified explanation.

### Exam practice

Exam mode keeps answers and explanations hidden until submission. It supports unanswered-question confirmation and automatically submits when a timed attempt reaches zero. Each new attempt uses a fresh randomized question set.

### Progress and revision

Progress is calculated from recorded answers and is not presented as a streak or prediction. The dashboard separates saved question accuracy from recent exam-attempt results. Revision combines bookmarked, incorrect, and later-review questions.

## Data and privacy

The app has no backend, account system, or cloud synchronization. Study data stays in the browser's LocalStorage.

The current storage key is `workshop_mcqs_state_v2`. The state is versioned and includes:

- Saved answers
- Bookmarks
- Later-review marks
- Theme preference
- Recent exam attempts

Existing `workshop_answers` and `workshop_bookmarks` data is migrated when possible. Malformed storage is ignored safely. Imports must contain the supported version and valid structures; unknown question identifiers and invalid answer indexes are excluded. Imports merge valid answers and saved lists into the current browser state.

## Project structure

```text
src/
  App.jsx                 Main navigation, learning state, exams, dashboard, and persistence
  components/
    QuestionCard.jsx      Accessible learning-mode question card
  data/
    mcqData.js            Original chapter and question data
  index.css               Responsive theme and component styles
  types.ts                Question and chapter type documentation
```

Question content is kept in `src/data/mcqData.js`. Each question uses the existing tuple format:

```js
[questionText, options, correctOptionIndex, explanation, resourceLink]
```

The app creates stable numeric IDs from the chapter order. Do not reorder or remove existing questions without considering saved progress compatibility.

## Local development

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

The development server is available at the URL printed by Vite. The configured GitHub Pages base path is `/workshopmcqs/`.

## Checks and production build

```bash
npm run lint
npm run build
npm run preview
```

`npm run lint` uses Oxlint. `npm run build` creates the deployable `dist/` directory.

## Deployment

The Vite configuration uses:

```js
base: '/workshopmcqs/'
```

Keep this base path when deploying to the `dszae/workshopmcqs` GitHub Pages project. Build the project and publish the generated `dist/` directory using the repository's deployment workflow.

## Author

**Dipesh Sapkota**

- Portfolio: https://www.dipeshsapkota7.com.np/
- GitHub: https://github.com/dszae
- LinkedIn: https://linkedin.com/in/dszae

## License

This project is open source. Add a license file before distributing it under a specific license.
