import { useState } from 'react';
import { FEATURES } from '../data/featureCatalog';

const DEFAULT_FORM = {
  land: { width: 20, depth: 30, unit: 'm' },
  house: { x: 5, y: 8, width: 10, depth: 9 },
  road_direction: 'south',
  vastu_priority: 5,
  garden_style: 'family',
  vehicle_count: 1,
  ground_texture: 'grass',
  optional_features: ['bench', 'trees', 'lawn', 'pathway'],
};


export default function LayoutForm({ onGenerate, isLoading }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  const setNested = (parent, key, val) =>
    setForm(f => ({ ...f, [parent]: { ...f[parent], [key]: Number(val) || val } }));

  const setTop = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleFeature = (key) => {
    setForm(f => ({
      ...f,
      optional_features: f.optional_features.includes(key)
        ? f.optional_features.filter(k => k !== key)
        : [...f.optional_features, key],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(form);
  };

  const vastuPct = (form.vastu_priority / 10) * 100;
  const vastuLabel = form.vastu_priority <= 3 ? 'Low' : form.vastu_priority <= 7 ? 'Medium' : 'High';

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Land ── */}
      <div className="sidebar-section">
        <div className="section-label">📐 Land Dimensions</div>
        <div className="form-row">
          <div className="form-group">
            <label>Width</label>
            <input type="number" min="5" max="200" value={form.land.width}
              onChange={e => setNested('land', 'width', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Depth</label>
            <input type="number" min="5" max="200" value={form.land.depth}
              onChange={e => setNested('land', 'depth', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Unit</label>
          <select value={form.land.unit} onChange={e => setTop('land', { ...form.land, unit: e.target.value })}>
            <option value="m">Meters (m)</option>
            <option value="ft">Feet (ft)</option>
          </select>
        </div>
      </div>

      {/* ── House ── */}
      <div className="sidebar-section">
        <div className="section-label">🏠 House Placement</div>
        <div className="form-row">
          <div className="form-group">
            <label>Position X</label>
            <input type="number" min="0" value={form.house.x}
              onChange={e => setNested('house', 'x', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Position Y (Z)</label>
            <input type="number" min="0" value={form.house.y}
              onChange={e => setNested('house', 'y', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Width</label>
            <input type="number" min="3" value={form.house.width}
              onChange={e => setNested('house', 'width', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Depth</label>
            <input type="number" min="3" value={form.house.depth}
              onChange={e => setNested('house', 'depth', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Config ── */}
      <div className="sidebar-section">
        <div className="section-label">⚙️ Site Configuration</div>
        <div className="form-group">
          <label>Road Direction</label>
          <select value={form.road_direction} onChange={e => setTop('road_direction', e.target.value)}>
            {['north', 'south', 'east', 'west'].map(d => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Garden Style</label>
          <select value={form.garden_style} onChange={e => setTop('garden_style', e.target.value)}>
            {['minimal', 'family', 'luxury', 'agriculture', 'mixed'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Vehicles on Site</label>
          <select value={form.vehicle_count} onChange={e => setTop('vehicle_count', Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Ground Texture</label>
          <select value={form.ground_texture} onChange={e => setTop('ground_texture', e.target.value)}>
            {[
              { value: 'grass',        label: '🌿 Grass' },
              { value: 'stone_paving', label: '🪨 Stone Paving' },
              { value: 'bare_earth',   label: '🟤 Bare Earth' },
              { value: 'mixed',        label: '🎨 Mixed' },
            ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Vastu Priority — <strong style={{ color: 'var(--accent-green)' }}>{vastuLabel}</strong></label>
          <div className="slider-wrapper">
            <input
              type="range" min="0" max="10" step="1"
              value={form.vastu_priority}
              style={{ '--pct': `${vastuPct}%` }}
              onChange={e => setTop('vastu_priority', Number(e.target.value))}
            />
            <div className="slider-value">
              <span>0</span>
              <span className="current">{form.vastu_priority}/10</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div className="sidebar-section">
        <div className="section-label">🌿 Landscape Features</div>
        <div className="feature-grid">
          {FEATURES.map(({ key, label }) => {
            const active = form.optional_features.includes(key);
            return (
              <label key={key} className={`feature-chip ${active ? 'active' : ''}`}>
                <input type="checkbox" checked={active} onChange={() => toggleFeature(key)} />
                <span className="check-box" />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="sidebar-section">
        <button type="submit" className="btn-generate" disabled={isLoading}>
          {isLoading ? <><span className="spinner" />Generating...</> : '✨ Generate Design'}
        </button>
      </div>
    </form>
  );
}
