type ForecastPoint = {
  date: string;
  balanceCents: number;
};

type ForecastChartProps = {
  points: ForecastPoint[];
  height?: number;
  color?: string;
};

export function ForecastChart({ points, height = 260, color = "#0f766e" }: ForecastChartProps) {
  const width = 720;
  const padding = { top: 18, right: 18, bottom: 26, left: 18 };
  const values = points.map((point) => point.balanceCents);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);

  const xFor = (index: number) => {
    const usableWidth = width - padding.left - padding.right;
    return padding.left + (usableWidth * index) / Math.max(points.length - 1, 1);
  };

  const yFor = (value: number) => {
    const usableHeight = height - padding.top - padding.bottom;
    return height - padding.bottom - ((value - minValue) / range) * usableHeight;
  };

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.balanceCents)}`)
    .join(" ");

  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${height - padding.bottom} L ${xFor(0)} ${height - padding.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Forecast balance chart">
      <defs>
        <linearGradient id={`forecast-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.04} />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3].map((step) => {
        const y = padding.top + (step * (height - padding.top - padding.bottom)) / 3;
        return <line key={step} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />;
      })}

      <path d={areaPath} fill={`url(#forecast-${color.replace("#", "")})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

      {points.map((point, index) => (
        <g key={point.date}>
          <circle cx={xFor(index)} cy={yFor(point.balanceCents)} r={3.5} fill={color} />
          {index % Math.ceil(points.length / 5) === 0 && (
            <text x={xFor(index)} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="11">
              {point.date}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
