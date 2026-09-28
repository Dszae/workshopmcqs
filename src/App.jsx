import { useState, useMemo, useEffect } from 'react';
import QuestionCard from './components/QuestionCard';
import { chaptersConfig } from './data/mcqData';

export default function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [filterBookmarks, setFilterBookmarks] = useState(false);
  
  // Persistent Storage for answers and bookmarks
  const [userAnswers, setUserAnswers] = useState(() => {
    const saved = localStorage.getItem('workshop_answers');
    return saved ? JSON.parse(saved) : {};
  });

  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('workshop_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  const questionsPerPage = 10;

  useEffect(() => {
    localStorage.setItem('workshop_answers', JSON.stringify(userAnswers));
  }, [userAnswers]);

  useEffect(() => {
    localStorage.setItem('workshop_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [darkMode]);

  const allQuestions = useMemo(() => {
    let globalId = 1;
    const flattened = [];
    
    chaptersConfig.forEach(chapter => {
      for (let i = 0; i < chapter.targetCount; i++) {
        const qData = chapter.base[i % chapter.base.length];
        flattened.push({
          globalId: globalId++,
          chapterTitle: chapter.title,
          questionText: qData[0],
          options: qData[1],
          correctIdx: qData[2],
          explanation: qData[3],
          resourceLink: qData[4] || null
        });
      }
    });
    return flattened;
  }, []);

  // Calculate stats
  const totalQuestions = allQuestions.length;
  const answeredCount = Object.keys(userAnswers).length;
  let correctCount = 0;
  Object.entries(userAnswers).forEach(([qId, ansIdx]) => {
    const q = allQuestions.find(item => item.globalId === Number(qId));
    if (q && q.correctIdx === ansIdx) correctCount++;
  });

  // Filter questions if bookmark mode is active
  const activeQuestions = filterBookmarks 
    ? allQuestions.filter(q => bookmarks.includes(q.globalId))
    : allQuestions;

  const totalPages = Math.ceil(activeQuestions.length / questionsPerPage) || 1;

  const currentQuestions = activeQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  const displayedChapters = [];
  currentQuestions.forEach(q => {
    let chap = displayedChapters.find(c => c.title === q.chapterTitle);
    if (!chap) {
      chap = { title: q.chapterTitle, questions: [] };
      displayedChapters.push(chap);
    }
    chap.questions.push(q);
  });

  const handleSelectOption = (qId, optionIdx) => {
    setUserAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleToggleBookmark = (qId) => {
    setBookmarks(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Top Controls Bar */}
      <div className="top-controls">
        <button 
          className={`control-tab ${!filterBookmarks ? 'active' : ''}`}
          onClick={() => { setFilterBookmarks(false); setCurrentPage(1); }}
        >
          📖 All Questions ({totalQuestions})
        </button>
        <button 
          className={`control-tab ${filterBookmarks ? 'active' : ''}`}
          onClick={() => { setFilterBookmarks(true); setCurrentPage(1); }}
        >
          ★ Bookmarks ({bookmarks.length})
        </button>
        <button 
          className="theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          title="Toggle Dark/Light Mode"
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <header className="header">
        <h1>Engineering Workshop</h1>
        <p>ENME 106 Chapter-Wise MCQ Bank & Practice Portal</p>
        
        <div className="score-summary-bar">
          <div className="stats-badge">📝 Answered: {answeredCount}/{totalQuestions}</div>
          <div className="stats-badge success">🎯 Correct: {correctCount}</div>
        </div>
      </header>

      <main>
        {activeQuestions.length === 0 ? (
          <div className="empty-bookmarks">
            <p>No bookmarked questions found. Click the star icon on any question to save it for review!</p>
          </div>
        ) : (
          displayedChapters.map((chapter, idx) => (
            <section key={idx} className="chapter-section">
              <h2 className="chapter-title">{chapter.title}</h2>
              
              <div>
                {chapter.questions.map((q) => (
                  <QuestionCard 
                    key={q.globalId}
                    id={q.globalId}
                    question={q.questionText}
                    options={q.options}
                    correctIdx={q.correctIdx}
                    explanation={q.explanation}
                    resourceLink={q.resourceLink}
                    selectedOption={userAnswers[q.globalId] !== undefined ? userAnswers[q.globalId] : null}
                    onSelectOption={handleSelectOption}
                    isBookmarked={bookmarks.includes(q.globalId)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="page-btn" 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            
            <span className="page-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            
            <button 
              className="page-btn" 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p className="footer-credit">Built by <strong>Dipesh Sapkota</strong></p>
        <div className="social-links">
          <a href="https://www.dipeshsapkota7.com.np/" target="_blank" rel="noopener noreferrer" className="social-btn website" aria-label="Portfolio">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </a>
          
          <a href="https://github.com/dszae" target="_blank" rel="noopener noreferrer" className="social-btn github" aria-label="GitHub">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
          </a>
          
          <a href="https://linkedin.com/in/dszae" target="_blank" rel="noopener noreferrer" className="social-btn linkedin" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}