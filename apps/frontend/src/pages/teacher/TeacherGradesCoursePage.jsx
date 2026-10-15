import GradesCourse from '../../components/GradesCourse.jsx';

export default function TeacherGradesCoursePage() {
  return <GradesCourse apiBase="/teachers/me" backPath="/teacher/grades" coursesUrl="/teachers/me/courses" allLabel="All my courses" />;
}
