import React from "react";
import categoryService from "../../services/CategoryService";
import AppModal from "../../components/common/AppModal";
import { Form, Input, Switch } from "antd";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryId?: number;
};

const ModalCategories = ({ open, onClose, onSuccess, categoryId }: Props) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      console.log(values);
      await categoryService.createCategory(values);
      form.resetFields();
      onClose();
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <AppModal
      title={categoryId ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={"Tạo"}
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
          rules={[{ required: true, message: "Vui lòng nhập Slug" }]}
        >
          <Switch />
        </Form.Item>
      </Form>
    </AppModal>
  );
};

export default ModalCategories;
