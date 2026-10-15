const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { DEPARTMENTS, TEACHERS } = require('./academicData');

const prisma = new PrismaClient();

const DUMMY_PASSWORD = 'Password123!';

async function main() {
  const roles = ['ADMIN', 'TEACHER', 'STUDENT'];

  const roleRecords = {};
  for (const name of roles) {
    roleRecords[name] = await prisma.role.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
  }
  console.log('Seeded roles: ADMIN, TEACHER, STUDENT');

  const hashedPassword = await bcrypt.hash(DUMMY_PASSWORD, 10);

  const users = [
    { name: 'Admin User',   email: 'admin@example.com',   role: 'ADMIN' },
    { name: 'Teacher User', email: 'teacher@example.com', role: 'TEACHER' },
    { name: 'Student User', email: 'student@example.com', role: 'STUDENT' },
  ];

  for (const { name, email, role } of users) {
    await prisma.user.upsert({
      where:  { email },
      update: {},
      create: { name, email, password: hashedPassword, roleId: roleRecords[role].id },
    });
  }
  console.log(`Seeded dummy users (password for all: "${DUMMY_PASSWORD}"):`);
  users.forEach(({ email, role }) => console.log(`  ${role}: ${email}`));

  const departmentsByCode = {};

  for (const dept of DEPARTMENTS) {
    const department = await prisma.department.upsert({
      where:  { code: dept.code },
      update: {}, 
      create: {
        name:          dept.name,
        code:          dept.code,
        color:         dept.color,
        bg:            dept.bg,
        description:   dept.description,
        head:          dept.head,
        studentsCount: dept.studentsCount,
      },
    });
    departmentsByCode[dept.code] = department;

    for (const course of dept.courses) {
      await prisma.course.upsert({
        where:  { code: course.code },
        update: {},
        create: {
          code:         course.code,
          name:         course.name,
          semester:     course.semester,
          creditHours:  course.creditHours,
          departmentId: department.id,
        },
      });
    }
  }
  console.log(`Seeded ${DEPARTMENTS.length} departments with courses.`);

  for (const { departmentCode, ...teacher } of TEACHERS) {
    await prisma.teacher.upsert({
      where:  { email: teacher.email },
      update: {},
      create: { ...teacher, departmentId: departmentsByCode[departmentCode].id },
    });
  }
  console.log(`Seeded ${TEACHERS.length} teachers.`);

  // The demo "teacher@example.com" login otherwise has no Teacher profile,
  // so the teacher portal (My Courses, etc.) would have nothing to show.
  await prisma.teacher.upsert({
    where:  { email: 'teacher@example.com' },
    update: {},
    create: {
      name:            'Teacher User',
      phone:           '0300-0000000',
      email:           'teacher@example.com',
      address:         'University Campus',
      cnic:            '00000-0000000-0',
      qualification:   'PhD',
      departmentId:    departmentsByCode['CS'].id,
      guardianName:    'N/A',
      guardianContact: 'N/A',
      guardianCnic:    '00000-0000001-0',
    },
  });
  console.log('Linked demo teacher login (teacher@example.com) to a Teacher profile.');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
