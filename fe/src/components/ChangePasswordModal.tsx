import { useEffect, useState } from "react";
import { App, Form, Input } from "antd";
import axios from "axios";

import AppModal from "./common/AppModal";
import authService from "../services/AuthService";
import { useT } from "../i18n";

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
  const { t } = useT();
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
      message.success(t("changePasswordSuccess"));
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
        message.error(t("changePasswordFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      title={t("changePassword")}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={t("changePassword")}
      cancelText={t("cancel")}
      confirmLoading={submitting}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label={t("currentPassword")}
          name="currentPassword"
          rules={[
            { required: true, message: t("required", { name: t("currentPassword") }) },
          ]}
        >
          <Input.Password placeholder={t("currentPasswordPlaceholder")} />
        </Form.Item>

        <Form.Item
          label={t("newPassword")}
          name="newPassword"
          rules={[
            { required: true, message: t("required", { name: t("newPassword") }) },
            { min: 8, message: t("passwordMin") },
          ]}
        >
          <Input.Password placeholder={t("passwordMinPlaceholder")} />
        </Form.Item>

        <Form.Item
          label={t("confirmPassword")}
          name="confirmPassword"
          // dependencies để antd validate lại ô này mỗi khi ô newPassword đổi,
          // nếu không thì sửa mật khẩu mới xong ô xác nhận vẫn báo khớp.
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: t("required", { name: t("confirmPassword") }) },
            ({ getFieldValue }) => ({
              validator: (_, value: string) =>
                !value || value === getFieldValue("newPassword")
                  ? Promise.resolve()
                  : Promise.reject(new Error(t("passwordMismatch"))),
            }),
          ]}
        >
          <Input.Password placeholder={t("confirmPasswordPlaceholder")} />
        </Form.Item>
      </Form>
    </AppModal>
  );
};

export default ChangePasswordModal;
