import GradingCriteriaCourse from '../../components/GradingCriteriaCourse.jsx';

export default function TeacherGradingCoursePage() {
  return <GradingCriteriaCourse apiBase="/teachers/me" backPath="/teacher/grading" />;
}
