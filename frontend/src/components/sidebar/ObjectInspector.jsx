/**
 * sidebar/ObjectInspector.jsx
 * Shows a list of all placed objects and routed pathways with their
 * coordinates and dimensions from the backend response.
 */
import { OBJECT_DIMENSIONS } from '../../data/featureCatalog';

export default function ObjectInspector({ layout }) {
  if (!layout) return null;

  const objects  = layout.objects  || [];
  const pathways = layout.pathways || [];

  return (
    <div className="sidebar-bottom object-inspector">
      <h3>📍 Placed Objects</h3>

      <div className="object-list">
        <div className="object-row header">
          <span>Type</span>
          <span>Pos (X,Y)</span>
          <span>Size (W×D)</span>
        </div>

        {objects.map(obj => {
          const dims = OBJECT_DIMENSIONS[obj.variant] || OBJECT_DIMENSIONS['default'];
          return (
            <div key={obj.id} className="object-row">
              <span className="obj-type">{(obj.type ?? obj.id ?? '—').replace(/_/g, ' ')}</span>
              <span className="obj-pos">{obj.x}, {obj.y}</span>
              <span className="obj-size">{dims.width}×{dims.depth}</span>
            </div>
          );
        })}

        {pathways.length > 0 && (
          <>
            <div className="object-row header" style={{ marginTop: 12 }}>
              <span>Pathway</span>
              <span>Start</span>
              <span>Width</span>
            </div>
            {pathways.map(pw => {
              const [sx, sz] = pw.points?.[0] ?? [0, 0];
              return (
                <div key={pw.id} className="object-row">
                  <span className="obj-type">{(pw.variant ?? pw.id ?? 'pathway').replace(/_/g, ' ')}</span>
                  <span className="obj-pos">{sx.toFixed(1)}, {sz.toFixed(1)}</span>
                  <span className="obj-size">{pw.width}m</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
