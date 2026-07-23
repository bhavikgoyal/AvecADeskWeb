import DashboardTemplate from "./DashboardTemplate";
import PeopleIcon from "@mui/icons-material/People";
import StoreIcon from "@mui/icons-material/Store";
import { buildSparkline } from "../../constants/chartData";
import { useEffect, useState } from "react";
import { fetchAllStudents } from "../../api/studentsApi";
import { fetchVendorRows } from "../../api/vendorsApi";

export default function AdmissionDash() {
  const [studentStats, setStudentStats] = useState({
    total: 0,
    newThisMonth: 0,
  });

  const [vendorStats, setVendorStats] = useState({
    total: 0,
    newThisMonth: 0,
    active: 0,
    pending: 0,
    loggedInToday: 0,
  });

  useEffect(() => {
    const getNewThisMonthCount = (list) =>
      Array.isArray(list)
        ? list.filter((item) => {
            if (!item.createdAt) return false;

            const created = new Date(item.createdAt);
            const now = new Date();

            return (
              created.getFullYear() === now.getFullYear() &&
              created.getMonth() === now.getMonth()
            );
          }).length
        : 0;

    const fetchData = async () => {
      try {
        const studentList = await fetchAllStudents();
        const vendorList = await fetchVendorRows();

        console.log("Vendors:", vendorList);

        if (Array.isArray(studentList)) {
          setStudentStats({
            total: studentList.length,
            newThisMonth: getNewThisMonthCount(studentList),
          });
        }

        if (Array.isArray(vendorList)) {
          const active = vendorList.filter(
            (v) => (v.status || "").toLowerCase() === "active"
          ).length;

          const pending = vendorList.filter(
            (v) => (v.status || "").toLowerCase() === "pending"
          ).length;

          const loggedInToday = vendorList.filter((v) => {
            console.log("Vendor:", v.name);
            console.log("Last Login:", v.lastLogin);

            if (!v.lastLogin) return false;

            const loginDate = new Date(v.lastLogin);
            const today = new Date();

            console.log("Login Date:", loginDate);
            console.log("Today:", today);

            const isLoggedToday =
              loginDate.getDate() === today.getDate() &&
              loginDate.getMonth() === today.getMonth() &&
              loginDate.getFullYear() === today.getFullYear();

            console.log("Logged Today:", isLoggedToday);

            return isLoggedToday;
          }).length;

          console.log("Total Logged In Today:", loggedInToday);

          setVendorStats({
            total: vendorList.length,
            newThisMonth: getNewThisMonthCount(vendorList),
            active,
            pending,
            loggedInToday,
          });
        }
      } catch (error) {
        console.error("Dashboard Error:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardTemplate
      title="Admission Dashboard"
      subtitle="Admissions overview (admission role only)"
      kpiStats={[
        {
          label: "Total Students",
          value: studentStats.total.toLocaleString(),
          sparklineData: buildSparkline(2),
          icon: <PeopleIcon />,
          footer: [
            {
              label: "New this month",
              value: `+${studentStats.newThisMonth}`,
              sub: "this month",
            },
          ],
        },
        {
          label: "Total Vendors",
          value: vendorStats.total.toLocaleString(),
          sparklineData: buildSparkline(2),
          icon: <StoreIcon />,
          color: "var(--teal)",
          footer: [
            {
              label: "New this month",
              value: `+${vendorStats.newThisMonth}`,
              sub: "this month",
            },
            {
              label: "Active",
              value: vendorStats.active.toLocaleString(),
            },
            {
              label: "Pending",
              value: vendorStats.pending.toLocaleString(),
            },
          ],
        },
        {
          label: "Currently Active Vendors",
          value: vendorStats.loggedInToday.toLocaleString(),
          sparklineData: buildSparkline(2),
          icon: <StoreIcon />,
          color: "var(--teal)",
          footer: [
            {
              label: "Logged in today",
              value: vendorStats.loggedInToday.toLocaleString(),
            },
          ],
        },
      ]}
      showSnapshot={false}
      showQuickInsights={false}
      showUpcoming={false}
      showCharts={false}
      showMiniStats={false}
      showTable={false}
    />
  );
}