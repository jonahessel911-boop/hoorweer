interface FunnelChartProps {
  steps: { label: string; count: number; pct: number }[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  const max = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="chart-card card">
      <h3 className="chart-title">Conversiefunnel</h3>
      <div className="funnel-viz">
        {steps.map((step, i) => (
          <div key={step.label} className="funnel-viz-row">
            <div className="funnel-viz-label">
              <span>{step.label}</span>
              <span className="funnel-viz-meta">
                {step.count} ({step.pct}%)
              </span>
            </div>
            <div className="funnel-viz-track">
              <div
                className="funnel-viz-fill"
                style={{
                  width: `${(step.count / max) * 100}%`,
                  opacity: 1 - i * 0.12,
                }}
              />
            </div>
            {i < steps.length - 1 && step.count > 0 && steps[i + 1].count > 0 && (
              <div className="funnel-drop">
                ↓ {Math.round((steps[i + 1].count / step.count) * 100)}% doorstroom
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
