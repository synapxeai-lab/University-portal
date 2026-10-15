import TeacherCoursePicker from '../../components/TeacherCoursePicker.jsx';

export default function TeacherMarksPage() {
  return (
    <TeacherCoursePicker
      pageTitle="Marks"
      subtitle="Pick a course, then a section, to manage quizzes, assignments, exams and student marks."
      basePath="/teacher/marks"
    />
  );
}
