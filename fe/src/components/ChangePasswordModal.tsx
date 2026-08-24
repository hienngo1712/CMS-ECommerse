import { useEffect, useState } from "react";
import { App, Form, Input } from "antd";
import axios from "axios";

import AppModal from "./common/AppModal";
import authService from "../services/AuthService";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const ChangePasswordModal = ({ open, onClose }: Props) => {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  // Không để mật khẩu vừa gõ nằm lại trong form sau khi đóng modal.
  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleOk = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd đã hiển thị lỗi ngay trên form
    }

    try {
      setSubmitting(true);
      await authService.changePassword(values.currentPassword, values.newPassword);
      message.success("Đổi mật khẩu thành công");
      onClose();
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const serverError = axios.isAxiosError(error)
        ? error.response?.data?.error
        : undefined;

      if (status && status >= 400 && status < 500 && serverError) {
        message.error(String(serverError));
      } else {
        console.error(error);
        message.error("Đổi mật khẩu thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      title="Đổi mật khẩu"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Đổi mật khẩu"
      cancelText="Hủy"
      confirmLoading={submitting}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Mật khẩu hiện tại"
          name="currentPassword"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
        >
          <Input.Password placeholder="Mật khẩu đang dùng" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới" },
            { min: 8, message: "Mật khẩu phải từ 8 ký tự trở lên" },
          ]}
        >
          <Input.Password placeholder="Tối thiểu 8 ký tự" />
        </Form.Item>

        <Form.Item
          label="Nhập lại mật khẩu mới"
          name="confirmPassword"
          // dependencies để antd validate lại ô này mỗi khi ô newPassword đổi,
          // nếu không thì sửa mật khẩu mới xong ô xác nhận vẫn báo khớp.
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Vui lòng nhập lại mật khẩu mới" },
            ({ getFieldValue }) => ({
              validator: (_, value: string) =>
                !value || value === getFieldValue("newPassword")
                  ? Promise.resolve()
                  : Promise.reject(new Error("Hai mật khẩu không khớp")),
            }),
          ]}
        >
          <Input.Password placeholder="Nhập lại để xác nhận" />
        </Form.Item>
      </Form>
    </AppModal>
  );
};

export default ChangePasswordModal;
