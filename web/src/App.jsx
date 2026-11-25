import { Navigate, Route, Routes, Link } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { CourseEditorPage, NewCoursePage } from "./pages/CourseEditorPage";
import { MyCoursesPage } from "./pages/MyCoursesPage";
import { LearningPage } from "./pages/LearningPage";
import { QuizEditorPage } from "./pages/QuizEditorPage";

export default function App() {
  return <Routes><Route element={<Layout />}>
    <Route index element={<Navigate to="/cursos" replace />} />
    <Route path="/login" element={<AuthPage key="login" />} />
    <Route path="/registro" element={<AuthPage key="register" register />} />
    <Route path="/cursos" element={<CatalogPage key="public" />} />
    <Route path="/cursos/:id" element={<CourseDetailPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/perfil" element={<ProfilePage />} />
    </Route>
    <Route element={<ProtectedRoute role="instructor" />}>
      <Route path="/instructor/cursos" element={<CatalogPage key="instructor" instructor />} />
      <Route path="/instructor/cursos/nuevo" element={<NewCoursePage />} />
      <Route path="/instructor/cursos/:id/editar" element={<CourseEditorPage />} />
      <Route path="/instructor/lecciones/:id/preguntas" element={<QuizEditorPage />} />
    </Route>
    <Route element={<ProtectedRoute role="estudiante" />}>
      <Route path="/mis-cursos" element={<MyCoursesPage />} />
      <Route path="/aprender/:id" element={<LearningPage />} />
      <Route path="/aprender/:id/lecciones/:lessonId" element={<LearningPage />} />
    </Route>
    <Route path="*" element={<div className="empty-state"><h1>Página no encontrada</h1><Link to="/cursos">Volver al catálogo</Link></div>} />
  </Route></Routes>;
}
