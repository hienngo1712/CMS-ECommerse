import type { ModalProps } from "antd";
import Modal from "antd/es/modal/Modal";
import React from "react";

type AppModalProps = ModalProps & {
  bg?: string;
};

const AppModal: React.FC<AppModalProps> = ({ children, ...rest }) => {
  return (
    //centered căn giữa, destroyOnHidden ẩn/xóa component khỏi DOM
    //maskClosable= false giúp người dùng click ở ngoài component cũng ko mất dialog
    <Modal centered destroyOnHidden maskClosable={false} {...rest}>
      {" "}
      {children}{" "}
    </Modal>
  );
};

export default AppModal;
