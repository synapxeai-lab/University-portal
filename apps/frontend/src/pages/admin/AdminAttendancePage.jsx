import AdminCoursePicker from '../../components/AdminCoursePicker.jsx';

export default function AdminAttendancePage() {
  return (
    <AdminCoursePicker
      pageTitle="Attendance"
      subtitle="Pick a course, then a section, to view or edit attendance across any department."
      basePath="/admin/attendance"
    />
  );
}
