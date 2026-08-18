import { Form, Input, Select, Space } from "antd";
import React, { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

type BaseFilter = {
  name: string;
  placeholder?: string;
  label?: string;
};

type InputFilter = BaseFilter & {
  type: "input";
};

type SelectFilter = BaseFilter & {
  type: "select";
  options: FilterOption[];
};

type FilterOption = {
  label: string;
  value: string | number;
};

export type FilterConfig = SelectFilter | InputFilter;

// Input luôn cho chuỗi, Select cho chuỗi hoặc số tuỳ FilterOption.value, và
// undefined khi người dùng bấm nút xoá (allowClear).
export type FilterValue = string | number | undefined;

export type FilterValues = Record<string, FilterValue>;

// Tiện ích cho trang gọi: query gửi lên API luôn là chuỗi, còn Select có thể
// trả số nên cần ép kiểu ở một chỗ thay vì rải String() khắp nơi.
// Xuất một hàm cạnh component thì Fast Refresh không nhận file này nữa; chấp
// nhận như ThemeContext đã làm, đổi lại không phải tách ra một file riêng chỉ
// để chứa đúng ba dòng.
// eslint-disable-next-line react-refresh/only-export-components
export const asText = (value: FilterValue) =>
  value === undefined || value === null ? "" : String(value);

type FilterProps = {
  filters: FilterConfig[];
  onChange: (values: FilterValues) => void;
};

const AppFilters: React.FC<FilterProps> = ({ filters, onChange }) => {
  const [values, setValues] = useState<FilterValues>({});

  // Gõ vào ô tìm kiếm thì hoãn 400ms, nếu không mỗi ký tự là một request.
  // Select thì bắn ngay và huỷ lần hoãn đang chờ, để giá trị vừa gõ không
  // bay lên sau khi người dùng đã đổi lựa chọn.
  const emitDebounced = useDebouncedCallback(
    (next: FilterValues) => onChange(next),
    400
  );

  const handleChange = (name: string, value: FilterValue, immediate = false) => {
    const newValues = {
      ...values,
      [name]: value,
    };
    setValues(newValues);
    if (immediate) {
      emitDebounced.cancel();
      onChange(newValues);
    } else {
      emitDebounced(newValues);
    }
  };
  return (
    <Space wrap>
      {filters.map((filter) => {
        if (filter.type === "input") {
          return (
            <Form.Item
              key={filter.name}
              label={filter.label || ""}
              style={{ marginBottom: 0 }}
              layout="vertical"
            >
              <Input
                placeholder={filter.placeholder}
                allowClear
                onChange={(e) => handleChange(filter.name, e.target.value)}
                style={{ width: "200px" }}
              />
            </Form.Item>
          );
        }

        if (filter.type === "select") {
          return (
            <Form.Item
              key={filter.name}
              label={filter.label || ""}
              style={{ marginBottom: 0 }}
              layout="vertical"
            >
              <Select
                placeholder={filter.placeholder}
                allowClear
                options={filter.options}
                style={{ width: "200px" }}
                onChange={(value) => handleChange(filter.name, value, true)}
              />
            </Form.Item>
          );
        }
      })}
    </Space>
  );
};

export default AppFilters;
