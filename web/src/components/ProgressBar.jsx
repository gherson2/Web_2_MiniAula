export function ProgressBar({ value, label = "Progreso del curso" }) {
  return <div className="progress" role="progressbar" aria-label={label}
    aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className="progress-bar bg-success" style={{ width: `${value}%` }} />
  </div>;
}
