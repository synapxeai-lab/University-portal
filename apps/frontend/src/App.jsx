import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import LoginPage       from './pages/LoginPage.jsx';
import AdminDashboard  from './pages/admin/AdminDashboard.jsx';
import UsersPage       from './pages/admin/UsersPage.jsx';
import RegistrationPage from './pages/admin/RegistrationPage.jsx';
import AdminAttendancePage from './pages/admin/AdminAttendancePage.jsx';
import AdminAttendanceCoursePage from './pages/admin/AdminAttendanceCoursePage.jsx';
import AdminAttendanceSectionPage from './pages/admin/AdminAttendanceSectionPage.jsx';
import AdminMarksPage from './pages/admin/AdminMarksPage.jsx';
import AdminMarksCoursePage from './pages/admin/AdminMarksCoursePage.jsx';
import AdminMarksSectionPage from './pages/admin/AdminMarksSectionPage.jsx';
import AdminGradingPage from './pages/admin/AdminGradingPage.jsx';
import AdminGradingCoursePage from './pages/admin/AdminGradingCoursePage.jsx';
import AdminGradesPage from './pages/admin/AdminGradesPage.jsx';
import AdminGradesCoursePage from './pages/admin/AdminGradesCoursePage.jsx';
import TeacherHomePage from './pages/teacher/TeacherHomePage.jsx';
import TeacherCoursesPage from './pages/teacher/TeacherCoursesPage.jsx';
import TeacherCourseDetailPage from './pages/teacher/TeacherCourseDetailPage.jsx';
import TeacherSectionDetailPage from './pages/teacher/TeacherSectionDetailPage.jsx';
import TeacherStudentsPage from './pages/teacher/TeacherStudentsPage.jsx';
import TeacherStudentsCoursePage from './pages/teacher/TeacherStudentsCoursePage.jsx';
import TeacherGradingPage from './pages/teacher/TeacherGradingPage.jsx';
import TeacherGradingCoursePage from './pages/teacher/TeacherGradingCoursePage.jsx';
import TeacherGradesPage from './pages/teacher/TeacherGradesPage.jsx';
import TeacherGradesCoursePage from './pages/teacher/TeacherGradesCoursePage.jsx';
import TeacherAttendancePage from './pages/teacher/TeacherAttendancePage.jsx';
import TeacherAttendanceCoursePage from './pages/teacher/TeacherAttendanceCoursePage.jsx';
import TeacherAttendanceSectionPage from './pages/teacher/TeacherAttendanceSectionPage.jsx';
import TeacherMarksPage from './pages/teacher/TeacherMarksPage.jsx';
import TeacherMarksCoursePage from './pages/teacher/TeacherMarksCoursePage.jsx';
import TeacherMarksSectionPage from './pages/teacher/TeacherMarksSectionPage.jsx';
import TeacherMarksCategoryPage from './pages/teacher/TeacherMarksCategoryPage.jsx';
import TeacherMarksAssessmentPage from './pages/teacher/TeacherMarksAssessmentPage.jsx';
import StudentHomePage from './pages/student/StudentHomePage.jsx';
import StudentCoursesPage from './pages/student/StudentCoursesPage.jsx';
import StudentRegistrationPage from './pages/student/StudentRegistrationPage.jsx';
import StudentAttendancePage from './pages/student/StudentAttendancePage.jsx';
import StudentMarksPage from './pages/student/StudentMarksPage.jsx';
import StudentCourseMarksPage from './pages/student/StudentCourseMarksPage.jsx';
import StudentTranscriptPage from './pages/student/StudentTranscriptPage.jsx';
import DepartmentsPage  from './pages/DepartmentsPage.jsx';
import DepartmentDetailPage from './pages/DepartmentDetailPage.jsx';
import CoursesPage      from './pages/CoursesPage.jsx';
import CourseDetailPage from './pages/CourseDetailPage.jsx';
import TeachersPage     from './pages/TeachersPage.jsx';
import StudentsPage     from './pages/StudentsPage.jsx';
import SectionDetailPage from './pages/SectionDetailPage.jsx';
import OfferCoursesPage from './pages/OfferCoursesPage.jsx';
import OfferCoursesDetailPage from './pages/OfferCoursesDetailPage.jsx';
import FeeChallansPage from './pages/admin/FeeChallansPage.jsx';
import FeeChallansDepartmentPage from './pages/admin/FeeChallansDepartmentPage.jsx';
import FeeChallansSectionPage from './pages/admin/FeeChallansSectionPage.jsx';
import StudentFeeChallanPage from './pages/student/StudentFeeChallanPage.jsx';

const ROLE_HOME = { ADMIN: '/admin/dashboard', TEACHER: '/teacher/home', STUDENT: '/student/home' };

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? (ROLE_HOME[user.role.name] || '/login') : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"      element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard"   element={<ProtectedRoute allowedRole="ADMIN"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users"       element={<ProtectedRoute allowedRole="ADMIN"><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/registration" element={<ProtectedRoute allowedRole="ADMIN"><RegistrationPage /></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute allowedRole="ADMIN"><DepartmentsPage /></ProtectedRoute>} />
      <Route path="/admin/departments/:id" element={<ProtectedRoute allowedRole="ADMIN"><DepartmentDetailPage /></ProtectedRoute>} />
      <Route path="/admin/courses"     element={<ProtectedRoute allowedRole="ADMIN"><CoursesPage /></ProtectedRoute>} />
      <Route path="/admin/courses/:id" element={<ProtectedRoute allowedRole="ADMIN"><CourseDetailPage /></ProtectedRoute>} />
      <Route path="/admin/teachers"    element={<ProtectedRoute allowedRole="ADMIN"><TeachersPage /></ProtectedRoute>} />
      <Route path="/admin/students"    element={<ProtectedRoute allowedRole="ADMIN"><StudentsPage /></ProtectedRoute>} />
      <Route path="/admin/sections/:id" element={<ProtectedRoute allowedRole="ADMIN"><SectionDetailPage /></ProtectedRoute>} />
      <Route path="/admin/offer-courses" element={<ProtectedRoute allowedRole="ADMIN"><OfferCoursesPage /></ProtectedRoute>} />
      <Route path="/admin/offer-courses/:departmentId/:batch" element={<ProtectedRoute allowedRole="ADMIN"><OfferCoursesDetailPage /></ProtectedRoute>} />
      <Route path="/admin/fee-challans" element={<ProtectedRoute allowedRole="ADMIN"><FeeChallansPage /></ProtectedRoute>} />
      <Route path="/admin/fee-challans/:departmentId" element={<ProtectedRoute allowedRole="ADMIN"><FeeChallansDepartmentPage /></ProtectedRoute>} />
      <Route path="/admin/fee-challans/:departmentId/sections/:sectionId" element={<ProtectedRoute allowedRole="ADMIN"><FeeChallansSectionPage /></ProtectedRoute>} />
      <Route path="/admin/attendance"  element={<ProtectedRoute allowedRole="ADMIN"><AdminAttendancePage /></ProtectedRoute>} />
      <Route path="/admin/attendance/courses/:courseId" element={<ProtectedRoute allowedRole="ADMIN"><AdminAttendanceCoursePage /></ProtectedRoute>} />
      <Route path="/admin/attendance/courses/:courseId/sections/:sectionId" element={<ProtectedRoute allowedRole="ADMIN"><AdminAttendanceSectionPage /></ProtectedRoute>} />
      <Route path="/admin/marks" element={<ProtectedRoute allowedRole="ADMIN"><AdminMarksPage /></ProtectedRoute>} />
      <Route path="/admin/marks/courses/:courseId" element={<ProtectedRoute allowedRole="ADMIN"><AdminMarksCoursePage /></ProtectedRoute>} />
      <Route path="/admin/marks/courses/:courseId/sections/:sectionId" element={<ProtectedRoute allowedRole="ADMIN"><AdminMarksSectionPage /></ProtectedRoute>} />
      <Route path="/admin/grading" element={<ProtectedRoute allowedRole="ADMIN"><AdminGradingPage /></ProtectedRoute>} />
      <Route path="/admin/grading/courses/:courseId" element={<ProtectedRoute allowedRole="ADMIN"><AdminGradingCoursePage /></ProtectedRoute>} />
      <Route path="/admin/grades" element={<ProtectedRoute allowedRole="ADMIN"><AdminGradesPage /></ProtectedRoute>} />
      <Route path="/admin/grades/courses/:courseId" element={<ProtectedRoute allowedRole="ADMIN"><AdminGradesCoursePage /></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher/home"        element={<ProtectedRoute allowedRole="TEACHER"><TeacherHomePage /></ProtectedRoute>} />
      <Route path="/teacher/courses"     element={<ProtectedRoute allowedRole="TEACHER"><TeacherCoursesPage /></ProtectedRoute>} />
      <Route path="/teacher/courses/:courseId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherCourseDetailPage /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRole="TEACHER"><TeacherStudentsPage /></ProtectedRoute>} />
      <Route path="/teacher/students/courses/:courseId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherStudentsCoursePage /></ProtectedRoute>} />
      <Route path="/teacher/students/courses/:courseId/sections/:sectionId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherSectionDetailPage /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute allowedRole="TEACHER"><TeacherAttendancePage /></ProtectedRoute>} />
      <Route path="/teacher/attendance/courses/:courseId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherAttendanceCoursePage /></ProtectedRoute>} />
      <Route path="/teacher/attendance/courses/:courseId/sections/:sectionId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherAttendanceSectionPage /></ProtectedRoute>} />
      <Route path="/teacher/grading" element={<ProtectedRoute allowedRole="TEACHER"><TeacherGradingPage /></ProtectedRoute>} />
      <Route path="/teacher/grading/courses/:courseId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherGradingCoursePage /></ProtectedRoute>} />
      <Route path="/teacher/grades" element={<ProtectedRoute allowedRole="TEACHER"><TeacherGradesPage /></ProtectedRoute>} />
      <Route path="/teacher/grades/courses/:courseId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherGradesCoursePage /></ProtectedRoute>} />
      <Route path="/teacher/marks" element={<ProtectedRoute allowedRole="TEACHER"><TeacherMarksPage /></ProtectedRoute>} />
      <Route path="/teacher/marks/courses/:courseId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherMarksCoursePage /></ProtectedRoute>} />
      <Route path="/teacher/marks/courses/:courseId/sections/:sectionId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherMarksSectionPage /></ProtectedRoute>} />
      <Route path="/teacher/marks/courses/:courseId/sections/:sectionId/categories/:categoryId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherMarksCategoryPage /></ProtectedRoute>} />
      <Route path="/teacher/marks/courses/:courseId/sections/:sectionId/assessments/:assessmentId" element={<ProtectedRoute allowedRole="TEACHER"><TeacherMarksAssessmentPage /></ProtectedRoute>} />

      {/* Student routes */}
      <Route path="/student/home"        element={<ProtectedRoute allowedRole="STUDENT"><StudentHomePage /></ProtectedRoute>} />
      <Route path="/student/courses"     element={<ProtectedRoute allowedRole="STUDENT"><StudentCoursesPage /></ProtectedRoute>} />
      <Route path="/student/registration" element={<ProtectedRoute allowedRole="STUDENT"><StudentRegistrationPage /></ProtectedRoute>} />
      <Route path="/student/fee-challan" element={<ProtectedRoute allowedRole="STUDENT"><StudentFeeChallanPage /></ProtectedRoute>} />
      <Route path="/student/attendance"  element={<ProtectedRoute allowedRole="STUDENT"><StudentAttendancePage /></ProtectedRoute>} />
      <Route path="/student/marks"       element={<ProtectedRoute allowedRole="STUDENT"><StudentMarksPage /></ProtectedRoute>} />
      <Route path="/student/marks/:enrollmentId" element={<ProtectedRoute allowedRole="STUDENT"><StudentCourseMarksPage /></ProtectedRoute>} />
      <Route path="/student/transcript" element={<ProtectedRoute allowedRole="STUDENT"><StudentTranscriptPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
