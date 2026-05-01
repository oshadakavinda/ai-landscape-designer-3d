import { useState, useEffect } from 'react';
import DesignInspector from '../components/sidebar/DesignInspector';
import TopViewSvg from '../components/viewer2d/TopViewSvg';
import ThreeDViewer from '../components/viewer3d/index';
import ScorePanel from '../components/ScorePanel';
import ChatPrompt from '../components/ChatPrompt';

export default function DesignPage({
  layout, setLayout, isLoading, error,
  onModify, onStartOver, onDismissError
}) {
  const [activeTab, setActiveTab] = useState('2d');
  const [has3dMounted, setHas3dMounted] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [walkMode, setWalkMode] = useState(false);
  const [showWalkHud, setShowWalkHud] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Track pointer lock changes globally
  useEffect(() => {
    const onChange = () => {
      const locked = !!document.pointerLockElement;
      setIsPointerLocked(locked);
      if (!locked && walkMode) {
        setWalkMode(false);
        setActiveTab('3d');
      }
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkMode]);

  // Show HUD for 4 s when entering walk mode
  useEffect(() => {
    if (!isPointerLocked) { setShowWalkHud(false); return; }
    setShowWalkHud(true);
    const t = setTimeout(() => setShowWalkHud(false), 4000);
    return () => clearTimeout(t);
  }, [isPointerLocked]);

  const handleEnterWalk = () => {
    if (!has3dMounted) setHas3dMounted(true);
    setActiveTab('walk');
    setWalkMode(true);
  };

  const handleExitWalk = () => {
    if (document.pointerLockElement) document.exitPointerLock();
    setWalkMode(false);
    setIsPointerLocked(false);
    setActiveTab('3d');
  };

  const handleUpdateObject = (updates) => {
    if (!selectedId || !layout) return;
    setLayout(prev => ({
      ...prev,
      objects: prev.objects.map(obj =>
        obj.id === selectedId ? { ...obj, ...updates } : obj
      )
    }));
  };

  const handleUpdateLayout = (updates) => {
    setLayout(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-icon">L</div>
        <div className="header-titles">
          <h1>AI Landscape Designer</h1>
          <span className="subtitle">Powered by Gemini · Vastu-aware · 3D Interactive</span>
        </div>
        <button className="btn-example" onClick={onStartOver}>
          ← New Design
        </button>
      </header>

      <div className="app-body">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <DesignInspector
            layout={layout}
            onUpdateLayout={handleUpdateLayout}
            selectedObject={layout.objects.find(obj => obj.id === selectedId)}
            onUpdateObject={handleUpdateObject}
            onSelect={setSelectedId}
            onStartOver={onStartOver}
          />
        </aside>

        {/* ── Main Viewer ── */}
        <main className="viewer-area">
          {/* View Tabs */}
          <div className="view-tabs">
            <button
              className={`view-tab ${activeTab === '2d' ? 'active' : ''}`}
              onClick={() => { setActiveTab('2d'); setWalkMode(false); }}
            >
              2D Plan
            </button>
            <button
              className={`view-tab ${activeTab === '3d' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('3d');
                setWalkMode(false);
                if (!has3dMounted) setHas3dMounted(true);
              }}
            >
              3D View
            </button>
            <button
              className={`view-tab walk-tab ${activeTab === 'walk' ? 'active' : ''}`}
              onClick={handleEnterWalk}
              title="First-person walk mode — WASD to move, drag to look"
            >
              Walk
            </button>

            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {layout.objects.length} objects · {(layout.pathways || []).length} paths
              {layout.unplaced.length > 0 && ` · ${layout.unplaced.length} unplaced`}
            </span>
          </div>

          {/* Canvas */}
          <div className="canvas-container">
            {isLoading && (
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem' }}>...</div>
                <p style={{ color: 'var(--accent-green)' }}>Gemini is updating your landscape…</p>
              </div>
            )}

            {/* 2D viewer */}
            {!isLoading && activeTab === '2d' && (
              <TopViewSvg
                layout={layout}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}

            {/* 3D viewer — lazy-mounted, kept alive via visibility */}
            {!isLoading && has3dMounted && (
              <div style={{
                position: 'absolute',
                inset: 0,
                visibility: (activeTab === '3d' || activeTab === 'walk') ? 'visible' : 'hidden',
                pointerEvents: (activeTab === '3d' || activeTab === 'walk') ? 'auto' : 'none',
              }}>
                <ThreeDViewer
                  layout={layout}
                  walkMode={walkMode}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />

                {/* ── Walk Mode HUD ── */}
                {walkMode && (
                  <>
                    {!isPointerLocked && (
                      <div
                        className="walk-capture-overlay"
                        onClick={() => {
                          const canvas = document.querySelector('canvas');
                          if (canvas) canvas.requestPointerLock();
                        }}
                      >
                        <div className="walk-capture-inner">
                          <div className="walk-capture-icon">M</div>
                          <div className="walk-capture-title">Click to enter walk mode</div>
                          <div className="walk-capture-sub">Move mouse to look · WASD to walk · Esc to exit</div>
                        </div>
                      </div>
                    )}

                    <div className={`walk-hud ${showWalkHud ? 'walk-hud-visible' : ''}`}>
                      <div className="walk-hud-inner">
                        <div className="walk-hud-title">Walk Mode</div>
                        <div className="walk-hud-keys">
                          <span className="walk-key">W A S D</span> Move
                          &nbsp;·&nbsp;
                          <span className="walk-key">Mouse</span> Look
                          &nbsp;·&nbsp;
                          <span className="walk-key">Shift</span> Sprint
                          &nbsp;·&nbsp;
                          <span className="walk-key">Esc</span> Exit
                        </div>
                      </div>
                    </div>

                    {isPointerLocked && (
                      <button className="exit-walk-btn" onClick={handleExitWalk}>
                        ✕ Exit Walk
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Unplaced Banner */}
          {layout?.unplaced?.length > 0 && (
            <div className="unplaced-banner">
              Unplaced:&nbsp;
              {layout.unplaced.map((u, i) => (
                <span key={i} style={{ marginRight: 16 }}>
                  <strong>{u.type}</strong> — {u.reason}
                </span>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {layout?.recommendations?.length > 0 && (
            <div className="notes-strip">
              {layout.recommendations.map((note, i) => (
                <div key={i} className="note-item">{note}</div>
              ))}
            </div>
          )}

          {/* Chat Prompt */}
          <ChatPrompt onModify={onModify} isLoading={isLoading} hasLayout={!!layout} />

          {/* Scores */}
          <ScorePanel scores={layout?.scores} />
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="error-toast" onClick={onDismissError}>
          {error}
        </div>
      )}
    </div>
  );
}
