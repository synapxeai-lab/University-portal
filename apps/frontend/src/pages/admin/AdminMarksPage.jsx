import AdminCoursePicker from '../../components/AdminCoursePicker.jsx';

export default function AdminMarksPage() {
  return (
    <AdminCoursePicker
      pageTitle="Marks"
      subtitle="Pick a course, then a section, to view marks across any department and adjust a student's course percentage."
      basePath="/admin/marks"
    />
  );
}
