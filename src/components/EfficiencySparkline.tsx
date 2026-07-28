import { useId, useMemo } from 'react';

type SparklinePoint = {
  date: string;
  value: number;
};

type EfficiencySparklineProps = {
  points: SparklinePoint[];
  className?: string;
};

const WIDTH = 520;
const HEIGHT = 92;
const PAD_TOP = 10;
const PAD_BOTTOM = 16;
const PAD_LEFT = 2;
const PAD_RIGHT = 6;

// A small hand-rolled line+area chart for the efficiency trend — deliberately
// not pulling in Recharts here, since that dependency is already lazy-loaded
// only for the Statistics tab; adding it to Entries too would undo that.
export function EfficiencySparkline({ points, className }: EfficiencySparklineProps) {
  const gradientId = `spark-fill-${useId().replace(/[:]/g, '')}`;

  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const values = points.map((p) => p.value);
    const lo0 = Math.min(...values);
    const hi0 = Math.max(...values);
    const span = hi0 - lo0 || 1;
    const lo = lo0 - span * 0.28;
    const hi = hi0 + span * 0.22;

    const x = (i: number) => PAD_LEFT + (i * (WIDTH - PAD_LEFT - PAD_RIGHT)) / (points.length - 1);
    const y = (v: number) => PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * (1 - (v - lo) / (hi - lo));

    const coords = points.map((p, i) => ({ x: x(i), y: y(p.value) }));

    const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${HEIGHT - PAD_BOTTOM} L${coords[0].x.toFixed(1)} ${HEIGHT - PAD_BOTTOM} Z`;

    return { coords, line, area };
  }, [points]);

  if (!geometry) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Not enough fill-ups yet to chart a trend
        </div>
      </div>
    );
  }

  const { coords, line, area } = geometry;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label={`Fuel efficiency trend, ${points.length} fill-ups from ${points[0].date} to ${points[points.length - 1].date}, most recently ${points[points.length - 1].value.toFixed(1)} km/L`}
      >
        {[0.25, 0.5, 0.75].map((f) => {
          const gy = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * f;
          return (
            <line
              key={f}
              x1={PAD_LEFT}
              y1={gy}
              x2={WIDTH - PAD_RIGHT}
              y2={gy}
              className="stroke-muted"
              strokeWidth={1}
            />
          );
        })}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => {
          const isLast = i === coords.length - 1;
          return (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={isLast ? 4 : 2}
              fill={isLast ? 'var(--chart-1)' : 'var(--card)'}
              stroke="var(--chart-1)"
              strokeWidth={isLast ? 2.2 : 1.4}
            />
          );
        })}
      </svg>
      <div className="flex justify-between font-mono text-[10.5px] text-muted-foreground">
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}
