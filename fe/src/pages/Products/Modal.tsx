import { useEffect, useState } from "react";
import { App, Button, Card, Form, Input, InputNumber, Select, Space, Switch } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";

import AppModal from "../../components/common/AppModal";
import productService from "../../services/ProductService";
import type { CategoriesResponse } from "../Categories/Types";
import type { ProductPayload } from "./Type";
import { useT } from "../../i18n";

type Props = {
  open: boolean;
  productId?: number;
  categories: CategoriesResponse[];
  onClose: () => void;
  onSuccess: () => void;
};

const makeEmptyColor = () => ({ color: "", colorCode: "#000000", images: [], variants: [] });

const ModalProducts = ({ open, productId, categories, onClose, onSuccess }: Props) => {
  const [form] = Form.useForm<ProductPayload>();
  const { message } = App.useApp();
  const { t } = useT();
  const [submitting, setSubmitting] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    if (productId) {
      // Xóa dữ liệu sản phẩm trước đó ngay lập tức, tránh hiển thị nhầm khi
      // đang chờ response cho productId mới (xem I-6).
      form.resetFields();
      setLoadingProduct(true);
      productService
        .getProductById(productId)
        .then((product) => {
          if (ignore) return;
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
        })
        .catch((error) => {
          if (ignore) return;
          console.error(error);
          message.error(t("loadFailed"));
          onClose();
        })
        .finally(() => {
          if (ignore) return;
          setLoadingProduct(false);
        });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, colors: [] });
      setLoadingProduct(false);
    }

    return () => {
      ignore = true;
    };
    // Cố tình KHÔNG phụ thuộc onClose: component cha truyền arrow function mới
    // sau mỗi lần render, đưa vào deps là effect chạy lại liên tục và xoá sạch
    // form ngay giữa lúc người dùng đang nhập.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId, form, message, t]);

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
        message.success(t("updateSuccess"));
      } else {
        await productService.createProduct(values);
        message.success(t("createSuccess"));
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
        message.error(t("variantInUse", { detail: text }));
      } else if (axios.isAxiosError(error) && error.response?.status === 400) {
        message.error((error.response.data?.details ?? []).join(" · ") || t("invalidData"));
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
      title={productId ? t("editProduct") : t("createProduct")}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okButtonProps={{ disabled: loadingProduct }}
      okText={productId ? t("save") : t("create")}
      cancelText={t("cancel")}
      width={840}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label={t("productName")}
          name="name"
          rules={[{ required: true, message: t("required", { name: t("productName") }) }]}
        >
          <Input placeholder={t("enterName")} />
        </Form.Item>

        <Form.Item
          label={t("category")}
          name="categoryId"
          rules={[{ required: true, message: t("required", { name: t("category") }) }]}
        >
          <Select
            placeholder={t("selectCategory")}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Form.Item label={t("description")} name="description">
          <Input.TextArea rows={3} placeholder={t("enterDescription")} />
        </Form.Item>

        <Form.Item label={t("status")} name="isActive" valuePropName="checked">
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
                  title={t("colorNumber", { index: colorField.name + 1 })}
                  extra={
                    <DeleteOutlined
                      style={{ color: "red", cursor: "pointer" }}
                      onClick={() => removeColor(colorField.name)}
                    />
                  }
                >
                  <Space align="baseline" wrap>
                    <Form.Item
                      label={t("colorName")}
                      name={[colorField.name, "color"]}
                      rules={[{ required: true, message: t("required", { name: t("colorName") }) }]}
                    >
                      <Input placeholder={t("exampleColor")} style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item label={t("colorCode")} name={[colorField.name, "colorCode"]}>
                      <Input placeholder={t("exampleColorCode")} style={{ width: 140 }} />
                    </Form.Item>
                  </Space>

                  <Form.List name={[colorField.name, "images"]}>
                    {(imageFields, { add: addImage, remove: removeImage }) => (
                      <>
                        {imageFields.map((imageField) => (
                          <Space key={imageField.key} align="baseline">
                            <Form.Item
                              label={t("imageUrl")}
                              name={[imageField.name, "imageUrl"]}
                              rules={[{ required: true, message: t("required", { name: t("imageUrl") }) }]}
                            >
                              <Input placeholder={t("exampleImageUrl")} style={{ width: 420 }} />
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
                            {t("addImage")}
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
                              label={t("size")}
                              name={[variantField.name, "size"]}
                              rules={[{ required: true, message: t("required", { name: t("size") }) }]}
                            >
                              <Input placeholder={t("exampleSize")} style={{ width: 100 }} />
                            </Form.Item>
                            <Form.Item
                              label={t("price")}
                              name={[variantField.name, "price"]}
                              rules={[{ required: true, message: t("required", { name: t("price") }) }]}
                            >
                              <InputNumber min={0} style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item
                              label={t("stock")}
                              name={[variantField.name, "stock"]}
                              rules={[{ required: true, message: t("required", { name: t("stock") }) }]}
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
                            {t("addSize")}
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Card>
              ))}

              <Form.Item>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => addColor(makeEmptyColor())}>
                  {t("addColor")}
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
