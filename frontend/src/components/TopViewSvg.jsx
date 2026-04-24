import { OBJECT_COLORS } from '../data/featureCatalog';

const PADDING = 30; // svg padding px
const LABEL_FONT = 9;

export default function TopViewSvg({ layout }) {
  if (!layout) return null;

  const { land, house, objects = [], zones = [] } = layout;
  const SVG_W = 600;
  const SVG_H = 500;

  const scaleX = (SVG_W - PADDING * 2) / land.width;
  const scaleY = (SVG_H - PADDING * 2) / land.depth;
  const scale = Math.min(scaleX, scaleY);

  // Convert world coords → svg coords (flip Y since SVG 0 is top-left)
  const wx = (x) => PADDING + x * scale;
  const wy = (y) => SVG_H - PADDING - y * scale;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* Grid */}
      <defs>
        <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse"
          x={PADDING} y={SVG_H - PADDING - land.depth * scale}>
          <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Land boundary */}
      <rect
        x={wx(0)} y={wy(land.depth)}
        width={land.width * scale} height={land.depth * scale}
        fill="url(#grid)"
        stroke="#3a9a54"
        strokeWidth="1.5"
        rx="2"
      />

      {/* Zones */}
      {zones.map(z => (
        <rect key={z.id}
          x={wx(z.x)} y={wy(z.y + z.depth)}
          width={z.width * scale} height={z.depth * scale}
          fill="rgba(99,190,123,0.06)"
          stroke="rgba(99,190,123,0.2)"
          strokeWidth="0.8"
          strokeDasharray="4 3"
          rx="2"
        />
      ))}

      {/* House */}
      <rect
        x={wx(house.x)} y={wy(house.y + house.depth)}
        width={house.width * scale} height={house.depth * scale}
        fill="#1e293b"
        stroke="#94a3b8"
        strokeWidth="1.5"
        rx="2"
      />
      <text
        x={wx(house.x + house.width / 2)}
        y={wy(house.y + house.depth / 2) + 4}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={11}
        fontWeight="600"
        fontFamily="Inter, sans-serif"
      >
        HOUSE
      </text>

      {/* Objects */}
      {objects.map(obj => {
        const color = OBJECT_COLORS[obj.type] || '#888';
        const x = wx(obj.x);
        const y = wy(obj.y + obj.depth);
        const w = obj.width * scale;
        const h = obj.depth * scale;
        return (
          <g key={obj.id}>
            <rect x={x} y={y} width={w} height={h}
              fill={`${color}55`}
              stroke={color}
              strokeWidth="1"
              rx="2"
            >
              <title>{obj.type} ({obj.variant})</title>
            </rect>
            {w > 18 && h > 10 && (
              <text
                x={x + w / 2} y={y + h / 2 + LABEL_FONT / 3}
                textAnchor="middle"
                fill={color}
                fontSize={LABEL_FONT}
                fontFamily="Inter, sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {obj.type.split('_')[0]}
              </text>
            )}
          </g>
        );
      })}


      {/* Compass */}
      <g transform={`translate(${SVG_W - PADDING - 14}, ${PADDING + 14})`}>
        <circle r="14" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        <text textAnchor="middle" y="-4" fill="white" fontSize="8" fontWeight="700" fontFamily="Inter">N</text>
        <line x1="0" y1="-2" x2="0" y2="-9" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="2" x2="0" y2="9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Scale bar */}
      <g transform={`translate(${PADDING}, ${SVG_H - PADDING + 14})`}>
        <line x1="0" y1="0" x2={5 * scale} y2="0" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="#4b5563" strokeWidth="1.5" />
        <line x1={5 * scale} y1="-3" x2={5 * scale} y2="3" stroke="#4b5563" strokeWidth="1.5" />
        <text x={5 * scale / 2} y={12} textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="Inter">
          5{land.unit}
        </text>
      </g>
    </svg>
  );
}
