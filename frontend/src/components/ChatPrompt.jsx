import { useState } from 'react';

export default function ChatPrompt({ onModify, isLoading, hasLayout }) {
  const [prompt, setPrompt] = useState('');
  const [lastAction, setLastAction] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || !hasLayout) return;

    const text = prompt.trim();
    setPrompt('');
    setLastAction({ prompt: text, status: 'loading' });

    try {
      await onModify(text);
      setLastAction({ prompt: text, status: 'success' });
    } catch {
      setLastAction({ prompt: text, status: 'error' });
    }
  };

  return (
    <div className="chat-prompt-bar">
      {lastAction && (
        <div className={`chat-last-action ${lastAction.status}`}>
          {lastAction.status === 'loading' && (
            <><span className="chat-spinner" /> Applying: "{lastAction.prompt}"</>
          )}
          {lastAction.status === 'success' && (
            <>✅ Applied: "{lastAction.prompt}"</>
          )}
          {lastAction.status === 'error' && (
            <>❌ Failed: "{lastAction.prompt}"</>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-row">
        <input
          type="text"
          className="chat-input"
          placeholder={
            hasLayout
              ? 'Describe changes… e.g. "add a pond in the northeast"'
              : 'Generate a design first to start chatting…'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading || !hasLayout}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isLoading || !hasLayout || !prompt.trim()}
        >
          {isLoading ? <span className="spinner" /> : '✨ Apply'}
        </button>
      </form>
    </div>
  );
}
