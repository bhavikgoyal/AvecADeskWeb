import axiosClient from './axiosClient';

function normalizeMail(raw) {
  return {
    id: raw.mailHistoryId ?? raw.MailHistoryId,
    mailType: raw.mailType ?? raw.MailType ?? '',
    toEmail: raw.toEmail ?? raw.ToEmail ?? '',
    intendedToEmail: raw.intendedToEmail ?? raw.IntendedToEmail ?? '',
    mailMode: raw.mailMode ?? raw.MailMode ?? '',
    fromEmail: raw.fromEmail ?? raw.FromEmail ?? '',
    subject: raw.subject ?? raw.Subject ?? '',
    bodyHtml: raw.bodyHtml ?? raw.BodyHtml ?? null,
    attachmentName: raw.attachmentName ?? raw.AttachmentName ?? '',
    status: raw.status ?? raw.Status ?? '',
    errorMessage: raw.errorMessage ?? raw.ErrorMessage ?? '',
    sentByUserName: raw.sentByUserName ?? raw.SentByUserName ?? '',
    sentOn: raw.sentOn ?? raw.SentOn ?? null,
  };
}

export async function fetchMailHistory({
  search,
  mailType,
  status,
  fromDate,
  toDate,
  pageNumber = 1,
  pageSize = 25,
} = {}) {
  const { data } = await axiosClient.get('/api/mail-history', {
    params: {
      search: search || undefined,
      mailType: mailType || undefined,
      status: status || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      pageNumber,
      pageSize,
    },
  });

  return {
    items: (data?.items ?? data?.Items ?? []).map(normalizeMail),
    totalCount: data?.totalCount ?? data?.TotalCount ?? 0,
    sentCount: data?.sentCount ?? data?.SentCount ?? 0,
    failedCount: data?.failedCount ?? data?.FailedCount ?? 0,
    skippedCount: data?.skippedCount ?? data?.SkippedCount ?? 0,
  };
}

export async function fetchMailHistoryById(id) {
  const { data } = await axiosClient.get(`/api/mail-history/${id}`);
  return normalizeMail(data);
}

export async function fetchMailHistoryTypes() {
  const { data } = await axiosClient.get('/api/mail-history/types');
  return Array.isArray(data) ? data : [];
}
