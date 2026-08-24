import { Popconfirm, Space, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";

import { useT } from "../../i18n";
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
}: Props) => {
  const { t } = useT();

  return (
    <>
      <Space>
        {showView && (
          <Tooltip title={t("viewDetail")}>
            <EyeOutlined
              style={{ color: "#52c41a", cursor: "pointer" }}
              onClick={onView}
            />
          </Tooltip>
        )}

        {showEdit && (
          <Tooltip title={t("edit")}>
            <EditOutlined
              style={{ color: "#1677ff", cursor: "pointer" }}
              onClick={onEdit}
            />
          </Tooltip>
        )}

        {showDelete && (
          <Popconfirm
            title={t("confirmDelete")}
            description={t("confirmDeleteDesc")}
            okText={t("delete")}
            cancelText={t("cancel")}
            onConfirm={onDelete}
          >
            <Tooltip title={t("delete")}>
              <DeleteOutlined style={{ color: "red", cursor: "pointer" }} />
            </Tooltip>
          </Popconfirm>
        )}
      </Space>
    </>
  );
};
export default TableActions;
