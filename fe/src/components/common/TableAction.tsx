import { Popconfirm, Popover, Space, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
type ExtraAction = {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  color?: string;
};
type Props = {
  showEdit?: boolean;
  showDelete?: boolean;
  showView?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  extraActions?: ExtraAction[];
};
const TableActions = ({
  showEdit,
  showDelete,
  showView,
  onEdit,
  onDelete,
  onView,
  extraActions,
}: Props) => {
  return (
    <>
      <Space>
        {showView && (
          <Tooltip title="Xem chi tiết">
            <EyeOutlined
              style={{ color: "#52c41a", cursor: "pointer" }}
              onClick={onView}
            />
          </Tooltip>
        )}

        {showEdit && (
          <Tooltip title="Chỉnh sửa">
            <EditOutlined
              style={{ color: "#1677ff", cursor: "pointer" }}
              onClick={onEdit}
            />
          </Tooltip>
        )}

        {showDelete && (
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa mục này ?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={onDelete}
          >
            <Tooltip title="Xóa">
              <DeleteOutlined style={{ color: "red", cursor: "pointer" }} />
            </Tooltip>
          </Popconfirm>
        )}
      </Space>
    </>
  );
};
export default TableActions;
