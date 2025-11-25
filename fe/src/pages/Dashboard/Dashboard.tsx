import { useState } from "react";
import AppModal from "../../components/common/AppModal";
import AppFilters from "../../components/common/AppFilters";

type Props = {};

const Dashboard = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleChange = () => {
    setIsOpen(!isOpen);
  };
  const testFilters: FilterConfig[] = [
    {
      type: "input",
      name: "search",
      placeholder: "Nhập chữ vào",
      label: "Tìm kiếm",
    },
    {
      type: "select",
      name: "isActive",
      placeholder: "Lựa chọn",
      options: [
        {
          label: "all",
          value: 0,
        },
        {
          label: "Hoạt động",
          value: 1,
        },
      ],
      label: "Trạng thái",
    },
  ];
  return (
    <div>
      <button onClick={handleChange}>Open</button>
      <AppFilters filters={testFilters} onChange={() => {}} />
      <AppModal
        open={isOpen}
        onOk={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
        bg={"red"}
      >
        Hello mn
      </AppModal>
    </div>
  );
};

export default Dashboard;
