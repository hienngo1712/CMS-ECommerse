import { useState } from "react";
import { App, Button } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";

import { useT } from "../../i18n";
import {
  exportExcel,
  fetchAllPages,
  type ExcelColumn,
  type FetchPage,
} from "../../utils/exportExcel";

type Props<T> = {
  fileName: string;
  sheetName: string;
  columns: ExcelColumn<T>[];
  fetchPage: FetchPage<T>;
};

const ExportButton = <T,>({ fileName, sheetName, columns, fetchPage }: Props<T>) => {
  const { t } = useT();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      const { rows, truncated } = await fetchAllPages(fetchPage);

      if (rows.length === 0) {
        message.warning(t("exportEmpty"));
        return;
      }

      await exportExcel({
        fileName,
        sheetName,
        columns,
        rows,
        totalLabel: t("grandTotal"),
      });

      if (truncated) {
        message.warning(t("exportTruncated", { count: rows.length }));
      } else {
        message.success(t("exportSuccess", { count: rows.length }));
      }
    } catch (error) {
      console.error(error);
      message.error(t("exportFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button icon={<FileExcelOutlined />} loading={loading} onClick={handleClick}>
      {t("exportExcel")}
    </Button>
  );
};

export default ExportButton;
