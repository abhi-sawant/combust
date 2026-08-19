/** Builds a smoothed (cubic-bezier) SVG path through evenly-spaced values within a given box. */
function buildSmoothPath(
  values: number[],
  x0: number,
  x1: number,
  yTop: number,
  yBase: number,
  min: number,
  max: number,
  close: boolean
): { d: string; last: [number, number] } {
  const n = values.length
  const w = x1 - x0
  const h = yBase - yTop
  const range = max - min || 1
  const points: [number, number][] = values.map((v, i) => [
    x0 + (w * i) / (n - 1),
    yBase - ((v - min) / range) * h,
  ])

  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1]
    const [cx, cy] = points[i]
    const mx = (px + cx) / 2
    d += ` C${mx.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${cy.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`
  }
  if (close) d += ` L${x1} ${yBase} L${x0} ${yBase} Z`

  return { d, last: points[points.length - 1] }
}

/** Small trend line for the Overview screen's hero mileage figure — no chart library needed for this one. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null

  const width = 350
  const height = 72
  const min = Math.min(...values)
  const max = Math.max(...values)

  const { d: line, last } = buildSmoothPath(values, 2, width - 2, 8, height - 8, min, max, false)
  const { d: area } = buildSmoothPath(values, 2, width - 2, 8, height - 8, min, max, true)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-4 block w-full overflow-visible"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <path d={area} fill="var(--grad-primary-soft)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3.6} fill="var(--primary)" stroke="var(--background)" strokeWidth={2} />
    </svg>
  )
}
