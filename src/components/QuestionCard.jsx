export default function QuestionCard({ 
  id, 
  question, 
  options, 
  correctIdx, 
  explanation, 
  resourceLink, 
  selectedOption, 
  onSelectOption, 
  isBookmarked, 
  onToggleBookmark 
}) {
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === correctIdx;

  return (
    <div className={`question-card ${isBookmarked ? 'bookmarked-card' : ''}`}>
      <div className="card-top-row">
        <h4 className="question-text">
          <span className="q-number">Q{id}.</span> 
          {question}
        </h4>
        <button 
          className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={() => onToggleBookmark(id)}
          title="Bookmark for review"
          aria-label="Bookmark"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </button>
      </div>
      
      <div className="options-list">
        {options.map((opt, idx) => {
          let className = "option-label";
          if (isAnswered) {
            className += " disabled";
            if (idx === correctIdx) className += " correct";
            else if (idx === selectedOption) className += " wrong";
          }

          return (
            <label key={idx} className={className}>
              <input
                type="radio"
                name={`question-${id}`}
                className="option-input"
                disabled={isAnswered}
                checked={selectedOption === idx}
                onChange={() => onSelectOption(id, idx)}
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>

      {isAnswered && (
        <div className={`feedback-box ${isCorrect ? 'correct' : 'wrong'}`}>
          <div className="feedback-title">
            {isCorrect ? '✅ Correct!' : '❌ Incorrect.'}
          </div>
          <div>
            <strong>Explanation: </strong>{explanation}
          </div>
          
          {resourceLink && (
            <div className="resource-link-wrapper">
              <a href={resourceLink} target="_blank" rel="noopener noreferrer" className="resource-link">
                🔗 Read more about this topic
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}