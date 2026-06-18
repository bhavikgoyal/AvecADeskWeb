import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import PageShell from '../../components/PageShell';
import { PAGE_CONFIG } from '../../config/pageConfig';
import { getResourceConfig } from '../../config/resourceConfig';
import { loadRecords } from '../../utils/resourceStorage';
import { fetchEmailTemplates } from '../../api/emailTemplates';
import { getReminderRules, getReminderStats } from '../../api/reminderApi';
import { getInvoices } from '../../api/invoiceApi';

function mapTemplateToRow(t) {
  return {
    id: t.templateId ?? t.TemplateId,
    templateName: t.name ?? t.Name,
    category: t.category ?? t.Category,
    subject: t.subject ?? t.Subject,
    bodyHtml: t.bodyHtml ?? t.BodyHtml,
    updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function mapReminderToRow(r) {
  return {
    id: r.ruleId ?? r.RuleId,
    ruleType: r.ruleType ?? r.RuleType,
    triggerAfterDays: r.triggerAfterDays ?? r.TriggerAfterDays,
    intervalDays: r.intervalDays ?? r.IntervalDays,
    isActive: (r.isActive ?? r.IsActive) ? 'Yes' : 'No',
    templateName: r.templateName ?? r.TemplateName ?? '',
    category: r.category ?? r.Category ?? '',
    updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function mapInvoiceToRow(inv) {
  const instituteId = inv.instituteId ?? inv.InstituteId;
  const createdAt = inv.createdAt ?? inv.CreatedAt;
  return {
    id: inv.invoiceId ?? inv.InvoiceId,
    invoiceNumber: inv.invoiceNumber ?? inv.InvoiceNumber,
    instituteNameRef: instituteId != null ? `Institute #${instituteId}` : '—',
    invoiceStatus: inv.status ?? inv.Status,
    totalAmount: inv.totalAmount ?? inv.TotalAmount,
    updated: createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
  };
}

export default function ResourceListPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const page = PAGE_CONFIG[basePath];
  const [rows, setRows] = useState([]);
  const [reminderStats, setReminderStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      if (basePath === '/templates') {
        try {
          const data = await fetchEmailTemplates();
          if (active) setRows(data.map(mapTemplateToRow));
        } catch (err) {
          console.error('Failed to load email templates:', err);
          if (active) setRows([]);
        }
      } else if (basePath === '/reminders') {
        try {
          const [rules, stats] = await Promise.all([getReminderRules(), getReminderStats()]);
          if (active) {
            setRows(rules.map(mapReminderToRow));
            setReminderStats(stats);
          }
        } catch (err) {
          console.error('Failed to load reminder rules:', err);
          if (active) {
            setRows([]);
            setReminderStats(null);
          }
        }
      }else if (basePath === '/invoices') {
        try {
          const data = await getInvoices();
          if (active) setRows(data.map(mapInvoiceToRow));
        } catch (err) {
          console.error('Failed to load invoices:', err);
          if (active) setRows([]);
        } 
      }else {
        if (active) setRows(loadRecords(basePath));
      }

      if (active) setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [basePath]);

  if (!resource || !page) return null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
      </Box>
    );
  }

  let stats = page.stats;

  if (basePath === '/templates') {
    stats = page.stats.map((stat, index) =>
      index === 0 ? { ...stat, value: String(rows.length) } : stat,
    );
  }

  if (basePath === '/reminders') {
    const activeCount = rows.filter((r) => r.isActive === 'Yes').length;
    stats = page.stats.map((stat, index) => {
      if (index === 0) return { ...stat, value: String(activeCount) };
      if (index === 1 && reminderStats?.sentToday !== undefined) return { ...stat, value: String(reminderStats.sentToday) };
      if (index === 2 && reminderStats?.paused !== undefined) return { ...stat, value: String(reminderStats.paused) };
      if (index === 3 && reminderStats?.failed !== undefined) return { ...stat, value: String(reminderStats.failed) };
      return stat;
    });
  }
   if (basePath === '/invoices') {
    const openCount = rows.filter((r) => r.invoiceStatus !== 'Approved' && r.invoiceStatus !== 'Rejected').length;
    const paidTotal = rows
      .filter((r) => r.invoiceStatus === 'Approved')
      .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    const draftCount = rows.filter((r) => r.invoiceStatus === 'Draft').length;
    const rejectedCount = rows.filter((r) => r.invoiceStatus === 'Rejected').length;

    stats = page.stats.map((stat, index) => {
      if (index === 0) return { ...stat, value: String(openCount) };
      if (index === 1) return { ...stat, value: `$${(paidTotal / 1000).toFixed(0)}k` };
      if (index === 2) return { ...stat, value: String(draftCount) };
      if (index === 3) return { ...stat, value: String(rejectedCount) };
      return stat;
    });
  }


  return (
    <PageShell
      title={page.title}
      subtitle={page.subtitle}
      stats={stats}
      columns={resource.columns}
      rows={rows}
      actionLabel={resource.actionLabel}
      searchPlaceholder={`Search ${resource.plural.toLowerCase()}...`}
      onAdd={() => navigate(`${basePath}/new`)}
      onRowClick={(row) => navigate(`${basePath}/${row.id}`, { state: { edit: true } })}
    />
  );
}