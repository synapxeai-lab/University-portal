const bcrypt = require('bcryptjs');
const { z }  = require('zod');
const prisma = require('../db/prismaClient');

const safeUser = ({ password, ...rest }) => rest;

/* ── Validation schemas ─────────────────────────────────────────────────── */
const createUserSchema = z.object({
  name:            z.string().min(2,  'Name must be at least 2 characters'),
  email:           z.string().email('Invalid email address'),
  password:        z.string().min(6,  'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1,  'Please confirm the password'),
  roleName:        z.enum(['ADMIN', 'TEACHER', 'STUDENT'], { errorMap: () => ({ message: 'Role must be ADMIN, TEACHER, or STUDENT' }) }),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

const updateUserSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').optional(),
  email:    z.string().email('Invalid email address').optional(),
  roleName: z.enum(['ADMIN', 'TEACHER', 'STUDENT'], { errorMap: () => ({ message: 'Role must be ADMIN, TEACHER, or STUDENT' }) }).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

/* ── GET /api/users ─────────────────────────────────────────────────────── */
const getAllUsers = async (req, res, next) => {
  try {
    const { search = '', role = '' } = req.query;

    const users = await prisma.user.findMany({
      where: {
        ...(search ? {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(role ? { role: { name: role } } : {}),
      },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, users: users.map(safeUser) });
  } catch (err) { next(err); }
};

/* ── POST /api/users ─────────────────────────────────────────────────────── */
const createUser = async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { name, email, password, roleName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(404).json({ success: false, message: `Role "${roleName}" not found. Run db:seed first.` });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user   = await prisma.user.create({
      data:    { name, email, password: hashed, roleId: role.id },
      include: { role: true },
    });

    return res.status(201).json({ success: true, message: 'User created successfully.', user: safeUser(user) });
  } catch (err) { next(err); }
};

/* ── PUT /api/users/:id ──────────────────────────────────────────────────── */
const updateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, roleName, password } = parsed.data;

    // Ensure the target user exists
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    // Check email uniqueness if changed
    if (email && email !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email } });
      if (clash) return res.status(409).json({ success: false, message: 'Email is already in use by another user.' });
    }

    const updateData = {};
    if (name)     updateData.name  = name;
    if (email)    updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    if (roleName) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) return res.status(404).json({ success: false, message: `Role "${roleName}" not found.` });
      updateData.roleId = role.id;
    }

    const updated = await prisma.user.update({
      where:   { id },
      data:    updateData,
      include: { role: true },
    });

    return res.status(200).json({ success: true, message: 'User updated successfully.', user: safeUser(updated) });
  } catch (err) { next(err); }
};

/* ── DELETE /api/users/:id ───────────────────────────────────────────────── */
const deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(403).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (err) { next(err); }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };
