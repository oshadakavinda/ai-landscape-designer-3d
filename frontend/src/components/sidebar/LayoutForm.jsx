import { useState } from 'react';
import { FEATURES } from '../../data/featureCatalog';

const DEFAULT_FORM = {
  land: { width: 20, depth: 30, unit: 'm' },
  house: { x: 5, y: 8, width: 10, depth: 9 },
  car_park: { type: 'open' },
  road_direction: 'south',
  vastu_priority: 5,
  vehicle_count: 1,
  ground_texture: 'grass',
  wall_texture: 'brick',
  optional_features: { bench: 1, trees: 3, bush: 1, pathway: 1 },
};

export default function LayoutForm({ onGenerate, isLoading }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  const setNested = (parent, key, val) =>
    setForm(f => ({ ...f, [parent]: { ...f[parent], [key]: Number(val) || val } }));

  const setTop = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateFeatureCount = (key, count) => {
    setForm(f => {
      const next = { ...f.optional_features };
      if (count <= 0) delete next[key];
      else next[key] = count;
      return { ...f, optional_features: next };
    });
  };

  const toggleFeature = (key) => {
    setForm(f => {
      const next = { ...f.optional_features };
      if (next[key]) delete next[key];
      else next[key] = 1;
      return { ...f, optional_features: next };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Auto-calculate car park size based on vehicles
    // Standard: 3m width per car, 5.5m depth
    const vCount = form.vehicle_count;
    const carParkData = vCount > 0 ? {
      width: Math.max(3, vCount * 3.0),
      depth: 5.5,
      type: form.car_park.type
    } : null;

    onGenerate({
      ...form,
      car_park: carParkData
    });
  };

  const vastuPct = (form.vastu_priority / 10) * 100;
  const vastuLabel = form.vastu_priority <= 3 ? 'Low' : form.vastu_priority <= 7 ? 'Medium' : 'High';

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Land ── */}
      <div className="sidebar-section">
        <div className="section-label">Land Dimensions</div>
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
      </div>

      {/* ── House ── */}
      <div className="sidebar-section">
        <div className="section-label">House Placement</div>
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

      {/* ── Car Park Config ── */}
      <div className="sidebar-section">
        <div className="section-label">Car Park Configuration</div>
        <div className="form-group">
          <label>Parking Type</label>
          <select value={form.car_park.type} onChange={e => setNested('car_park', 'type', e.target.value)}>
            <option value="open">Open Parking (Paved Area)</option>
            <option value="covered">Covered / Garage Structure</option>
          </select>
        </div>
      </div>

      {/* ── Config ── */}
      <div className="sidebar-section">
        <div className="section-label">Site Configuration</div>
        <div className="form-row">
          <div className="form-group">
            <label>Road Direction</label>
            <select value={form.road_direction} onChange={e => setTop('road_direction', e.target.value)}>
              {['north', 'south', 'east', 'west'].map(d => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Vehicles</label>
            <select value={form.vehicle_count} onChange={e => setTop('vehicle_count', Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Ground Texture</label>
          <select value={form.ground_texture} onChange={e => setTop('ground_texture', e.target.value)}>
            {[
              { value: 'grass', label: 'Grass' },
              { value: 'stone_paving', label: 'Stone Paving' },
              { value: 'bare_earth', label: 'Bare Earth' },
              { value: 'mixed', label: 'Mixed' },
            ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Wall Texture</label>
          <select value={form.wall_texture} onChange={e => setTop('wall_texture', e.target.value)}>
            {[
              { value: 'brick', label: 'Brick' },
              { value: 'concrete', label: 'Concrete' },
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
        <div className="section-label">Landscape Features</div>
        <div className="feature-list">
          {FEATURES.filter(f => !f.key.includes('car_park')).map(({ key, label }) => {
            const count = form.optional_features[key] || 0;
            const active = count > 0;
            return (
              <div key={key} className={`feature-item ${active ? 'active' : ''}`}>
                <label className="feature-toggle">
                  <input type="checkbox" checked={active} onChange={() => toggleFeature(key)} />
                  <span className="check-box" />
                  <span className="feature-label">{label}</span>
                </label>
                {active && (
                  <input
                    type="number"
                    className="feature-count-input"
                    min="1"
                    max="20"
                    value={count}
                    onChange={e => updateFeatureCount(key, Number(e.target.value))}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="sidebar-section">
        <button type="submit" className="btn-generate" disabled={isLoading}>
          {isLoading ? <><span className="spinner" />Generating...</> : 'Generate Design'}
        </button>
      </div>
    </form>
  );
}
