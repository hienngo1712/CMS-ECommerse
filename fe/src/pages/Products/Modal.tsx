import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";

import AppModal from "../../components/common/AppModal";
import productService from "../../services/ProductService";
import type { CategoriesResponse } from "../Categories/Types";
import type { ProductPayload } from "./Type";

type Props = {
  open: boolean;
  productId?: number;
  categories: CategoriesResponse[];
  onClose: () => void;
  onSuccess: () => void;
};

const emptyColor = { color: "", colorCode: "#000000", images: [], variants: [] };

const ModalProducts = ({ open, productId, categories, onClose, onSuccess }: Props) => {
  const [form] = Form.useForm<ProductPayload>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (productId) {
      productService.getProductById(productId).then((product) => {
        form.setFieldsValue({
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          isActive: product.isActive,
          colors: product.colors.map((color) => ({
            color: color.color,
            colorCode: color.colorCode,
            images: color.images.map((image) => ({ imageUrl: image.imageUrl })),
            variants: color.variants.map((variant) => ({
              size: variant.size,
              price: variant.price,
              stock: variant.stock,
            })),
          })),
        });
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, colors: [] });
    }
  }, [open, productId, form]);

  const handleOk = async () => {
    let values: ProductPayload;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd đã hiển thị lỗi ngay trên form
    }

    try {
      setSubmitting(true);
      if (productId) {
        await productService.updateProduct(productId, values);
        message.success("Cập nhật sản phẩm thành công");
      } else {
        await productService.createProduct(values);
        message.success("Tạo sản phẩm thành công");
      }
      onClose();
      onSuccess();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const blocked = error.response.data?.details ?? [];
        const text = blocked
          .map((item: { color: string; variants: string[] }) =>
            `${item.color} (${item.variants.join(", ")})`
          )
          .join("; ");
        // Không đóng modal: người dùng cần sửa lại lựa chọn của mình.
        message.error(`Không thể xóa màu/size đã có trong đơn hàng: ${text}`);
      } else if (axios.isAxiosError(error) && error.response?.status === 400) {
        message.error((error.response.data?.details ?? []).join(" · ") || "Dữ liệu không hợp lệ");
      } else {
        console.error(error);
        message.error("Lưu sản phẩm thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      title={productId ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm mới"}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText={productId ? "Lưu" : "Tạo"}
      cancelText="Hủy"
      width={840}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Tên sản phẩm"
          name="name"
          rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
        >
          <Input placeholder="Nhập tên sản phẩm" />
        </Form.Item>

        <Form.Item
          label="Danh mục"
          name="categoryId"
          rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
        >
          <Select
            placeholder="Chọn danh mục"
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={3} placeholder="Nhập mô tả" />
        </Form.Item>

        <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.List name="colors">
          {(colorFields, { add: addColor, remove: removeColor }) => (
            <>
              {colorFields.map((colorField) => (
                <Card
                  key={colorField.key}
                  size="small"
                  className="mb-4"
                  title={`Màu #${colorField.name + 1}`}
                  extra={
                    <DeleteOutlined
                      style={{ color: "red", cursor: "pointer" }}
                      onClick={() => removeColor(colorField.name)}
                    />
                  }
                >
                  <Space align="baseline" wrap>
                    <Form.Item
                      label="Tên màu"
                      name={[colorField.name, "color"]}
                      rules={[{ required: true, message: "Nhập tên màu" }]}
                    >
                      <Input placeholder="Ví dụ: Đen" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item label="Mã màu" name={[colorField.name, "colorCode"]}>
                      <Input placeholder="#000000" style={{ width: 140 }} />
                    </Form.Item>
                  </Space>

                  <Form.List name={[colorField.name, "images"]}>
                    {(imageFields, { add: addImage, remove: removeImage }) => (
                      <>
                        {imageFields.map((imageField) => (
                          <Space key={imageField.key} align="baseline">
                            <Form.Item
                              label="Link ảnh"
                              name={[imageField.name, "imageUrl"]}
                              rules={[{ required: true, message: "Nhập link ảnh" }]}
                            >
                              <Input placeholder="https://..." style={{ width: 420 }} />
                            </Form.Item>
                            <DeleteOutlined
                              style={{ color: "red", cursor: "pointer" }}
                              onClick={() => removeImage(imageField.name)}
                            />
                          </Space>
                        ))}
                        <Form.Item>
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => addImage({ imageUrl: "" })}
                          >
                            Thêm ảnh
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>

                  <Form.List name={[colorField.name, "variants"]}>
                    {(variantFields, { add: addVariant, remove: removeVariant }) => (
                      <>
                        {variantFields.map((variantField) => (
                          <Space key={variantField.key} align="baseline" wrap>
                            <Form.Item
                              label="Size"
                              name={[variantField.name, "size"]}
                              rules={[{ required: true, message: "Nhập size" }]}
                            >
                              <Input placeholder="M" style={{ width: 100 }} />
                            </Form.Item>
                            <Form.Item
                              label="Giá"
                              name={[variantField.name, "price"]}
                              rules={[{ required: true, message: "Nhập giá" }]}
                            >
                              <InputNumber min={0} style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item
                              label="Tồn kho"
                              name={[variantField.name, "stock"]}
                              rules={[{ required: true, message: "Nhập tồn kho" }]}
                            >
                              <InputNumber min={0} step={1} style={{ width: 120 }} />
                            </Form.Item>
                            <DeleteOutlined
                              style={{ color: "red", cursor: "pointer" }}
                              onClick={() => removeVariant(variantField.name)}
                            />
                          </Space>
                        ))}
                        <Form.Item>
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => addVariant({ size: "", price: 0, stock: 0 })}
                          >
                            Thêm size
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Card>
              ))}

              <Form.Item>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => addColor(emptyColor)}>
                  Thêm màu
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </AppModal>
  );
};

export default ModalProducts;
