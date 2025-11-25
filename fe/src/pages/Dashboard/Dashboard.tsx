import { useState } from "react";
import AppModal from "../../components/common/AppModal";

type Props = {};

const Dashboard = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
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
