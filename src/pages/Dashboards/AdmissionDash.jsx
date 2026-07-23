import DashboardTemplate from './DashboardTemplate';
import PeopleIcon from '@mui/icons-material/People';
import { buildSparkline } from '../../constants/chartData';
import { useEffect, useState } from 'react';
import { fetchAllStudents } from '../../api/studentsApi';

export default function AdmissionDash() {
  const [studentStats, setStudentStats] = useState({ total: 0, enrolled: 0, waitlist: 0, newThisMonth: 0 });

  useEffect(() => {
    let mounted = true;
    fetchAllStudents()
      .then((list) => {
        if (!mounted) return;
        const total = Array.isArray(list) ? list.length : 0;
        const enrolled = Array.isArray(list) ? list.filter((s) => (s.enrolmentStatus || '').toLowerCase() === 'enrolled').length : 0;
        const waitlist = Array.isArray(list) ? list.filter((s) => (s.enrolmentStatus || '').toLowerCase() === 'interested').length : 0;
        const now = new Date();
        const newThisMonth = Array.isArray(list)
          ? list.filter((s) => {
              if (!s.createdAt) return false;
              const d = new Date(s.createdAt);
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length
          : 0;
        setStudentStats({ total, enrolled, waitlist, newThisMonth });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardTemplate
      title="Admission Dashboard"
      subtitle="Admissions overview (admission role only)"
      kpiStats={[
        {
          label: 'Total applicants',
          value: studentStats.total.toLocaleString(),
          sparklineData: buildSparkline(2),
          icon: <PeopleIcon />,
          footer: [ { label: 'New this month', value: `+${studentStats.newThisMonth}`, sub: 'this month' } ],
        }
      ]}
      showSnapshot={false}
      showQuickInsights={false}
      showUpcoming={false}
      showCharts={false}
      showMiniStats={false}
      showTable={false}
    >
    </DashboardTemplate>
  );
}
