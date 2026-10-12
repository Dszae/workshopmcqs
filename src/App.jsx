import { useEffect, useMemo, useRef, useState } from 'react';
import QuestionCard from './components/QuestionCard';
import { chaptersConfig } from './data/mcqData';

const STORAGE_KEY = 'workshop_mcqs_state_v2';
const STATE_VERSION = 2;
const QUESTIONS_PER_PAGE = 8;

function readStoredState(questionIds) {
  const defaults = { version: STATE_VERSION, answers: {}, bookmarks: [], review: [], theme: 'light', attempts: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.version === STATE_VERSION) return { ...defaults, ...saved };
    const oldAnswers = JSON.parse(localStorage.getItem('workshop_answers') || '{}');
    const oldBookmarks = JSON.parse(localStorage.getItem('workshop_bookmarks') || '[]');
    return {
      ...defaults,
      answers: Object.fromEntries(Object.entries(oldAnswers || {}).filter(([id, value]) => questionIds.has(Number(id)) && Number.isInteger(value))),
      bookmarks: Array.isArray(oldBookmarks) ? oldBookmarks.filter((id) => questionIds.has(Number(id))) : [],
    };
  } catch {
    return defaults;
  }
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function App() {
  const allQuestions = useMemo(() => chaptersConfig.flatMap((chapter, chapterIndex) => chapter.base.slice(0, chapter.targetCount).map((data, index) => ({
    globalId: chaptersConfig.slice(0, chapterIndex).reduce((total, item) => total + item.base.length, 0) + index + 1,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    questionText: data[0],
    options: Array.isArray(data[1]) ? data[1] : [],
    correctIdx: data[2],
    explanation: data[3] || 'No explanation has been provided for this question yet.',
    resourceLink: data[4] || null,
  }))), []);
  const questionIds = useMemo(() => new Set(allQuestions.map((question) => question.globalId)), [allQuestions]);
  const [storedState, setStoredState] = useState(() => readStoredState(questionIds));
  const [page, setPage] = useState(1);
  const [view, setView] = useState('learn');
  const [query, setQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [examSetup, setExamSetup] = useState({ count: Math.min(10, allQuestions.length), chapterId: 'all', timed: false, minutes: 10 });
  const [examSession, setExamSession] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const importInputRef = useRef(null);
  const submitLock = useRef(false);
  const submitExamRef = useRef(null);

  const { answers, bookmarks, review, theme, attempts } = storedState;
  const updateState = (change) => setStoredState((current) => ({ ...current, ...change }));

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState)); } catch { /* Storage can be unavailable in private browsing. */ }
  }, [storedState]);

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const examTimed = examSession?.timed;
  const timeLeft = examSession?.timeLeft;

  useEffect(() => {
    if (!examTimed || timeLeft <= 0) return undefined;
    const timer = window.setInterval(() => setExamSession((current) => current ? { ...current, timeLeft: current.timeLeft - 1 } : current), 1000);
    return () => window.clearInterval(timer);
  }, [examTimed, timeLeft]);

  useEffect(() => {
    if (examTimed && timeLeft === 0) submitExamRef.current?.(true);
  }, [examTimed, timeLeft]);

  const answeredCount = Object.keys(answers).filter((id) => questionIds.has(Number(id))).length;
  const correctCount = allQuestions.reduce((total, question) => total + (answers[question.globalId] === question.correctIdx ? 1 : 0), 0);
  const incorrectIds = useMemo(() => new Set(allQuestions.filter((question) => answers[question.globalId] !== undefined && answers[question.globalId] !== question.correctIdx).map((question) => question.globalId)), [allQuestions, answers]);

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allQuestions.filter((question) => {
      const matchesQuery = !normalizedQuery || `${question.questionText} ${question.options.join(' ')} ${question.chapterTitle}`.toLowerCase().includes(normalizedQuery);
      const matchesChapter = chapterFilter === 'all' || question.chapterId === chapterFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'bookmarked' && bookmarks.includes(question.globalId)) || (statusFilter === 'incorrect' && incorrectIds.has(question.globalId)) || (statusFilter === 'unanswered' && answers[question.globalId] === undefined) || (statusFilter === 'review' && review.includes(question.globalId));
      return matchesQuery && matchesChapter && matchesStatus;
    });
  }, [allQuestions, answers, bookmarks, chapterFilter, query, review, statusFilter, incorrectIds]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE));
  const visibleQuestions = filteredQuestions.slice((page - 1) * QUESTIONS_PER_PAGE, page * QUESTIONS_PER_PAGE);
  const chapters = chaptersConfig.map((chapter) => ({ ...chapter, questions: allQuestions.filter((question) => question.chapterId === chapter.id) }));

  const changeView = (nextView) => { setView(nextView); setPage(1); setQuery(''); setChapterFilter('all'); setStatusFilter('all'); };
  const selectAnswer = (questionId, optionIndex) => updateState({ answers: { ...answers, [questionId]: optionIndex } });
  const toggleId = (key, id) => updateState({ [key]: storedState[key].includes(id) ? storedState[key].filter((item) => item !== id) : [...storedState[key], id] });
  const resetFilters = () => { setQuery(''); setChapterFilter('all'); setStatusFilter('all'); setPage(1); };

  const startExam = () => {
    const pool = allQuestions.filter((question) => examSetup.chapterId === 'all' || question.chapterId === examSetup.chapterId);
    const selected = shuffle(pool).slice(0, Math.min(Number(examSetup.count), pool.length)).map((question) => {
      const optionOrder = shuffle(question.options.map((_, index) => index));
      return { ...question, options: optionOrder.map((index) => question.options[index]), correctIdx: optionOrder.indexOf(question.correctIdx) };
    });
    submitLock.current = false;
    setExamSession({ questions: selected, answers: {}, current: 0, timed: examSetup.timed, timeLeft: examSetup.timed ? Math.max(60, Number(examSetup.minutes) * 60) : null });
    setView('exam');
  };

  function submitExam(isAutomatic = false) {
    if (!examSession || submitLock.current) return;
    submitLock.current = true;
    const { questions: examQuestions, answers: examAnswers } = examSession;
    const attempted = examQuestions.filter((question) => examAnswers[question.globalId] !== undefined);
    const correct = attempted.filter((question) => examAnswers[question.globalId] === question.correctIdx).length;
    const result = { questions: examQuestions, answers: examAnswers, attempted: attempted.length, correct, automatic: isAutomatic, total: examQuestions.length, completedAt: new Date().toISOString() };
    setExamResult(result);
    updateState({ attempts: [{ id: Date.now(), score: correct, total: examQuestions.length, attempted: attempted.length, accuracy: attempted.length ? Math.round((correct / attempted.length) * 100) : 0, completedAt: result.completedAt }, ...attempts].slice(0, 10) });
    setExamSession(null);
    setView('results');
  }
  useEffect(() => { submitExamRef.current = submitExam; });

  const exportProgress = () => {
    const payload = { version: STATE_VERSION, exportedAt: new Date().toISOString(), answers, bookmarks, review, attempts, theme };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'workshop-mcqs-progress.json'; link.click(); URL.revokeObjectURL(url);
  };

  const importProgress = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (imported.version !== STATE_VERSION || !imported.answers || !Array.isArray(imported.bookmarks) || !Array.isArray(imported.review)) throw new Error('This is not a supported progress file.');
      const validAnswerEntries = Object.entries(imported.answers).filter(([id, value]) => questionIds.has(Number(id)) && Number.isInteger(value) && value >= 0 && value < (allQuestions.find((question) => question.globalId === Number(id))?.options.length || 0));
      const validIds = (values) => values.filter((id) => questionIds.has(Number(id))).map(Number);
      updateState({ answers: { ...answers, ...Object.fromEntries(validAnswerEntries) }, bookmarks: [...new Set([...bookmarks, ...validIds(imported.bookmarks)])], review: [...new Set([...review, ...validIds(imported.review)])] });
      setImportMessage(`Imported ${validAnswerEntries.length} answers and merged your saved lists.`);
    } catch (error) { setImportMessage(error.message || 'Could not import that file.'); }
  };

  const resetProgress = (chapterId = 'all') => {
    if (!window.confirm(`Reset ${chapterId === 'all' ? 'all saved progress' : "this chapter's progress"}? This cannot be undone.`)) return;
    const ids = new Set(allQuestions.filter((question) => chapterId === 'all' || question.chapterId === chapterId).map((question) => question.globalId));
    updateState({ answers: Object.fromEntries(Object.entries(answers).filter(([id]) => !ids.has(Number(id)))), bookmarks: bookmarks.filter((id) => !ids.has(id)), review: review.filter((id) => !ids.has(id)) });
  };

  const renderQuestions = (questions) => questions.length ? questions.map((question) => <QuestionCard key={question.globalId} {...question} id={question.globalId} question={question.questionText} selectedOption={answers[question.globalId] ?? null} onSelectOption={selectAnswer} isBookmarked={bookmarks.includes(question.globalId)} onToggleBookmark={(id) => toggleId('bookmarks', id)} isReview={review.includes(question.globalId)} onToggleReview={(id) => toggleId('review', id)} />) : <EmptyState title="No questions found" text="Try a different search or clear the active filters." action="Clear filters" onAction={resetFilters} />;

  return <div className="app-container">
    <header className="app-header"><div><p className="eyebrow">ENME 106 - Study workspace</p><h1>Engineering Workshop</h1><p className="subtitle">Practice deliberately. See what needs work next.</p></div><button className="theme-button" onClick={() => updateState({ theme: theme === 'dark' ? 'light' : 'dark' })} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</button></header>
    <nav className="main-nav" aria-label="Primary navigation">{[['learn', 'Learn'], ['dashboard', 'Progress'], ['revision', 'Revision'], ['setup', 'Exam practice']].map(([key, label]) => <button key={key} className={view === key || (key === 'setup' && view === 'exam') ? 'active' : ''} onClick={() => changeView(key)}>{label}</button>)}</nav>
    {view === 'learn' && <main><section className="overview-panel"><div><p className="eyebrow">Question bank</p><h2>Build confident workshop knowledge</h2><p className="muted">{answeredCount} of {allQuestions.length} questions attempted - {correctCount} correct overall</p></div><div className="progress-track" aria-label={`${answeredCount} of ${allQuestions.length} questions attempted`}><span style={{ width: `${allQuestions.length ? (answeredCount / allQuestions.length) * 100 : 0}%` }} /></div></section><section className="filters" aria-label="Question filters"><label className="search-label">Search questions<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Try lathe, safety, or a tool" /></label><label>Chapter<select value={chapterFilter} onChange={(event) => { setChapterFilter(event.target.value); setPage(1); }}><option value="all">All chapters</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label><label>Status<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">All questions</option><option value="unanswered">Unanswered</option><option value="incorrect">Needs revision</option><option value="bookmarked">Bookmarked</option><option value="review">Marked for later</option></select></label>{(query || chapterFilter !== 'all' || statusFilter !== 'all') && <button className="text-button" onClick={resetFilters}>Clear filters</button>}</section><div className="chapter-strip" aria-label="Chapter shortcuts">{chapters.map((chapter) => <button key={chapter.id} onClick={() => { setChapterFilter(chapter.id); setPage(1); }}>{chapter.title.replace('Module ', 'M')}</button>)}</div><section className="question-list">{renderQuestions(visibleQuestions)}</section>{filteredQuestions.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}</main>}
    {view === 'setup' && <ExamSetup setup={examSetup} setSetup={setExamSetup} available={allQuestions.length} chapters={chapters} onStart={startExam} />}
    {view === 'exam' && examSession && <ExamView session={examSession} setSession={setExamSession} onSubmit={() => submitExam(false)} />}
    {view === 'results' && examResult && <Results result={examResult} onRetry={() => changeView('setup')} />}
    {view === 'dashboard' && <Dashboard allQuestions={allQuestions} answers={answers} attempts={attempts} bookmarks={bookmarks} onReset={resetProgress} />}
    {view === 'revision' && <main><section className="page-heading"><p className="eyebrow">Revision desk</p><h2>Saved for another pass</h2><p className="muted">Bookmarks, incorrect answers, and questions you marked for later are collected here.</p></section><section className="revision-tools"><button className="secondary-button" onClick={exportProgress}>Export progress</button><button className="secondary-button" onClick={() => importInputRef.current?.click()}>Import progress</button><input ref={importInputRef} type="file" accept="application/json" hidden onChange={importProgress} />{importMessage && <p role="status" className="muted">{importMessage}</p>}</section><div className="revision-summary"><span>{bookmarks.length} bookmarks</span><span>{incorrectIds.size} incorrect</span><span>{review.length} marked later</span></div>{renderQuestions(allQuestions.filter((question) => bookmarks.includes(question.globalId) || incorrectIds.has(question.globalId) || review.includes(question.globalId)))}</main>}
    <footer><span>Workshop MCQs - Your progress stays in this browser.</span><button className="text-button" onClick={() => resetProgress()}>Reset all progress</button></footer>
  </div>;
}

function EmptyState({ title, text, action, onAction }) { return <div className="empty-state"><h3>{title}</h3><p>{text}</p>{action && <button className="secondary-button" onClick={onAction}>{action}</button>}</div>; }
function Pagination({ page, totalPages, onChange }) { return <div className="pagination"><button className="secondary-button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button><span aria-live="polite">Page {page} of {totalPages}</span><button className="secondary-button" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next</button></div>; }

function ExamSetup({ setup, setSetup, available, chapters, onStart }) { return <main className="setup-page"><section className="page-heading"><p className="eyebrow">Exam practice</p><h2>Test yourself without instant feedback</h2><p className="muted">Answers and explanations stay hidden until you submit.</p></section><div className="setup-form"><label>Questions<input type="number" min="1" max={available} value={setup.count} onChange={(event) => setSetup({ ...setup, count: Math.max(1, Math.min(available, Number(event.target.value) || 1)) })} /></label><label>Chapter<select value={setup.chapterId} onChange={(event) => setSetup({ ...setup, chapterId: event.target.value })}><option value="all">All chapters</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={setup.timed} onChange={(event) => setSetup({ ...setup, timed: event.target.checked })} /> Timed attempt</label>{setup.timed && <label>Minutes<input type="number" min="1" max="120" value={setup.minutes} onChange={(event) => setSetup({ ...setup, minutes: Math.max(1, Math.min(120, Number(event.target.value) || 1)) })} /></label>}<button className="primary-button" onClick={onStart}>Start exam</button></div></main>; }

function ExamView({ session, setSession, onSubmit }) { const question = session.questions[session.current]; const selected = session.answers[question.globalId]; const answered = Object.keys(session.answers).length; return <main className="exam-page"><div className="exam-toolbar"><span>Question {session.current + 1} of {session.questions.length}</span>{session.timed && <strong className={session.timeLeft < 60 ? 'danger-text' : ''} aria-label={`${formatTime(session.timeLeft)} remaining`}>{formatTime(session.timeLeft)}</strong>}<span>{answered} answered</span></div><div className="exam-progress">{session.questions.map((item, index) => <button key={item.globalId} className={index === session.current ? 'current' : session.answers[item.globalId] !== undefined ? 'answered' : ''} onClick={() => setSession({ ...session, current: index })} aria-label={`Go to question ${index + 1}`}>{index + 1}</button>)}</div><article className="exam-card"><p className="eyebrow">{question.chapterTitle}</p><h2>{question.questionText}</h2><div className="options-list">{question.options.map((option, index) => <label key={option} className={`option-label ${selected === index ? 'selected' : ''}`}><input type="radio" name={`exam-${question.globalId}`} checked={selected === index} onChange={() => setSession({ ...session, answers: { ...session.answers, [question.globalId]: index } })} /><span>{option}</span></label>)}</div></article><div className="exam-actions"><button className="secondary-button" disabled={session.current === 0} onClick={() => setSession({ ...session, current: session.current - 1 })}>Previous</button><button className="secondary-button" disabled={session.current === session.questions.length - 1} onClick={() => setSession({ ...session, current: session.current + 1 })}>Next</button><button className="primary-button" onClick={() => { if (answered < session.questions.length && !window.confirm('Some questions are unanswered. Submit this attempt anyway?')) return; onSubmit(); }}>Submit exam</button></div></main>; }

function Results({ result, onRetry }) { const accuracy = result.attempted ? Math.round((result.correct / result.attempted) * 100) : 0; return <main><section className="results-hero"><p className="eyebrow">{result.automatic ? 'Time expired' : 'Attempt complete'}</p><h2>{result.correct} / {result.total} correct</h2><p className="muted">{result.attempted} attempted - {result.total - result.attempted} unanswered - {accuracy}% accuracy among attempted questions</p><button className="primary-button" onClick={onRetry}>Start another attempt</button></section><section className="review-list"><h3>Answer review</h3>{result.questions.map((question) => { const selected = result.answers[question.globalId]; const correct = selected === question.correctIdx; return <article className={`review-item ${correct ? 'is-correct' : 'is-wrong'}`} key={question.globalId}><p className="eyebrow">{question.chapterTitle}</p><h4>{question.questionText}</h4><p><strong>Your answer:</strong> {selected === undefined ? 'Unanswered' : question.options[selected]}</p><p><strong>Correct answer:</strong> {question.options[question.correctIdx]}</p><p className="muted">{question.explanation}</p></article>; })}</section></main>; }

function Dashboard({ allQuestions, answers, attempts, bookmarks, onReset }) {
  const chapterStats = chaptersConfig.map((chapter) => {
    const questions = allQuestions.filter((question) => question.chapterId === chapter.id);
    const attempted = questions.filter((question) => answers[question.globalId] !== undefined);
    const correct = attempted.filter((question) => answers[question.globalId] === question.correctIdx).length;
    return { ...chapter, total: questions.length, attempted: attempted.length, accuracy: attempted.length ? Math.round((correct / attempted.length) * 100) : 0 };
  });
  const attempted = allQuestions.filter((question) => answers[question.globalId] !== undefined);
  const correct = attempted.filter((question) => answers[question.globalId] === question.correctIdx).length;
  return (
    <main>
      <section className="page-heading"><p className="eyebrow">Progress dashboard</p><h2>Your study signal, without fake streaks</h2><p className="muted">Overall accuracy is based on your latest saved answer for each question. Exam attempts are shown separately.</p></section>
      <div className="metric-grid"><Metric label="Attempted" value={`${attempted.length}/${allQuestions.length}`} /><Metric label="Accuracy" value={`${attempted.length ? Math.round((correct / attempted.length) * 100) : 0}%`} /><Metric label="Bookmarked" value={bookmarks.length} /><Metric label="Exam attempts" value={attempts.length} /></div>
      <section className="chapter-progress"><h3>Chapter health</h3>{chapterStats.map((chapter) => <div className="chapter-row" key={chapter.id}><div><strong>{chapter.title}</strong><span>{chapter.attempted}/{chapter.total} attempted - {chapter.accuracy}% accuracy</span></div><div className="progress-track"><span style={{ width: `${chapter.total ? (chapter.attempted / chapter.total) * 100 : 0}%` }} /></div><button className="text-button" onClick={() => onReset(chapter.id)}>Reset</button></div>)}</section>
      {attempts.length > 0 && <section className="attempt-history"><h3>Recent exam attempts</h3>{attempts.map((attempt) => <div key={attempt.id}><span>{new Date(attempt.completedAt).toLocaleDateString()}</span><strong>{attempt.score}/{attempt.total}</strong><span>{attempt.attempted ? `${attempt.accuracy}% attempted accuracy` : 'No answers'}</span></div>)}</section>}
    </main>
  );
}

function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }



