import TeacherCoursePicker from '../../components/TeacherCoursePicker.jsx';

export default function TeacherGradingPage() {
  return (
    <TeacherCoursePicker
      pageTitle="Grading Criteria"
      subtitle="Pick a course to view or change the percentage range for each grade."
      basePath="/teacher/grading"
    />
  );
}
