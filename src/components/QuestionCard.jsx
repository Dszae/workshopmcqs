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
  onToggleBookmark,
  isReview,
  onToggleReview,
}) {
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === correctIdx;

  return (
    <article className={`question-card ${isBookmarked ? 'bookmarked-card' : ''}`} aria-labelledby={`question-${id}`}>
      <div className="card-top-row">
        <h3 id={`question-${id}`} className="question-text"><span className="q-number">Q{id}.</span> {question}</h3>
        <div className="card-actions">
          <button className={`icon-button ${isBookmarked ? 'active' : ''}`} onClick={() => onToggleBookmark(id)} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'} aria-pressed={isBookmarked} title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}>★</button>
          <button className={`icon-button ${isReview ? 'active review-active' : ''}`} onClick={() => onToggleReview(id)} aria-label={isReview ? 'Remove later review mark' : 'Mark for later review'} aria-pressed={isReview} title={isReview ? 'Remove later review mark' : 'Mark for later review'}>Review</button>
        </div>
      </div>
      <fieldset className="options-list">
        <legend className="sr-only">Choose an answer</legend>
        {options.map((option, index) => {
          let className = 'option-label';
          if (isAnswered) {
            className += ' disabled';
            if (index === correctIdx) className += ' correct';
            else if (index === selectedOption) className += ' wrong';
          }
          return <label key={`${id}-${index}`} className={className}>
            <input type="radio" name={`question-${id}`} disabled={isAnswered} checked={selectedOption === index} onChange={() => onSelectOption(id, index)} />
            <span>{option}</span>
            {isAnswered && index === correctIdx && <strong className="answer-tag">Correct</strong>}
            {isAnswered && index === selectedOption && index !== correctIdx && <strong className="answer-tag">Your answer</strong>}
          </label>;
        })}
      </fieldset>
      {isAnswered && <div className={`feedback-box ${isCorrect ? 'correct' : 'wrong'}`} role="status"><strong>{isCorrect ? 'Correct.' : 'Not quite.'}</strong><p><strong>Explanation:</strong> {explanation}</p>{resourceLink && <a href={resourceLink} target="_blank" rel="noopener noreferrer" className="resource-link">Read more about this topic</a>}</div>}
    </article>
  );
}
