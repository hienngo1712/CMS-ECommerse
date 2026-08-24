const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

// Chỉ kiểm tra có nhập hay không. Ràng buộc độ dài mật khẩu là việc của bước
// tạo tài khoản, đặt ở đây sẽ tiết lộ quy tắc mật khẩu cho người đang dò.
const validateLoginPayload = (payload) => {
  const errors = [];
  const { username, password } = payload || {};

  if (!isNonEmptyString(username)) {
    errors.push("username là bắt buộc");
  }

  if (!isNonEmptyString(password)) {
    errors.push("password là bắt buộc");
  }

  return errors;
};

const MIN_PASSWORD_LENGTH = 8;

const validateChangePasswordPayload = (payload) => {
  const errors = [];
  const { currentPassword, newPassword } = payload || {};

  if (!isNonEmptyString(currentPassword)) {
    errors.push("currentPassword là bắt buộc");
  }

  if (!isNonEmptyString(newPassword)) {
    errors.push("newPassword là bắt buộc");
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.push(`newPassword phải từ ${MIN_PASSWORD_LENGTH} ký tự trở lên`);
  } else if (newPassword === currentPassword) {
    errors.push("newPassword phải khác mật khẩu hiện tại");
  }

  return errors;
};

module.exports = {
  validateLoginPayload,
  validateChangePasswordPayload,
  MIN_PASSWORD_LENGTH,
};
