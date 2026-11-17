import { Field } from "./Feedback";

export function CourseForm({ course = {}, onSubmit, busy = false }) {
  return <form onSubmit={onSubmit}>
    <fieldset disabled={busy}>
      <Field label="Título del curso" name="titulo" defaultValue={course.titulo || ""} required maxLength={150} />
      <div className="row">
        <div className="col-sm-7"><Field label="Categoría" name="categoria" defaultValue={course.categoria || ""} required maxLength={80} list="category-options" />
          <datalist id="category-options"><option>Programación</option><option>Diseño</option><option>Idiomas</option></datalist></div>
        <div className="col-sm-5"><Field label="Nivel" name="nivel">
          <select className="form-select" id="nivel" name="nivel" defaultValue={course.nivel || "basico"}>
            <option value="basico">Básico</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option>
          </select>
        </Field></div>
      </div>
      <Field label="Descripción" name="descripcion">
        <textarea className="form-control" id="descripcion" name="descripcion" rows={5} defaultValue={course.descripcion || ""} required maxLength={10000} />
      </Field>
      <button type="submit" className="btn btn-primary">{busy ? "Guardando…" : course.id ? "Guardar datos" : "Crear borrador"}</button>
    </fieldset>
  </form>;
}
