const SCORE_CONFIG = [
  { key: 'vastuScore', label: 'Vastu', color: '#a78bfa' },
  { key: 'sustainabilityScore', label: 'Sustainability', color: '#4ade80' },
  { key: 'coolingScore', label: 'Cooling', color: '#38bdf8' },
  { key: 'spaceUtilizationScore', label: 'Space Usage', color: '#f59e0b' },
];

export default function ScorePanel({ scores }) {
  if (!scores) return null;

  return (
    <div className="score-panel">
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>
        Scores
      </span>
      {SCORE_CONFIG.map(({ key, label, color }) => {
        const val = scores[key] ?? 0;
        return (
          <div className="score-item" key={key}>
            <div className="score-label">{label}</div>
            <div className="score-bar-wrap">
              <div className="score-bar-track">
                <div
                  className="score-bar-fill"
                  style={{ width: `${val}%`, background: color }}
                />
              </div>
              <span className="score-value" style={{ color }}>{val}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
