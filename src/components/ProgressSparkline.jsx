// Lightweight inline SVG line chart — no charting dependency required for a
// simple weight/mood/energy trend line on the trainer's client card.
export default function ProgressSparkline({ values, width = 160, height = 40, color = '#818cf8' }) {
  const points = (values || []).filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (points.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-slate-600">
        Not enough data yet
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}
