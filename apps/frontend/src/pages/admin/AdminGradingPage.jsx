import AdminCoursePicker from '../../components/AdminCoursePicker.jsx';

export default function AdminGradingPage() {
  return (
    <AdminCoursePicker
      pageTitle="Grade Criteria"
      subtitle="Pick a course to view or change the grading criteria for each section it's offered to."
      basePath="/admin/grading"
    />
  );
}
