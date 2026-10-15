const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { z }  = require('zod');
const prisma = require('../db/prismaClient');

const loginSchema = z.object({
  email:    z.string().trim().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const safeUser = ({ password, ...rest }) => rest;

const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false, message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { email, password } = parsed.data;

    // Emails are matched case-insensitively so "Ammar@Gmail.com" logs in the same account as "ammar@gmail.com".
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, include: { role: true } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: user.id, role: user.role.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({ success: true, message: 'Login successful.', token, user: safeUser(user) });
  } catch (err) { next(err); }
};

const logout = (_req, res) =>
  res.status(200).json({ success: true, message: 'Logged out successfully.' });

const me = (req, res) => {
  const { password, ...user } = req.user;
  return res.status(200).json({ success: true, user });
};

module.exports = { login, logout, me };
