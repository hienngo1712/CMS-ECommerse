import { useEffect, useState } from "react";
import { App, Form, Input, Select, Switch } from "antd";
import axios from "axios";

import AppModal from "../../components/common/AppModal";
import userService from "../../services/UserService";
import type { UserPayload } from "./Types";
import { ROLE_KEY, USER_ROLES } from "./Types";
import { useT } from "../../i18n";

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
  const { t } = useT();
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
          message.error(t("loadFailed"));
        });
    } else {
      form.resetFields();
      form.setFieldsValue({ role: "staff", isActive: true });
    }

    return () => {
      ignore = true;
    };
  }, [open, userId, form, message, t]);

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
        message.success(t("updateSuccess"));
      } else {
        await userService.createUser(values);
        message.success(t("createSuccess"));
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
        message.error(t("saveFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      title={isEdit ? t("editUser") : t("createUser")}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? t("save") : t("create")}
      cancelText={t("cancel")}
      confirmLoading={submitting}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label={t("username")}
          name="username"
          rules={[{ required: true, message: t("required", { name: t("username") }) }]}
        >
          <Input placeholder={t("enterUsername")} />
        </Form.Item>

        <Form.Item
          label={t("email")}
          name="email"
          rules={[
            { required: true, message: t("required", { name: t("email") }) },
            { type: "email", message: t("emailInvalid") },
          ]}
        >
          <Input placeholder={t("exampleEmail")} />
        </Form.Item>

        <Form.Item
          label={isEdit ? t("newPasswordOptional") : t("password")}
          name="password"
          rules={[
            { required: !isEdit, message: t("required", { name: t("password") }) },
            // Không dùng rule `min` sẵn có: nó coi chuỗi rỗng là độ dài 0 và
            // báo lỗi ngay cả khi đang sửa và cố ý để trống.
            {
              validator: (_, value: string) =>
                !value || value.length >= 8
                  ? Promise.resolve()
                  : Promise.reject(new Error(t("passwordMin"))),
            },
          ]}
        >
          <Input.Password
            placeholder={isEdit ? t("keepPasswordPlaceholder") : t("passwordMinPlaceholder")}
          />
        </Form.Item>

        <Form.Item label={t("role")} name="role">
          {/* Server chặn tự đổi quyền của chính mình bằng 400, khoá luôn ở đây
              để không mời người dùng làm việc chắc chắn thất bại. */}
          <Select
            disabled={isSelf}
            options={USER_ROLES.map((role) => ({
              label: t(ROLE_KEY[role]),
              value: role,
            }))}
          />
        </Form.Item>

        <Form.Item label={t("status")} name="isActive" valuePropName="checked">
          <Switch disabled={isSelf} />
        </Form.Item>
      </Form>
    </AppModal>
  );
};

export default ModalUsers;
