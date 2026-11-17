export function Loading() {
  return <div className="loading-state" role="status">
    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Cargando…
  </div>;
}
export function ErrorAlert({ message, retry }) {
  if (!message) return null;
  return <div className="alert alert-danger" role="alert">
    {message}{retry && <button className="btn btn-sm btn-outline-danger ms-3" onClick={retry}>Reintentar</button>}
  </div>;
}
export function EmptyState({ title, children }) {
  return <div className="empty-state"><span className="empty-mark" aria-hidden="true">↗</span>
    <h2 className="h5">{title}</h2><div className="text-secondary">{children}</div>
  </div>;
}
export function Field({ label, name, type = "text", children, ...props }) {
  const id = props.id || name;
  return <div className="mb-3">
    <label className="form-label" htmlFor={id}>{label}</label>
    {children || <input className="form-control" id={id} name={name} type={type} {...props} />}
  </div>;
}
