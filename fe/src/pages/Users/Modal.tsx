import { useEffect, useState } from "react";
import { App, Form, Input, Select, Switch } from "antd";
import axios from "axios";

import AppModal from "../../components/common/AppModal";
import userService from "../../services/UserService";
import type { UserPayload } from "./Types";
import { ROLE_LABEL, USER_ROLES } from "./Types";

type Props = {
  open: boolean;
  userId?: number;
  currentUserId?: number;
  onClose: () => void;
  onSuccess: () => void;
};

const ModalUsers = ({ open, userId, currentUserId, onClose, onSuccess }: Props) => {
  const [form] = Form.useForm<UserPayload>();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(userId);
  const isSelf = Boolean(userId && userId === currentUserId);

  // Phụ thuộc `open`: tạo xong rồi mở lại vẫn là userId = undefined, nếu chỉ
  // nghe userId thì effect không chạy lại và form còn dữ liệu lần trước.
  useEffect(() => {
    if (!open) return;

    let ignore = false;

    if (userId) {
      form.resetFields();
      userService
        .getUserById(userId)
        .then((user) => {
          if (ignore) return;
          form.setFieldsValue({ ...user, password: "" });
        })
        .catch((error) => {
          if (ignore) return;
          console.error(error);
          message.error("Không tải được thông tin người dùng");
        });
    } else {
      form.resetFields();
      form.setFieldsValue({ role: "staff", isActive: true });
    }

    return () => {
      ignore = true;
    };
  }, [open, userId, form, message]);

  const handleOk = async () => {
    let values: UserPayload;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd đã hiển thị lỗi ngay trên form
    }

    try {
      setSubmitting(true);
      if (userId) {
        await userService.updateUser(userId, values);
        message.success("Cập nhật người dùng thành công");
      } else {
        await userService.createUser(values);
        message.success("Tạo người dùng thành công");
      }
      onClose();
      onSuccess();
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const serverError = axios.isAxiosError(error)
        ? error.response?.data?.error
        : undefined;

      if (status && status >= 400 && status < 500 && serverError) {
        message.error(String(serverError));
      } else {
        console.error(error);
        message.error("Lưu người dùng thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      title={isEdit ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? "Lưu" : "Tạo"}
      cancelText="Hủy"
      confirmLoading={submitting}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "Vui lòng nhập username" }]}
        >
          <Input placeholder="Nhập username" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Vui lòng nhập email" },
            { type: "email", message: "Email không hợp lệ" },
          ]}
        >
          <Input placeholder="ten@example.com" />
        </Form.Item>

        <Form.Item
          label={isEdit ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
          name="password"
          rules={[
            { required: !isEdit, message: "Vui lòng nhập mật khẩu" },
            // Không dùng rule `min` sẵn có: nó coi chuỗi rỗng là độ dài 0 và
            // báo lỗi ngay cả khi đang sửa và cố ý để trống.
            {
              validator: (_, value: string) =>
                !value || value.length >= 8
                  ? Promise.resolve()
                  : Promise.reject(new Error("Mật khẩu phải từ 8 ký tự trở lên")),
            },
          ]}
        >
          <Input.Password placeholder={isEdit ? "Để trống là giữ nguyên" : "Tối thiểu 8 ký tự"} />
        </Form.Item>

        <Form.Item label="Quyền" name="role">
          {/* Server chặn tự đổi quyền của chính mình bằng 400, khoá luôn ở đây
              để không mời người dùng làm việc chắc chắn thất bại. */}
          <Select
            disabled={isSelf}
            options={USER_ROLES.map((role) => ({
              label: ROLE_LABEL[role],
              value: role,
            }))}
          />
        </Form.Item>

        <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
          <Switch disabled={isSelf} />
        </Form.Item>
      </Form>
    </AppModal>
  );
};

export default ModalUsers;
