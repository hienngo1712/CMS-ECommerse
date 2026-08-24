import type { Row, Worksheet } from "exceljs";

// Một chỗ duy nhất lo việc dựng file .xlsx và tải về. Các trang chỉ khai báo
// cột và cách lấy dữ liệu, không đụng tới exceljs.

export type ExcelColumn<T> = {
  header: string;
  value: (row: T) => string | number | Date | null;
  width?: number;
  // Định dạng ô kiểu Excel, ví dụ "#,##0" cho tiền. Để trống là dùng mặc định.
  numFmt?: string;
  // Cột này có cộng tổng ở dòng cuối không. Phải khai tường minh chứ không
  // đoán theo kiểu dữ liệu: "Mã đơn" cũng là số nhưng cộng lại thì vô nghĩa.
  total?: boolean;
};

// Trần cứng ở backend: mọi controller đều ép limit về tối đa 100.
const PAGE_SIZE = 100;

// Chặn trên để một bộ lọc quá rộng không thành 500 request. Vượt ngưỡng thì
// báo cho người dùng biết là đã cắt bớt, không im lặng.
const MAX_PAGES = 50;

type PagedResult<T> = {
  data: T[];
  meta: { pageCount: number };
};

export type FetchPage<T> = (page: number, limit: number) => Promise<PagedResult<T>>;

// Lấy hết bản ghi khớp bộ lọc hiện tại, không phải chỉ trang đang xem — xuất
// đúng 10 dòng đang nhìn thấy thì gần như vô dụng.
export const fetchAllPages = async <T>(fetchPage: FetchPage<T>) => {
  const first = await fetchPage(1, PAGE_SIZE);
  const rows = [...first.data];
  const lastPage = Math.min(first.meta.pageCount, MAX_PAGES);

  // Gọi tuần tự chứ không song song: vài chục request bắn cùng lúc chỉ làm
  // nghẽn server để đổi lấy chút thời gian.
  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchPage(page, PAGE_SIZE);
    rows.push(...next.data);
  }

  return { rows, truncated: first.meta.pageCount > MAX_PAGES };
};

const today = () => new Date().toISOString().slice(0, 10);

// exceljs quy Date ra số serial theo giờ UTC, mà Excel đọc số đó nguyên xi
// (định dạng xlsx không có khái niệm múi giờ). Không dịch trước thì file mở ra
// lệch đúng bằng chênh lệch múi giờ — ở VN là 7 tiếng, 11:51 thành 04:51.
const toExcelDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000);

const GRID = "FFBFBFBF";
const HEADER_BG = "FF1F4E79";
const TOTAL_BG = "FFF2F2F2";

const borderAll = (color: string) => ({
  top: { style: "thin" as const, color: { argb: color } },
  left: { style: "thin" as const, color: { argb: color } },
  bottom: { style: "thin" as const, color: { argb: color } },
  right: { style: "thin" as const, color: { argb: color } },
});

const styleHeader = (row: Row) => {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = borderAll(GRID);
  });
};

const styleTotalRow = (row: Row) => {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    cell.border = {
      ...borderAll(GRID),
      // Vạch đậm tách phần tổng khỏi phần dữ liệu.
      top: { style: "double", color: { argb: GRID } },
    };
  });
};

// Cột chữ căn trái, số căn phải — đúng thói quen đọc bảng, và nhìn phát biết
// ngay cột nào là số.
const styleBody = (sheet: Worksheet, firstRow: number, lastRow: number) => {
  for (let index = firstRow; index <= lastRow; index += 1) {
    sheet.getRow(index).eachCell((cell) => {
      cell.border = borderAll(GRID);
      cell.alignment = { vertical: "middle" };
    });
  }
};

export const exportExcel = async <T>({
  fileName,
  sheetName,
  columns,
  rows,
  totalLabel,
}: {
  fileName: string;
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  totalLabel: string;
}) => {
  // Nạp lúc bấm chứ không nạp lúc mở trang: exceljs gần 1MB, mà phần lớn
  // phiên làm việc không bấm xuất lần nào.
  const ExcelJS = await import("exceljs");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width ?? 20,
    style: column.numFmt ? { numFmt: column.numFmt } : undefined,
  }));
  styleHeader(sheet.getRow(1));

  rows.forEach((row) => {
    sheet.addRow(
      columns.map((column) => {
        const value = column.value(row);
        return value instanceof Date ? toExcelDate(value) : value;
      })
    );
  });

  const firstDataRow = 2;
  const lastDataRow = rows.length + 1;
  styleBody(sheet, firstDataRow, lastDataRow);

  const hasTotals = columns.some((column) => column.total);
  if (hasTotals) {
    const totalCells = columns.map((column, index) => {
      if (!column.total) {
        // Nhãn "Tổng cộng" đặt ở cột đầu, trừ khi chính cột đó phải cộng tổng.
        return index === 0 ? totalLabel : null;
      }

      const letter = sheet.getColumn(index + 1).letter;
      const sum = rows.reduce((acc, row) => {
        const value = column.value(row);
        return acc + (typeof value === "number" ? value : 0);
      }, 0);

      // Ghi công thức kèm sẵn kết quả: mở ra là thấy số ngay, mà lọc hay xoá
      // dòng trong Excel thì tổng vẫn tự tính lại.
      return {
        formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`,
        result: sum,
      };
    });
    styleTotalRow(sheet.addRow(totalCells));
  }

  // Giữ hàng tiêu đề luôn nhìn thấy khi cuộn.
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}-${today()}.xlsx`;
  link.click();
  // Không thu hồi thì blob nằm lại trong bộ nhớ tới khi đóng tab.
  URL.revokeObjectURL(url);
};
