import GradesCourse from '../../components/GradesCourse.jsx';

export default function AdminGradesCoursePage() {
  return <GradesCourse apiBase="/marks" backPath="/admin/grades" coursesUrl="/courses?status=ACTIVE" />;
}
