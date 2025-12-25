import { Form, Input, Select, Space } from "antd";
import React, { useState } from "react";

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

type FilterProps = {
  filters: FilterConfig[];
  onChange: (values: Record<string, any>) => void;
};

const AppFilters: React.FC<FilterProps> = ({ filters, onChange }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const handleChange = (name: string, value: any) => {
    const newValues = {
      ...values,
      [name]: value,
    };
    setValues(newValues);
    onChange(newValues);
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
                onChange={(value) => handleChange(filter.name, value)}
              />
            </Form.Item>
          );
        }
      })}
    </Space>
  );
};

export default AppFilters;
