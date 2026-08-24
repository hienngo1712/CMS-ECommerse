import categoryService from "../../services/CategoryService";
import AppModal from "../../components/common/AppModal";
import { App, Form, Input, Switch } from "antd";
import { useEffect } from "react";
import axios from "axios";

import { useT } from "../../i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryId?: number;
};

const ModalCategories = ({ open, onClose, onSuccess, categoryId }: Props) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { t } = useT();

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd đã hiển thị lỗi ngay trên form
    }

    try {
      if (categoryId) {
        await categoryService.updateCategory(categoryId, values);
      } else {
        await categoryService.createCategory(values);
      }
      onClose();
      onSuccess();
    } catch (error) {
      // Chỉ hiện nguyên văn thông báo của server khi đó là lỗi client (4xx).
      // 5xx trả chuỗi tiếng Anh nội bộ, không nên đưa cho người dùng đọc.
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
    }
  };
  // Phụ thuộc `open`: tạo xong rồi mở lại vẫn là categoryId = 0, nếu chỉ
  // nghe categoryId thì effect không chạy lại và form còn dữ liệu lần trước
  useEffect(() => {
    if (!open) return;

    if (categoryId) {
      categoryService.getCategoryById(categoryId).then((res) => {
        form.setFieldsValue(res);
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }
  }, [open, categoryId, form]);

  return (
    <AppModal
      title={categoryId ? t("editCategory") : t("createCategory")}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={categoryId ? t("edit") : t("create")}
      cancelText={t("cancel")}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label={t("categoryName")}
          name={"name"}
          rules={[{ required: true, message: t("required", { name: t("categoryName") }) }]}
        >
          <Input placeholder={t("enterName")} />
        </Form.Item>

        <Form.Item
          label={t("slug")}
          name={"slug"}
          rules={[{ required: true, message: t("required", { name: t("slug") }) }]}
        >
          <Input placeholder={t("exampleSlug")} />
        </Form.Item>

        <Form.Item
          label={t("status")}
          name={"isActive"}
          valuePropName="checked"
          rules={[{ required: true, message: t("required", { name: t("status") }) }]}
        >
          <Switch />
        </Form.Item>
      </Form>
    </AppModal>
  );
};

export default ModalCategories;
