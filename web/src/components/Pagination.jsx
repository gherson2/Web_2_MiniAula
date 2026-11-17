export function Pagination({ pagination, onChange }) {
  if (pagination.pages < 2) return null;
  return <nav className="pagination-bar" aria-label="Paginación de cursos">
    <button className="btn btn-outline-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>← Anterior</button>
    <span aria-live="polite">Página {pagination.page} de {pagination.pages}</span>
    <button className="btn btn-outline-secondary btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => onChange(pagination.page + 1)}>Siguiente →</button>
  </nav>;
}
