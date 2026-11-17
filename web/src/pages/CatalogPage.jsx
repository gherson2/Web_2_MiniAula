import { useCallback, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CourseService } from "../services/CourseService";
import { useResource } from "../hooks/useResource";
import { CourseCard } from "../components/CourseCard";
import { Pagination } from "../components/Pagination";
import { Loading, ErrorAlert, EmptyState } from "../components/Feedback";

export function CatalogPage({ instructor = false }) {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const categoria = params.get("categoria") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const resource = useResource(useCallback((signal) =>
    CourseService[instructor ? "mine" : "catalog"]({ q, categoria, page, limit: 6 }, signal),
  [instructor, q, categoria, page]));
  const categories = useResource(useCallback((signal) => CourseService.categories(signal), []));

  function change(values) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
    setParams(next);
  }

  return <>
    <section className={`catalog-hero ${instructor ? "instructor-hero" : ""}`}>
      <div><span className="eyebrow">{instructor ? "TU ESPACIO PARA ENSEÑAR" : "APRENDE ALGO NUEVO, A TU RITMO"}</span>
        <h1>{instructor ? "Comparte lo que sabes." : <>Pequeños cursos.<br />Grandes posibilidades<span>.</span></>}</h1>
        <p>{instructor ? "Crea, organiza y publica experiencias de aprendizaje." : "Descubre tu próximo tema favorito. El primer paso es elegir por dónde empezar."}</p>
        {instructor && <Link className="btn btn-primary" to="/instructor/cursos/nuevo">+ Crear un curso</Link>}
      </div>
      <div className="hero-note" aria-hidden="true"><span>UNA IDEA A LA VEZ</span><strong>{instructor ? "Enseña" : "Explora"}<span>↗</span></strong><div className="note-lines"><i /><i /><i /></div></div>
    </section>
    <section className="catalog-content" aria-labelledby="catalog-title">
      <div className="section-heading"><div><span className="eyebrow">{instructor ? "GESTIÓN DE CONTENIDO" : "ENCUENTRA TU INSPIRACIÓN"}</span>
        <h2 id="catalog-title">{instructor ? "Mis cursos" : "Explora el catálogo"}</h2></div>
        <span className="text-secondary small">{resource.data ? `${resource.data.pagination.total} cursos` : ""}</span>
      </div>
      <form className="catalog-search" onSubmit={(event) => { event.preventDefault(); change({ q: search.trim(), page: 1 }); }}>
        <label className="visually-hidden" htmlFor="search">Buscar cursos por título</label>
        <input id="search" className="form-control" placeholder="¿Qué te gustaría aprender?" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} />
        <label className="visually-hidden" htmlFor="category">Categoría</label>
        <select className="form-select" id="category" value={categoria} onChange={(event) => change({ categoria: event.target.value, page: 1 })}>
          <option value="">Todas las categorías</option>
          {categoria && !categories.data?.includes(categoria) && <option value={categoria}>{categoria}</option>}
          {categories.data?.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button className="btn btn-primary">Buscar <span aria-hidden="true">↗</span></button>
      </form>
      {categories.loading && <p className="small text-secondary" role="status">Cargando categorías…</p>}
      <ErrorAlert message={categories.error} retry={categories.reload} />
      {(q || categoria) && <div className="active-filter"><span>Resultados {q && <>para “{q}”</>} {categoria && <>en {categoria}</>}</span>
        <button className="btn btn-link btn-sm" onClick={() => { setSearch(""); setParams({}); }}>Limpiar filtros</button></div>}
      {resource.loading ? <Loading /> : resource.error ? <ErrorAlert message={resource.error} retry={resource.reload} /> :
        resource.data.data.length === 0 ? <EmptyState title={instructor ? "Tu próxima idea puede ser un curso" : "No encontramos cursos"}>
          {instructor ? <Link to="/instructor/cursos/nuevo">Crea tu primer curso</Link> : "Prueba con otro título o categoría."}
        </EmptyState> : <>
          <div className="row g-4">{resource.data.data.map((course) => <div className="col-12 col-md-6 col-lg-4" key={course.id}><CourseCard course={course} editable={instructor} /></div>)}</div>
          <Pagination pagination={resource.data.pagination} onChange={(nextPage) => change({ page: nextPage })} />
        </>}
    </section>
  </>;
}
