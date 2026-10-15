import TeacherCoursePicker from '../../components/TeacherCoursePicker.jsx';

export default function TeacherAttendancePage() {
  return (
    <TeacherCoursePicker
      pageTitle="Attendance"
      subtitle="Pick a course, then a section, to mark or edit attendance."
      basePath="/teacher/attendance"
    />
  );
}
