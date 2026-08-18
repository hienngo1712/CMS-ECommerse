import { useContext, useState } from "react";
import { App, Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import { AuthContext } from "../../contexts/AuthContext";
import type { LoginPayload } from "./Types";

const { Title, Text } = Typography;

const Login = () => {
  const { user, loading, login } = useContext(AuthContext);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  // Đã đăng nhập rồi mà mở /login thì đưa thẳng vào trong, không bắt nhập lại.
  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (values: LoginPayload) => {
    try {
      setSubmitting(true);
      await login(values.username, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      // 401 và 403 mang câu tiếng Việt server đã soạn sẵn cho người dùng đọc.
      // Các mã khác trả chuỗi nội bộ, không đưa ra ngoài.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const serverError = axios.isAxiosError(error)
        ? error.response?.data?.error
        : undefined;

      if (serverError && (status === 400 || status === 401 || status === 403)) {
        message.error(String(serverError));
      } else {
        console.error(error);
        message.error("Không đăng nhập được, thử lại sau");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <div className="text-center mb-6">
          <Title level={3} className="!mb-1">
            CMS Ecommerce
          </Title>
          <Text type="secondary">Đăng nhập để quản trị</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} disabled={submitting}>
          <Form.Item
            label="Tài khoản"
            name="username"
            rules={[{ required: true, message: "Vui lòng nhập tài khoản" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username hoặc email"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
