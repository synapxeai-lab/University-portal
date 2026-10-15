import GradingCriteriaCourse from '../../components/GradingCriteriaCourse.jsx';

export default function AdminGradingCoursePage() {
  return <GradingCriteriaCourse apiBase="/marks" backPath="/admin/grading" showTeacher />;
}
