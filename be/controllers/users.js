const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const { validateUserPayload, USER_ROLES } = require("../validators/users");

// Liệt kê tường minh thay vì query hết rồi xoá thuộc tính: quên một chỗ là lộ
// hash mật khẩu ra ngoài — xem QĐ-4.
const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
};

const BCRYPT_COST = 10;

// username và email đều là @unique nên P2002 có thể đến từ một trong hai. Prisma
// nói rõ cột nào ở meta.target, dùng luôn để câu lỗi chỉ đúng chỗ.
const duplicateFieldError = (error) => {
  const target = error?.meta?.target;
  const fields = Array.isArray(target) ? target : [target];
  if (fields.includes("email")) return "Email đã tồn tại";
  if (fields.includes("username")) return "Username đã tồn tại";
  return "Username hoặc email đã tồn tại";
};

const usersControllers = {
  createUser: async (req, res) => {
    try {
      const errors = validateUserPayload(req.body, { requirePassword: true });
      if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], details: errors });
      }

      const { username, email, password, role, isActive } = req.body;

      const user = await prisma.user.create({
        data: {
          username: username.trim(),
          email: email.trim(),
          password: await bcrypt.hash(password, BCRYPT_COST),
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive }),
        },
        select: USER_SELECT,
      });

      res.status(201).json(user);
    } catch (error) {
      if (error.code === "P2002") {
        // Người đã xoá mềm vẫn giữ chỗ username/email — xem QĐ-5.
        return res.status(400).json({ error: duplicateFieldError(error) });
      }
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getUsers: async (req, res) => {
    try {
      let page = parseInt(req.query.page, 10) || 1;
      let limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || "";
      const role = req.query.role;
      const isActive = req.query.isActive;
      if (page < 1) page = 1;
      if (limit < 1) limit = 10;
      if (limit > 100) limit = 100;
      const skip = (page - 1) * limit;

      const where = {
        isDeleted: false,
        ...(search && {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(role && USER_ROLES.includes(role) && { role }),
        ...(isActive !== undefined &&
          isActive !== "" && { isActive: isActive === "true" }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          where,
          select: USER_SELECT,
          orderBy: { id: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        data: users,
        meta: { total, page, limit, pageCount: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getUserById: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      const user = await prisma.user.findFirst({
        where: { id, isDeleted: false },
        select: USER_SELECT,
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateUser: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      const errors = validateUserPayload(req.body, { requirePassword: false });
      if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], details: errors });
      }

      const existing = await prisma.user.findFirst({
        where: { id, isDeleted: false },
      });
      if (!existing) {
        return res.status(404).json({ error: "User not found" });
      }

      const { username, email, password, role, isActive } = req.body;

      // Tự khoá hoặc tự hạ quyền chính mình là mất đường vào CMS — xem QĐ-2.
      if (req.user.id === id) {
        if (isActive === false) {
          return res
            .status(400)
            .json({ error: "Không thể tự khoá tài khoản của chính mình" });
        }
        if (role !== undefined && role !== existing.role) {
          return res
            .status(400)
            .json({ error: "Không thể tự đổi quyền của chính mình" });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          username: username.trim(),
          email: email.trim(),
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive }),
          // Để trống nghĩa là giữ mật khẩu cũ — xem QĐ-3.
          ...(typeof password === "string" &&
            password.trim().length > 0 && {
              password: await bcrypt.hash(password, BCRYPT_COST),
            }),
        },
        select: USER_SELECT,
      });

      res.json(user);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(400).json({ error: duplicateFieldError(error) });
      }
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      if (req.user.id === id) {
        return res
          .status(400)
          .json({ error: "Không thể tự xoá tài khoản của chính mình" });
      }

      const existing = await prisma.user.findFirst({
        where: { id, isDeleted: false },
      });
      if (!existing) {
        return res.status(404).json({ error: "User not found" });
      }

      // Xoá mềm: Order.userId trỏ vào User nên xoá hẳn sẽ làm hỏng đơn cũ.
      await prisma.user.update({ where: { id }, data: { isDeleted: true } });

      res.json({ msg: "User deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = usersControllers;
