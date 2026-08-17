import categoryService from "../../services/CategoryService";
import AppModal from "../../components/common/AppModal";
import { Form, Input, Switch, message } from "antd";
import { useEffect } from "react";
import axios from "axios";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryId?: number;
};

const ModalCategories = ({ open, onClose, onSuccess, categoryId }: Props) => {
  const [form] = Form.useForm();

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
        message.error("Lưu danh mục thất bại");
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
      title={categoryId ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={categoryId ? "Chỉnh sửa" : "Tạo"}
      cancelText={"Hủy"}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Tên danh mục"
          name={"name"}
          rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
        >
          <Input placeholder="Nhập tên danh mục" />
        </Form.Item>

        <Form.Item
          label="Slug"
          name={"slug"}
          rules={[{ required: true, message: "Vui lòng nhập Slug" }]}
        >
          <Input placeholder="Ví dụ: thời trang" />
        </Form.Item>

        <Form.Item
          label="Trạng thái"
          name={"isActive"}
          valuePropName="checked"
          rules={[{ required: true, message: "Vui lòng nhập Slug" }]}
        >
          <Switch />
        </Form.Item>
      </Form>
    </AppModal>
  );
};

export default ModalCategories;
