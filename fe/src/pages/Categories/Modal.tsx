import categoryService from "../../services/CategoryService";
import AppModal from "../../components/common/AppModal";
import { Form, Input, Switch } from "antd";
import { useEffect } from "react";

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
      if (categoryId) {
        await categoryService.updateCategory(categoryId, values);
      } else {
        await categoryService.createCategory(values);
      }
      onClose();
      onSuccess();
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (categoryId) {
      categoryService.getCategoryById(categoryId).then((res) => {
        form.setFieldsValue(res);
        console.log("category id", categoryId);
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }
  }, [categoryId, form]);

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
