import React from 'react';

export default function GaugeChart({ value, max, color, label }) {
  // Clamp value between 0 and max
  const safeValue = typeof value === 'number' && isFinite(value) ? Math.max(0, Math.min(value, max)) : null;
  const percent = safeValue != null ? safeValue / max : 0;
  const angle = percent * 180; // 0 to 180 degrees

  // Arc constants
  const size = 180; // Larger SVG viewport size
  const strokeWidth = 22; // Thicker arc
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Helper to describe arc
  function describeArc(cx, cy, r, startAngle, endAngle) {
    const rad = (deg) => (Math.PI * deg) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      'M', x1, y1,
      'A', r, r, 0, largeArc, 1, x2, y2
    ].join(' ');
  }

  // Arc paths
  const bgArc = describeArc(center, center, radius, 180, 0);
  const fgArc = describeArc(center, center, radius, 180, 180 + angle);

  return (
    <div className="gauge-chart-container" style={{ width: '100%', height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} style={{ display: 'block' }}>
        {/* Background arc */}
        <path d={bgArc} fill="none" stroke="#38404a" strokeWidth={strokeWidth} />
        {/* Foreground arc */}
        {safeValue != null && (
          <path d={fgArc} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
      </svg>
      {/* Centered Value */}
      <div style={{
        position: 'absolute',
        top: '54px',
        left: 0,
        width: '100%',
        textAlign: 'center',
        fontSize: '2.2rem',
        fontWeight: 600,
        color: 'white',
        letterSpacing: '0.02em',
        zIndex: 2,
      }}>
        {safeValue != null ? safeValue.toFixed(2) : 'N/A'}
      </div>
      {/* Label below arc */}
      <div style={{
        marginTop: '18px',
        fontSize: '1.05rem',
        color: '#bdbdbd',
        textAlign: 'center',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>{label}</div>
    </div>
  );
} 