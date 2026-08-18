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

module.exports = { validateLoginPayload };
