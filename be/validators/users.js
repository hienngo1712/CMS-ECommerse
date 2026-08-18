const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const USER_ROLES = ["admin", "staff"];

const MIN_PASSWORD_LENGTH = 8;

// Đủ để chặn nhầm lẫn khi gõ, không cố bắt mọi địa chỉ sai. Regex email "đúng
// chuẩn" dài vài trăm ký tự và vẫn loại nhầm địa chỉ hợp lệ.
const looksLikeEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// requirePassword: true khi tạo mới, false khi sửa (để trống là giữ nguyên).
const validateUserPayload = (payload, { requirePassword }) => {
  const errors = [];
  const { username, email, password, role, isActive } = payload || {};

  if (!isNonEmptyString(username)) {
    errors.push("username là bắt buộc");
  } else if (username.trim().length > 50) {
    errors.push("username tối đa 50 ký tự");
  }

  if (!looksLikeEmail(email)) {
    errors.push("email không hợp lệ");
  }

  const coPassword = isNonEmptyString(password);
  if (requirePassword && !coPassword) {
    errors.push("password là bắt buộc");
  } else if (coPassword && password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password phải từ ${MIN_PASSWORD_LENGTH} ký tự trở lên`);
  }

  if (role !== undefined && !USER_ROLES.includes(role)) {
    errors.push(`role phải là một trong: ${USER_ROLES.join(", ")}`);
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    errors.push("isActive phải là true hoặc false");
  }

  return errors;
};

module.exports = { validateUserPayload, USER_ROLES, MIN_PASSWORD_LENGTH };
