import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import {
  Alert, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Typography, Button, Select, MenuItem, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel, Switch, Tabs, Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { fetchCoursesByScrappingId } from '../../api/coursesApi';
import { fetchStudentContracts, createStudentContract, updateStudentContract, deleteStudentContract, uploadStudentContractFile, } from '../../api/studentContractsApi';
import { fetchUniqueInstituteNames, getCampusesForInstitute, getUniqueInstituteNames, normalizeInstituteName, resolveScrappingId, } from '../../api/institutesScrappingApi';
import ConfirmByStudentDialog from './ConfirmByStudentDialog';
import { createStudentWithPaymentSchedule, fetchStudentById, fetchStudentPaymentDetail, saveStudentEnrollmentNumber } from '../../api/studentsApi';
import { createPaymentSchedule, createStudentPaymentInstallment, createStudentCommission, createStudentCommissionDetail, updateStudentPaymentSchedule, } from '../../api/schedulesApi';
import { FormActions, FormPageLayout, FormSectionsLayout, formPaperSx } from '../../components/forms';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';
import { formatDateDisplay } from '../../utils/dateFormat';

const EPSILON = 0.01;
const CONTRACT_STATUS_OPTIONS = ['Active', 'Inactive', 'Expired', 'Draft'];

const FEE_TYPES = [
  { key: 'Enrolment', label: 'Enrolment Fee', amountField: 'enrollmentFee' },
  { key: 'Material', label: 'Material Fee', amountField: 'materialFee' },
  { key: 'Tuition', label: 'Tuition Fee', amountField: 'tuitionFee' },
  { key: 'OSHC', label: 'OSHC Fee', amountField: 'oshcFee' },
];
const FEE_COMPONENT_FIELDS = FEE_TYPES.map((ft) => ft.amountField);

const tuitionFromCourseFee = (form) => {
  const courseFee = Number(form.courseFee || 0);
  const otherFees =
    Number(form.enrollmentFee || 0) +
    Number(form.materialFee || 0) +
    Number(form.oshcFee || 0);
  return Math.max(0, round2(courseFee - otherFees)).toFixed(2);
};
const amountFieldSx = { width: 170, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#fff' }, };

const headerCellSx = {
  fontWeight: 700,
  color: 'text.secondary',
  textTransform: 'uppercase',
  fontSize: '0.72rem',
  letterSpacing: 0.4,
  py: 1.25,
};

const tabSx = { textTransform: 'none', fontWeight: 700, minHeight: 48 };
const statusSelectSx = { width: 150, height: 40, '& .MuiSelect-select': { minWidth: '70px', padding: '8px 32px 8px 12px' }, };
const commissionSelectSx = { width: 110, height: 40, '& .MuiSelect-select': { minWidth: '70px', padding: '8px 32px 8px 12px' }, };
const menuProps = { container: typeof document !== 'undefined' ? document.body : undefined };
const getEmptyContractForm = () => ({
  status: 'Active',
  referenceNo: '',
  fileUrl: '',
  fileName: '',
  startDate: '',
  endDate: '',
  notes: '',
});

const isPaidLike = (status) =>
  status === 'ConfirmedByCollege' ||
  status === 'ConfirmedByStudent' ||
  status === 'PaidByCollege' ||
  status === 'PaidByStudent';

const shownPaidAmount = (row) => {
  const paid = Number(row?.paidAmount || 0);
  if (paid > 0) return paid;
  if (isPaidLike(row?.status) || row?.status === 'Partial') return Number(row?.amount || 0);
  return 0;
};

// Same rule as the Complete tab: fees are collected and every commission row is Paid.
const isCourseCompleteStudent = (courseFee, payments, commissions) => {
  const collected = (payments || []).reduce(
    (sum, row) => sum + Number(row.paidAmount ?? row.PaidAmount ?? 0),
    0
  );
  const fee = Number(courseFee || 0);
  if (!(collected > 0 && fee - collected <= 1)) return false;

  const details = (commissions || []).filter((row) => {
    const deleted = row.isDeleted ?? row.IsDeleted;
    return deleted !== true && deleted !== 1 && String(deleted) !== '1';
  });
  if (details.length === 0) return false;

  return details.every(
    (row) => String(row.commissionStatus ?? row.CommissionStatus ?? '').trim().toLowerCase() === 'paid'
  );
};

// Half-up rounding like Excel/SQL ROUND; toFixed(2) turns 31.325 into 31.32 because of float error.
const round2 = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  const sign = num < 0 ? -1 : 1;
  return (sign * Number(`${Math.round(Number(`${Math.abs(num)}e2`))}e-2`)) || 0;
};

const toCents = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  const sign = num < 0 ? -1 : 1;
  return sign * Math.round(Number(`${Math.abs(num)}e2`));
};

const centsToAmount = (cents) => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
};

// Equal shares that still add back to the original cents. The last share
// keeps any leftover cent, so 5020 / 2 stays 2510.00 + 2510.00 and
// 5470 / 3 becomes 1823.33 + 1823.33 + 1823.34.
const splitCents = (totalCents, count) => {
  const n = Math.max(0, Number(count) || 0);
  if (n === 0) return [];
  const base = Math.trunc(totalCents / n);
  const last = totalCents - base * (n - 1);
  return Array.from({ length: n }, (_, index) => (index === n - 1 ? last : base));
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

const computeCourseEndDate = (startDateStr, durationStr) => {
  const start = parseIsoDate(startDateStr);
  if (!start || !durationStr) return '';

  const match = durationStr.match(/(\d+)\s*(Year|Years|Month|Months|Week|Weeks)/i);
  if (!match) return '';

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const end = new Date(start);

  if (unit.startsWith('year')) end.setFullYear(end.getFullYear() + value);
  else if (unit.startsWith('month')) end.setMonth(end.getMonth() + value);
  else if (unit.startsWith('week')) end.setDate(end.getDate() + value * 7);

  return toIsoDate(end);
};

const computeCourseEndDateFromWeeks = (startDateStr, weeks) => {
  const start = parseIsoDate(startDateStr);
  const numWeeks = Number(weeks);
  if (!start || !numWeeks) return '';

  const end = new Date(start);
  end.setDate(end.getDate() + numWeeks * 7);
  return toIsoDate(end);
};

const durationToWeeks = (durationStr) => {
  if (!durationStr) return '';

  const match = durationStr.match(/(\d+)\s*(Year|Years|Month|Months|Week|Weeks)/i);
  if (!match) return '';

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith('year')) return Math.round(value * 52);
  if (unit.startsWith('month')) return Math.round(value * 4.345);
  if (unit.startsWith('week')) return value;
  return '';
};

const shiftByFrequency = (baseDate, frequency, periods) => {
  const date = new Date(baseDate);
  if (frequency === 'Monthly') date.setMonth(date.getMonth() + periods);
  else if (frequency === 'Quarterly') date.setMonth(date.getMonth() + periods * 3);
  return date;
};

const formatDateCell = (value) => formatDateDisplay(value, '-');

const compareInstallmentNo = (left, right) => {
  const toParts = (value) =>
    String(value ?? '')
      .split('.')
      .map((part) => {
        const n = Number(part);
        return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
      });

  const a = toParts(left);
  const b = toParts(right);
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? -1;
    const bv = b[i] ?? -1;
    if (av !== bv) return av - bv;
  }

  return 0;
};
const getGroupNo = (row) => row.parentGroupNo ?? row.installmentNo;
const getGroupMembers = (list, groupNo) => list.filter((x) => getGroupNo(x) === groupNo);
const getGroupRoot = (list, groupNo) => list.find((x) => x.installmentNo === groupNo);

const isSameFeeType = (a, b) => (a.feeType ?? null) === (b.feeType ?? null);

const isScheduledInstallment = (row) => {
  const n = Number(row?.installmentNo);
  return Number.isFinite(n) && n >= 1 && Math.abs(n - Math.round(n)) < 1e-6;
};

const feeRemainderPoolCents = (list, item) => {
  const currentIndex = (list || []).findIndex(
    (x) =>
      String(x.installmentNo) === String(item.installmentNo) &&
      String(x.feeType).toLowerCase() === String(item.feeType).toLowerCase()
  );
  if (currentIndex < 0) return toCents(item?.amount);

  const currentFeeType = String(list[currentIndex].feeType || '').trim().toLowerCase();
  let pool = toCents(list[currentIndex].amount);
  for (let i = currentIndex + 1; i < list.length; i += 1) {
    const row = list[i];
    if (isScheduledInstallment(row) || isPaidLike(row.status)) break;
    if (String(row.feeType || '').trim().toLowerCase() !== currentFeeType) continue;
    pool += toCents(row.amount);
  }
  return pool;
};

// On create, a fee edit can use this row plus every later installment of the same fee.
// Rows above stay as they are, so they are not part of the pool.
const createFeePoolCents = (list, item) => {
  const currentIndex = (list || []).findIndex(
    (x) =>
      String(x.installmentNo) === String(item.installmentNo) &&
      String(x.feeType).toLowerCase() === String(item.feeType).toLowerCase()
  );
  if (currentIndex < 0) return toCents(item?.amount);

  const feeType = String(list[currentIndex].feeType || '').trim().toLowerCase();
  let followers = 0;
  let pool = toCents(list[currentIndex].amount);
  for (let i = currentIndex + 1; i < list.length; i += 1) {
    const row = list[i];
    if (String(row.feeType || '').trim().toLowerCase() !== feeType) continue;
    if (!isScheduledInstallment(row)) continue;
    pool += toCents(row.amount);
    followers += 1;
  }
  return followers > 0 ? pool : Number.MAX_SAFE_INTEGER;
};

const isInitialGroupRow = (row) =>
  Boolean(row?.isInitialPayment) || !isScheduledInstallment(row);

const isTuitionInstallment = (row) =>
  String(row?.feeType || '').trim().toLowerCase() === 'tuition fee';

// Initial Payment, partial rows, and paid rows stay as they are when the installment count changes.
const isProtectedInstallment = (row) => {
  if (isInitialGroupRow(row)) return true;
  if (isPaidLike(row?.status)) return true;
  return String(row?.status || '').toLowerCase() === 'partial';
};

const resizeUnpaidInstallments = (list, requestedCount, frequency, startDate) => {
  const count = Math.floor(Number(requestedCount));
  if (!count || count < 1) return { list, appliedCount: count };

  const regularTuition = (row) => isScheduledInstallment(row) && isTuitionInstallment(row);
  const regularLocked = list.filter((row) => regularTuition(row) && isProtectedInstallment(row));
  const unpaid = list
    .filter((row) => regularTuition(row) && !isProtectedInstallment(row))
    .sort((a, b) => Number(a.installmentNo) - Number(b.installmentNo));

  const target = Math.max(count, regularLocked.length);
  const kept = unpaid.slice(0, target - regularLocked.length).map((row) => ({ ...row }));

  const usedNumbers = new Set([
    ...regularLocked.map((row) => Number(row.installmentNo)),
    ...kept.map((row) => Number(row.installmentNo)),
  ]);

  const dated = [...regularLocked, ...kept]
    .map((row) => parseIsoDate(String(row.dueDate || '').slice(0, 10)))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());
  let cursor = dated[dated.length - 1] || parseIsoDate(String(startDate || '').slice(0, 10));

  const created = [];
  let nextNo = 1;
  while (kept.length + created.length < target - regularLocked.length) {
    while (usedNumbers.has(nextNo)) nextNo += 1;
    if (!cursor) break;
    cursor = shiftByFrequency(cursor, frequency || 'Monthly', 1);
    const amount = '0.00';
    created.push({
      installmentNo: String(nextNo),
      feeType: 'Tuition Fee',
      dueDate: toIsoDate(cursor),
      amount,
      paidAmount: '0.00',
      balance: amount,
      status: 'Pending',
      originalStatus: 'Pending',
      originalAmount: 0,
    });
    usedNumbers.add(nextNo);
    nextNo += 1;
  }

  let adjustable = [...kept, ...created];
  const poolCents = unpaid.reduce((sum, row) => sum + toCents(row.amount), 0);
  if (adjustable.length === 0 && poolCents > 0) {
    adjustable = unpaid.map((row) => ({ ...row }));
  }
  const shares = splitCents(poolCents, adjustable.length);

  adjustable.forEach((row, index) => {
    const amount = centsToAmount(shares[index] ?? 0);
    row.amount = amount;
    row.balance = amount;
    row.paidAmount = row.paidAmount && Number(row.paidAmount) > 0 ? row.paidAmount : '0.00';
    row.originalAmount = Number(amount);
  });

  const others = list.filter((row) => !regularTuition(row));
  const activeTuition = [...regularLocked.map((row) => ({ ...row })), ...adjustable];

  return {
    list: [...others, ...activeTuition].sort((a, b) =>
      compareInstallmentNo(a.installmentNo, b.installmentNo)
    ),
    appliedCount: target,
  };
};

// Tuition and Non-Tuition rows can share an installment number, so a row is identified by both.
const isSamePaymentRow = (a, b) => a.installmentNo === b.installmentNo && isSameFeeType(a, b);

const isCommissionOfPaymentRow = (commissionRow, paymentRow) => {
  const commissionInstallmentId =
    commissionRow.studentPaymentInstallmentId ?? commissionRow.StudentPaymentInstallmentId;
  if (paymentRow.studentPaymentInstallmentId && commissionInstallmentId) {
    return Number(commissionInstallmentId) === Number(paymentRow.studentPaymentInstallmentId);
  }
  return isSamePaymentRow(commissionRow, paymentRow);
};

const hasSplitChild = (list, parent) =>
  list.some((row) => row.parentInstallmentNo === parent.installmentNo && isSameFeeType(row, parent));

// A middle installment marked Partial reopens every confirmed or partial installment under it.
const toPendingInstallment = (row) => {
  const wasPartial = row.status === 'Partial';
  const amount =
    wasPartial && Number(row.originalAmount) > 0
      ? Number(row.originalAmount).toFixed(2)
      : Number(row.amount || 0).toFixed(2);

  return {
    ...row,
    amount,
    status: 'Pending',
    originalStatus: 'Pending',
    paidAmount: '0.00',
    balance: amount,
    paidDate: null,
    autoPartial: false,
    originalAmount: wasPartial ? undefined : row.originalAmount,
  };
};

const pendingRowsBelow = (list, item) => {
  const index = list.findIndex((row) => isSamePaymentRow(row, item));
  if (index < 0) return list;

  const shouldReset = (row) => isPaidLike(row.status) || row.status === 'Partial';
  const parentsLeavingPartial = list.filter(
    (row, rowIndex) => rowIndex > index && row.status === 'Partial'
  );

  const kept = list.filter((row, rowIndex) => {
    if (rowIndex <= index || row.studentPaymentInstallmentId || row.parentInstallmentNo == null) {
      return true;
    }

    return !parentsLeavingPartial.some(
      (parent) =>
        row.parentInstallmentNo === parent.installmentNo && isSameFeeType(row, parent)
    );
  });

  return kept.map((row) => {
    const sourceIndex = list.indexOf(row);
    if (sourceIndex <= index || !shouldReset(row)) return row;
    return toPendingInstallment(row);
  });
};

const getEffectivePaidAmount = (list, row) => {
  if (isPaidLike(row.status)) {
    return hasSplitChild(list, row)
      ? Number(row.paidAmount || 0)
      : Number(row.amount || 0);
  }
  if (row.status === 'Partial') return Number(row.paidAmount || 0);
  return 0;
};

const isGroupFullyCovered = (list, groupNo) => {
  const root = getGroupRoot(list, groupNo);
  if (!root) return false;

  const totalOriginal = Number(root.amount || 0);
  if (totalOriginal <= 0) return false;

  const sumPaid = getGroupMembers(list, groupNo).reduce((sum, x) => {
    if (isPaidLike(x.status)) {
      return sum + Number(hasSplitChild(list, x) ? x.paidAmount || 0 : x.amount || 0);
    }
    return sum + Number(x.paidAmount || 0);
  }, 0);

  return Math.min(sumPaid, totalOriginal) + EPSILON >= totalOriginal;
};

const isLastInGroup = (list, groupNo, row) => {
  const members = getGroupMembers(list, groupNo).sort((a, b) => a.installmentNo - b.installmentNo);
  return members.length > 0 && members[members.length - 1].installmentNo === row.installmentNo;
};

const deriveParentGroupNo = (rowById, item) => {
  const parentId = item.parentInstallmentId ?? item.ParentInstallmentId ?? null;
  if (!parentId) return Number(item.installmentNo ?? item.InstallmentNo ?? 0);

  const parent = rowById.get(String(parentId));
  if (!parent) return Number(item.installmentNo ?? item.InstallmentNo ?? 0);

  return deriveParentGroupNo(rowById, parent);
};

const resetToOriginal = (row) => {
  const original = Number(row.originalAmount ?? row.amount ?? 0);
  return {
    ...row,
    originalAmount: original,
    amount: original.toFixed(2),
    balance: original.toFixed(2),
  };
};

const hydratePaymentList = (rows) => {
  const rawRows = (rows || []).map((item) => ({
    ...item,
    studentPaymentInstallmentId: item.studentPaymentInstallmentId,
    apiInstallmentNo: Number(item.installmentNo),
    parentInstallmentId: item.parentInstallmentId ?? null,
  }));

  const compareByApiInstallmentNo = (left, right) =>
    Number(left.apiInstallmentNo) - Number(right.apiInstallmentNo);

  const rowById = new Map(
    rawRows
      .filter((item) => item.studentPaymentInstallmentId != null)
      .map((item) => [String(item.studentPaymentInstallmentId), item])
  );

  const childrenByParentId = new Map();
  for (const item of rawRows) {
    if (!item.parentInstallmentId) continue;
    const siblings = childrenByParentId.get(item.parentInstallmentId) ?? [];
    siblings.push(item);
    childrenByParentId.set(item.parentInstallmentId, siblings);
  }
  for (const siblings of childrenByParentId.values()) {
    siblings.sort(compareByApiInstallmentNo);
  }

  const orderedRows = [];
  const visited = new Set();

  const appendWithChildren = (item) => {
    if (!item || visited.has(item.studentPaymentInstallmentId)) return;

    if (item.studentPaymentInstallmentId != null) {
      visited.add(item.studentPaymentInstallmentId);
    }

    orderedRows.push(item);

    const children = childrenByParentId.get(item.studentPaymentInstallmentId) ?? [];
    for (const child of children) {
      appendWithChildren(child);
    }
  };

  rawRows
    .filter((item) => !item.parentInstallmentId)
    .sort(compareByApiInstallmentNo)
    .forEach(appendWithChildren);

  rawRows
    .filter((item) => !visited.has(item.studentPaymentInstallmentId))
    .sort(compareByApiInstallmentNo)
    .forEach(appendWithChildren);

  const groupCounts = new Map();

  const hydratedRows = orderedRows.map((item) => {
    const parentGroupNo = deriveParentGroupNo(rowById, {
      ...item,
      installmentNo: item.apiInstallmentNo,
    });

    let installmentNo;
    if (item.parentInstallmentId) {
      const processedInGroup = groupCounts.get(parentGroupNo) ?? 0;
      installmentNo = Number((parentGroupNo + (processedInGroup + 1) / 10).toFixed(2));
      groupCounts.set(parentGroupNo, processedInGroup + 1);
    } else {
      installmentNo = item.apiInstallmentNo;
    }

    return {
      studentPaymentInstallmentId: item.studentPaymentInstallmentId,
      apiInstallmentNo: item.apiInstallmentNo,
      installmentNo,
      isInitialPayment: item.apiInstallmentNo === 0,
      parentInstallmentId: item.parentInstallmentId,
      parentInstallmentNo: null,
      parentGroupNo,
      feeType: item.feeType ?? item.FeeType ?? null,
      dueDate: item.dueDate?.substring(0, 10),
      paidDate: item.paidDate?.substring(0, 10),
      amount: item.feesAmount,
      paidAmount:
        Number(item.paidAmount || 0) > 0
          ? item.paidAmount
          : isPaidLike(item.status) || item.status === 'Partial'
            ? item.feesAmount
            : item.paidAmount,
      balance: item.balanceAmount,
      status: item.status,
      originalStatus: item.originalStatus ?? item.status,
      documentUrl: item.installmentImage ?? item.InstallmentImage ?? null,
    };
  });

  const hydratedRowById = new Map(
    hydratedRows
      .filter((item) => item.studentPaymentInstallmentId != null)
      .map((item) => [item.studentPaymentInstallmentId, item])
  );

  return hydratedRows.map((item) => ({
    ...item,
    parentInstallmentNo: item.parentInstallmentId
      ? hydratedRowById.get(item.parentInstallmentId)?.installmentNo ?? null
      : null,
  }));
};

const isTuitionFeeType = (feeType) => String(feeType || '').trim().toLowerCase() === 'tuition fee';

const bonusRowKey = (row) => {
  const id = row.commissionDetailId ?? row.CommissionDetailId;
  if (id) return `id:${id}`;
  return `${row.installmentNo ?? row.displayInstallmentNo}|${String(row.feeType || '').trim().toLowerCase()}`;
};

const buildChangeSnapshot = (list, history) =>
  JSON.stringify({
    list: (list || []).map((x) => ({
      id: x.studentPaymentInstallmentId ?? null,
      no: x.installmentNo,
      feeType: x.feeType ?? null,
      dueDate: x.dueDate ?? null,
      amount: Number(x.amount || 0).toFixed(2),
      paidAmount: Number(x.paidAmount || 0).toFixed(2),
      paidDate: x.paidDate || null,
      status: x.status,
    })),
    history: (history || []).map((x) => ({
      id: x.commissionDetailId ?? x.CommissionDetailId ?? null,
      status: x.commissionStatus ?? x.CommissionStatus ?? 'Pending',
    })),
  });

const buildStudentSnapshot = ({ fullName, email, phone, folderNo, leadNo, studentIdDisplay, bonus, bonusType, bonusOption, dueDate }) =>
  JSON.stringify({
    fullName: String(fullName ?? '').trim(),
    email: String(email ?? '').trim(),
    phone: String(phone ?? ''),
    folderNo: String(folderNo ?? ''),
    leadNo: String(leadNo ?? ''),
    studentIdDisplay: String(studentIdDisplay ?? '').trim(),
    bonus: Number(bonus || 0),
    bonusType: bonus > 0 ? String(bonusType ?? '') : '',
    bonusOption: bonus > 0 ? String(bonusOption ?? '') : '',
    dueDate: String(dueDate ?? '').slice(0, 10),
  });

export default function NewStudentPage({ basePath }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const resource = getResourceConfig(basePath);

  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [paymentList, setPaymentList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [gstPercentage, setGstPercentage] = useState(0);
  const [bonusApplied, setBonusApplied] = useState(false);
  const [bonusFromDetail, setBonusFromDetail] = useState(true);
  const [bonusOverrides, setBonusOverrides] = useState({});
  const [addBonus, setAddBonus] = useState(false);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [originalPaymentList, setOriginalPaymentList] = useState([]);
  const [originalSchedule, setOriginalSchedule] = useState(null);
  const [installmentCountDraft, setInstallmentCountDraft] = useState('');
  const [installmentCountLocked, setInstallmentCountLocked] = useState(false);
  const [feeDraft, setFeeDraft] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmTargetInstallment, setConfirmTargetInstallment] = useState(null);
  const [instituteLocked, setInstituteLocked] = useState(false);
  const [savedScheduleSnapshot, setSavedScheduleSnapshot] = useState(null);
  const [savedStudentSnapshot, setSavedStudentSnapshot] = useState(null);
  const [gstInclusive, setGstInclusive] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([0]));
  const [editPastDataAll, setEditPastDataAll] = useState(false);
  const [editPastDataRows, setEditPastDataRows] = useState(() => new Set());

  const [contracts, setContracts] = useState([]);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingContractKey, setEditingContractKey] = useState(null);
  const [contractForm, setContractForm] = useState(getEmptyContractForm());
  const [contractSaving, setContractSaving] = useState(false);
  const [contractUploading, setContractUploading] = useState(false);

  const submittingRef = useRef(false);
  const manualDueDatesRef = useRef(new Map());
  const installmentResizeTimer = useRef(null);
  const prefillAppliedRef = useRef(false);
  const contractFileInputRef = useRef(null);

  const calculateAmounts = (next) => {
    const fee = Number(next.courseFee || 0);
    const initialPayment = Number(next.initialPayment || 0);
    const tuitionFee = Number(next.tuitionFee || 0);
    const installments = Number(next.noOfInstallment || 1);

    const remainingFee = fee - initialPayment;
    const installmentFee = installments > 0 ? remainingFee / installments : remainingFee;
    const tuitionShare = fee > 0 && tuitionFee > 0 ? installmentFee * (tuitionFee / fee) : installmentFee;

    const rawCommission = (tuitionShare * Number(next.commissionPercentage || 0)) / 100;
    const gstPct = Number(next.gstPercentage || 0);

    let gst;
    if (gstInclusive) {
      gst = rawCommission - rawCommission / (1 + gstPct / 100);
    } else {
      gst = (rawCommission * gstPct) / 100;
    }

    next.commissionAmount = rawCommission.toFixed(2);
    next.gstAmount = gst.toFixed(2);
    next.invoiceAmount = gstInclusive
      ? rawCommission.toFixed(2)
      : (rawCommission + gst).toFixed(2);
  };

  const generateInstallments = (data) => {
    const fee = Number(data.courseFee || 0);
    const count = Number(data.noOfInstallment || 0);
    const initialPayment = Number(data.initialPayment || 0);

    if (!fee || !count || !data.startDate || !data.frequency) {
      setPaymentList([]);
      return;
    }

    const startDate = parseIsoDate(data.startDate);
    if (!startDate) {
      setPaymentList([]);
      return;
    }

    const paidRegularInstallments = isEdit
      ? originalPaymentList.filter((x) => isPaidLike(x.status) && Number(x.installmentNo) >= 1)
      : [];

    const nonTuitionFee =
      Number(data.enrollmentFee || 0) + Number(data.materialFee || 0) + Number(data.oshcFee || 0);
    const tuitionFee = Number(data.tuitionFee || 0);

    const initialNonTuitionAmount = Math.min(initialPayment, nonTuitionFee);
    const initialTuitionAmount = Math.min(Math.max(initialPayment - nonTuitionFee, 0), tuitionFee);
    const remainingNonTuitionFee = Math.max(nonTuitionFee - initialNonTuitionAmount, 0);
    const remainingTuitionFee = tuitionFee - initialTuitionAmount;

    const paidByInstallment = new Map(
      paidRegularInstallments.map((row) => [Number(row.installmentNo), row])
    );
    const unpaidSlots = [];
    let paidTuitionCents = 0;
    for (let i = 0; i < count; i++) {
      const paidRow = paidByInstallment.get(i + 1);
      if (paidRow) {
        paidTuitionCents += toCents(paidRow.paidAmount || paidRow.amount || 0);
      } else {
        unpaidSlots.push(i);
      }
    }
    const tuitionShares = splitCents(
      toCents(remainingTuitionFee) - paidTuitionCents,
      unpaidSlots.length
    );
    const tuitionShareBySlot = new Map(
      unpaidSlots.map((slot, index) => [slot, tuitionShares[index] ?? 0])
    );

    const list = [];
    const regularStartDate = initialPayment > 0 ? shiftByFrequency(startDate, data.frequency, 1) : new Date(startDate);
    if (initialPayment <= 0 && nonTuitionFee > 0) {
      list.push({
        installmentNo: "0",
        feeType: "Non-Tuition Fee",
        dueDate: toIsoDate(startDate),
        amount: nonTuitionFee.toFixed(2),
        paidAmount: "0.00",
        balance: nonTuitionFee.toFixed(2),
        status: "Pending",
        isInitialPayment: false,
        isRemainingNonTuition: true,
        originalAmount: nonTuitionFee,
      });
    }
    if (initialPayment > 0) {
      if (initialNonTuitionAmount > 0) {
        list.push({
          installmentNo: 0,
          feeType: 'Non-Tuition Fee',
          dueDate: toIsoDate(startDate),
          amount: initialNonTuitionAmount.toFixed(2),
          paidAmount: '0.00',
          balance: initialNonTuitionAmount.toFixed(2),
          status: 'Pending',
          isInitialPayment: true,
          originalAmount: initialNonTuitionAmount,
        });
      }

      if (remainingNonTuitionFee > 0) {
        list.push({
          installmentNo: 1,
          feeType: 'Non-Tuition Fee',
          dueDate: toIsoDate(regularStartDate),
          amount: remainingNonTuitionFee.toFixed(2),
          paidAmount: '0.00',
          balance: remainingNonTuitionFee.toFixed(2),
          status: 'Pending',
          isInitialPayment: false,
          isRemainingNonTuition: true,
          originalAmount: remainingNonTuitionFee,
        });
      }

      if (initialTuitionAmount > 0) {
        list.push({
          installmentNo: 0,
          feeType: 'Tuition Fee',
          dueDate: toIsoDate(startDate),
          amount: initialTuitionAmount.toFixed(2),
          paidAmount: '0.00',
          balance: initialTuitionAmount.toFixed(2),
          status: 'Pending',
          isInitialPayment: true,
          originalAmount: initialTuitionAmount,
        });
      }
    }

    for (let i = 0; i < count; i++) {
      const paidRow = paidByInstallment.get(i + 1);

      if (paidRow) {
        list.push({ ...paidRow, feeType: paidRow.feeType || 'Tuition Fee' });
        continue;
      }

      const amount = centsToAmount(tuitionShareBySlot.get(i) ?? 0);
      list.push({
        installmentNo: String(i + 1),
        feeType: 'Tuition Fee',
        dueDate: toIsoDate(shiftByFrequency(regularStartDate, data.frequency, i)),
        amount,
        paidAmount: '0.00',
        balance: amount,
        status: 'Pending',
        originalAmount: Number(amount),
      });
    }

    setPaymentList(
      list.map((row) => {
        const manual = manualDueDatesRef.current.get(
          `${String(row.installmentNo)}|${String(row.feeType || '').trim().toLowerCase()}`
        );
        return manual ? { ...row, dueDate: manual } : row;
      })
    );
  };

  useEffect(() => {
    let active = true;

    const loadInstitutes = async () => {
      try {
        const data = await fetchUniqueInstituteNames();
        if (active) setInstitutes(data);
      } catch (err) {
        if (active) setLoadError(err.message || 'Failed to load institutes.');
      }
    };

    loadInstitutes();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !form.courseId || !courses.length) return;
    const selectedCourse = courses.find((c) => String(c.courseId) === String(form.courseId));
    if (!selectedCourse) return;

    setForm((prev) => ({
      ...prev,
      courseDurationWeeks: durationToWeeks(selectedCourse.duration),
    }));
  }, [isEdit, form.courseId, courses]);

  useEffect(() => {
    if (isEdit || prefillAppliedRef.current) return;

    const fromQuery = normalizeInstituteName(searchParams.get('institute'));
    const preselectedInstituteName = fromQuery || normalizeInstituteName(location.state?.instituteName);
    const preselectedInstituteId = location.state?.instituteId;

    if (!preselectedInstituteName && !preselectedInstituteId) return;
    prefillAppliedRef.current = true;

    if (preselectedInstituteName) {
      setForm((prev) => ({ ...prev, instituteId: preselectedInstituteName }));
    } else if (preselectedInstituteId) {
      setForm((prev) => ({ ...prev, instituteId: String(preselectedInstituteId) }));
    }

    if (fromQuery || location.state?.fromInstitute) {
      setInstituteLocked(true);
    }

    if (searchParams.get('institute')) {
      setSearchParams({}, { replace: true });
    } else if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [isEdit, location.pathname, location.state, navigate, searchParams, setSearchParams]);

  useEffect(() => {
    if (!institutes.length || !form.instituteId) return;

    const asNumber = Number(form.instituteId);
    if (!Number.isFinite(asNumber) || String(asNumber) !== String(form.instituteId).trim()) return;

    const row = institutes.find((x) => String(x.id) === String(form.instituteId));
    if (!row) return;

    setForm((prev) => ({
      ...prev,
      instituteId: normalizeInstituteName(row.name),
      campusname: prev.campusname || '',
    }));
  }, [institutes, form.instituteId]);

  const uniqueInstituteNames = useMemo(() => getUniqueInstituteNames(institutes), [institutes]);

  const instituteSelectOptions = useMemo(() => {
    const names = uniqueInstituteNames.map((name) => ({ value: name, label: name }));
    const current = normalizeInstituteName(form.instituteId);

    if (current && !names.some((n) => String(n.value) === current)) {
      names.push({ value: current, label: current });
    }

    return names;
  }, [uniqueInstituteNames, form.instituteId]);

  const campusOptions = useMemo(
    () => getCampusesForInstitute(institutes, form.instituteId),
    [institutes, form.instituteId]
  );

  const resolvedScrappingId = useMemo(() => {
    if (!normalizeInstituteName(form.instituteId) || !String(form.campusname || '').trim()) {
      return '';
    }
    return resolveScrappingId(institutes, form.instituteId, form.campusname);
  }, [institutes, form.instituteId, form.campusname]);

  useEffect(() => {
    let active = true;

    if (!resolvedScrappingId) {
      setCourses([]);
      return undefined;
    }

    fetchCoursesByScrappingId(resolvedScrappingId, form.campusname)
      .then((data) => {
        if (!active) return;
        setCourses(data.courses);
        setGstPercentage(data.gstPercentage);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load courses.');
      });

    return () => {
      active = false;
    };
  }, [resolvedScrappingId, form.campusname]);

  const selectOptions = useMemo(
    () => ({
      instituteId: instituteSelectOptions,
      courseId: courses.map((item) => ({ value: item.courseId, label: item.courseName })),
      campusname: campusOptions.map((c) => ({ value: c, label: c })),
    }),
    [instituteSelectOptions, courses, campusOptions]
  );

  const buildStudentPayload = (base = form) => ({
    ...base,
    instituteId: resolvedScrappingId ? Number(resolvedScrappingId) : base.instituteId,
  });

  useEffect(() => {
    if (!isEdit || !/^\d+$/.test(String(id || ''))) return;

    async function loadData() {
      try {
        const [data, student] = await Promise.all([
          fetchStudentPaymentDetail(id),
          fetchStudentById(id),
        ]);

        setForm({
          ...getEmptyForm(basePath),
          studentId: data.studentId,
          studentIdDisplay: student.enrollmentNumber || '',
          scheduleId: data.scheduleId,
          assignment: data.assignment ?? data.Assignment ?? '',
          instituteId: String(data.instituteId),
          courseId: String(data.courseId),
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          FolderNo: data.folderNo,
          campusname: data.campus,
          leadNo: data.leadNo ?? '',
          coeVoe: data.coeVoe ?? '',
          serviceTypeStudent: data.serviceType ?? '',
          agent: data.agent ?? '',
          courseStartDate: data.courseStartDate?.substring(0, 10),
          courseEndDate: data.courseEndDate?.substring(0, 10),
          commissionAmount: data.commissionAmount,
          gstAmount: data.gstAmount,
          bonus: data.bonusAmount,
          dueDate: data.dueDate?.substring(0, 10),
          courseFee: data.totalCourseFee,
          amountDue: data.totalCourseFee,
          enrollmentFee: data.enrollmentFee ?? '',
          materialFee: data.materialFee ?? '',
          tuitionFee: data.tuitionFee ?? '',
          oshcFee: data.oshcFee ?? '',
          frequency: data.frequency,
          startDate: data.firstDueDate?.substring(0, 10),
          noOfInstallment: Number(data.noOfInstallments),
          commissionPercentage: data.commissionPercentage,
          gstPercentage: data.gstPercentage,
          bonusType: data.bonusType,
          bonusOption: data.bonusOption,
          remark:
            (data.commissionHistory || []).find((row) => String(row.remark ?? '').trim())?.remark
            || data.remark
            || '',
        });

        setOriginalSchedule({
          noOfInstallment: Number(data.noOfInstallments),
          frequency: data.frequency,
          startDate: data.firstDueDate?.substring(0, 10),
        });

        const list = hydratePaymentList(data.studentPaymentList || []);
        const apiInstallmentMap = new Map(
          list.map((x) => [Number(x.apiInstallmentNo), x.installmentNo])
        );
        const storedInitialPayment = data.initialPayment ?? data.InitialPayment;
        const initialPaymentTotal =
          storedInitialPayment != null && storedInitialPayment !== ''
            ? round2(Number(storedInitialPayment))
            : 0;

        setForm((prev) => {
          const next = { ...prev, initialPayment: initialPaymentTotal };
          calculateAmounts(next);
          return next;
        });

        const history = data.commissionHistory || [];
        setInstallmentCountLocked(
          isCourseCompleteStudent(data.totalCourseFee, list, history)
        );

        setOriginalPaymentList(list);
        setPaymentList(list);
        setCommissionHistory(history);
        setSavedScheduleSnapshot(buildChangeSnapshot(list, history));
        setSavedStudentSnapshot(
          buildStudentSnapshot({
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            folderNo: data.folderNo,
            leadNo: data.leadNo,
            studentIdDisplay: student.enrollmentNumber || '',
            bonus: Number(data.bonusAmount || 0),
            bonusType: data.bonusType,
            bonusOption: data.bonusOption,
            dueDate: data.dueDate,
          })
        );

        if (data.bonusAmount > 0) {
          setBonusApplied(true);
          setAddBonus(true);
        }
      } catch (err) {
        setError(err.message || 'Failed to load student.');
      }

      try {
        const contractList = await fetchStudentContracts(id);
        setContracts(contractList || []);
      } catch (err) {
        console.warn('Failed to load student contracts', err);
      }
    }

    loadData();
  }, [id, isEdit, basePath]);

  useEffect(() => {
    if (!isEdit) return;
    setInstallmentCountDraft(
      form.noOfInstallment === '' || form.noOfInstallment == null ? '' : String(form.noOfInstallment)
    );
  }, [isEdit, form.noOfInstallment]);

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
    setVisitedTabs((prev) => {
      if (prev.has(newValue)) return prev;
      const next = new Set(prev);
      next.add(newValue);
      return next;
    });
  };

  const installmentsLocked =
    installmentCountLocked ||
    (isEdit &&
      paymentList.length > 0 &&
      paymentList.every((row) => row.status && row.status !== 'Pending'));

  const updateField = (field, value) => {
    if (field === 'noOfInstallment' && installmentsLocked) return;
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'instituteId' && value !== prev.instituteId) {
        next.campusname = '';
        next.courseId = '';
        next.courseFee = '';
        next.amountDue = '';
        next.enrollmentFee = 0;
        next.materialFee = 0;
        next.tuitionFee = 0;
        next.oshcFee = 0;
        next.commissionRate = 0;
        next.rateType = '';
        next.commissionPercentage = 0;
        next.gstPercentage = Number(gstPercentage || 0);
        next.commissionAmount = 0;
        next.gstAmount = 0;
        next.invoiceAmount = 0;
        setPaymentList([]);
      }

      if (field === 'bonus') {
        setBonusApplied(false);
      }

      if (!isEdit && field === 'courseId') {
        const selectedCourse = courses.find((c) => String(c.courseId) === String(value));

        const enrollmentFee = Number(selectedCourse?.enrollmentFee || 0);
        const materialFee = Number(selectedCourse?.materialFee || 0);
        const oshcFee = Number(selectedCourse?.oshcFee || 0);

        next.enrollmentFee = enrollmentFee;
        next.materialFee = materialFee;
        next.oshcFee = oshcFee;
        next.courseFee = selectedCourse?.fees ?? '';
        next.amountDue = next.courseFee;
        next.tuitionFee = tuitionFromCourseFee(next);
        next.courseDurationWeeks = durationToWeeks(selectedCourse?.duration);
        next.commissionRate = Number(selectedCourse?.commissionRate ?? 0);
        next.rateType = selectedCourse?.rateType ?? '';
        next.commissionPercentage = Number(next.commissionRate ?? 0);
        next.gstPercentage = Number(gstPercentage || 0);
        next.courseStartDate = next.startDate || next.courseStartDate || '';
        next.courseEndDate = computeCourseEndDate(next.courseStartDate, selectedCourse?.duration);
      }

      if (field === 'courseFee' || field === 'enrollmentFee' || field === 'materialFee' || field === 'oshcFee') {
        next.amountDue = next.courseFee;
        next.tuitionFee = tuitionFromCourseFee(next);
      }

      if (field === 'startDate') {
        next.courseStartDate = value;
      }

      if (field === 'startDate' || field === 'courseStartDate' || field === 'courseId') {
        if (next.courseDurationWeeks) {
          next.courseEndDate = computeCourseEndDateFromWeeks(
            next.courseStartDate,
            next.courseDurationWeeks
          );
        } else {
          const selectedCourse = courses.find((c) => String(c.courseId) === String(next.courseId));
          next.courseEndDate = computeCourseEndDate(next.courseStartDate, selectedCourse?.duration);
        }
      }

      if (field === 'courseDurationWeeks') {
        next.courseEndDate = computeCourseEndDateFromWeeks(next.courseStartDate, value);
      }

      if (
        field === 'courseId' ||
        field === 'courseFee' ||
        field === 'noOfInstallment' ||
        field === 'initialPayment' ||
        field === 'commissionPercentage' ||
        field === 'gstPercentage' ||
        FEE_COMPONENT_FIELDS.includes(field)
      ) {
        if (field === 'commissionPercentage') next.commissionPercentage = Number(value || 0);
        if (field === 'gstPercentage') next.gstPercentage = Number(value || 0);
        calculateAmounts(next);
      }

      if (
        field === 'courseId' ||
        field === 'courseFee' ||
        field === 'noOfInstallment' ||
        field === 'initialPayment' ||
        field === 'frequency' ||
        field === 'startDate' ||
        FEE_COMPONENT_FIELDS.includes(field)
      ) {
        if (!(isEdit && field === 'noOfInstallment')) {
          generateInstallments(next);
        }
      }

      if (isEdit && field === 'noOfInstallment') {
        const count = Math.floor(Number(value));
        if (count > 0) {
          setPaymentList((prev) => {
            const result = resizeUnpaidInstallments(
              prev,
              count,
              next.frequency,
              next.startDate
            );
            if (result.appliedCount !== count) {
              next.noOfInstallment = result.appliedCount;
            }
            return result.list;
          });
        }
      }

      return next;
    });

    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const commissionRows = useMemo(
    () =>
      paymentList.map((item) => {
        const fees = Number(item.amount || 0);

        let rawCommission = 0;
        let gst = 0;

        const feeTypeKey = String(item.feeType || '').trim().toLowerCase();
        const isCommissionable = feeTypeKey
          ? feeTypeKey === 'tuition fee'
          : Number(item.installmentNo) !== 0;

        if (isCommissionable) {
          rawCommission = (fees * Number(form.commissionPercentage || 0)) / 100;
          const gstPct = Number(form.gstPercentage || 0);

          if (gstInclusive) {
            gst = rawCommission - rawCommission / (1 + gstPct / 100);
          } else {
            gst = (rawCommission * gstPct) / 100;
          }
        }

        let applyBonus = false;
        switch (form.bonusOption) {
          case 'Everytime':
            applyBonus = true;
            break;
          case 'Quarterly':
            applyBonus = item.installmentNo % 3 === 0;
            break;
          case 'HalfYearly':
            applyBonus = item.installmentNo % 6 === 0;
            break;
          case 'Yearly':
            applyBonus = item.installmentNo === paymentList.length;
            break;
          default:
            applyBonus = false;
        }

        let bonus = 0;

        // Percentage is entered in the form; the row stores the money amount. Non-tuition never gets a bonus.
        const isTuitionFee = feeTypeKey === 'tuition fee';
        if (isTuitionFee && addBonus && bonusApplied && applyBonus) {
          if (form.bonusType === 'Percentage') {
            bonus = round2((rawCommission * Number(form.bonus || 0)) / 100);
          } else if (form.bonusType === 'Fixed') {
            bonus = round2(form.bonus);
          }
        }

        const invoice = gstInclusive ? rawCommission + bonus : rawCommission + gst + bonus;

        return {
          studentPaymentInstallmentId: item.studentPaymentInstallmentId,
          installmentNo: item.installmentNo,
          feeType: item.feeType,
          feesDate: item.dueDate,
          fees: fees.toFixed(2),
          paymentStatus: item.status,
          commission: rawCommission.toFixed(2),
          gst: gst.toFixed(2),
          bonus: bonus.toFixed(2),
          invoice: invoice.toFixed(2),
          status: 'Pending',
        };
      }),
    [
      paymentList,
      form.commissionPercentage,
      form.gstPercentage,
      form.bonus,
      form.bonusType,
      form.bonusOption,
      bonusApplied,
      addBonus,
      gstInclusive,
    ]
  );

  const historyRows = useMemo(() => {
    const applyBonusEdit = (row) => {
      const feeType = row.feeType ?? row.FeeType;
      const paid = String(row.commissionHistoryOriginalStatus ?? '').trim().toLowerCase() === 'paid';
      const baseline = round2(Number(row.bonusAmount ?? row.bonus ?? 0));
      const next = { ...row, bonusBaseline: baseline };
      if (paid || row.isBonus || !isTuitionFeeType(feeType)) return next;

      const raw = bonusOverrides[bonusRowKey(row)];
      if (raw == null || raw === '') return next;

      const bonusAmount = round2(Number(raw) || 0);
      const commissionAmount = Number(row.commissionAmount ?? row.commission ?? 0);
      const gstAmount = Number(row.gstAmount ?? row.gst ?? 0);
      const invoiceAmount = round2(
        gstInclusive ? commissionAmount + bonusAmount : commissionAmount + gstAmount + bonusAmount
      );

      return {
        ...next,
        bonusAmount,
        bonus: bonusAmount.toFixed(2),
        invoiceAmount,
        invoice: invoiceAmount.toFixed(2),
      };
    };

    if (!isEdit) return commissionRows.map(applyBonusEdit);

    // Payment rows ke commission (calculated values)
    const calcById = new Map(
      commissionRows.map((r) => [Number(r.studentPaymentInstallmentId), r])
    );

    const rows = commissionHistory
      .map((h) => {
        const spiId = Number(h.studentPaymentInstallmentId ?? h.StudentPaymentInstallmentId);
        const payment = paymentList.find((p) => Number(p.studentPaymentInstallmentId) === spiId);
        const calc = calcById.get(spiId);
        const isBonus = Number(h.isBonus ?? h.IsBonus ?? 0) === 1;
        const status = h.commissionStatus ?? h.CommissionStatus ?? 'Pending';

        const storedBonus = Number(h.bonusAmount ?? h.BonusAmount ?? 0);
        const commissionAmount = isBonus
          ? Number(h.commissionAmount ?? h.CommissionAmount ?? 0)
          : Number(calc?.commission ?? h.commissionAmount ?? 0);
        const gstAmount = isBonus
          ? Number(h.gstAmount ?? h.GSTAmount ?? 0)
          : Number(calc?.gst ?? h.gstAmount ?? 0);
        const bonusAmount = isBonus || bonusFromDetail
          ? storedBonus
          : Number(calc?.bonus ?? storedBonus);
        const invoiceAmount = isBonus
          ? Number(h.invoiceAmount ?? h.InvoiceAmount ?? 0)
          : round2(
            gstInclusive
              ? commissionAmount + bonusAmount
              : commissionAmount + gstAmount + bonusAmount
          );

        return {
          ...h,
          studentPaymentInstallmentId: spiId,
          installmentNo: h.installmentNo,                 // SP se jaisa aaya waisa (0, 0.1.1, 1 ...)
          displayInstallmentNo: h.installmentNo,
          feeType: payment?.feeType ?? h.feeType ?? h.FeeType ?? null,
          isBonus,
          dueDate: payment?.dueDate ?? h.dueDate ?? h.DueDate ?? null,
          feesAmount: isBonus ? 0 : Number(calc?.fees ?? h.feesAmount ?? 0),
          paymentStatus: payment?.status ?? h.paymentStatus ?? h.PaymentStatus ?? 'Pending',
          commissionAmount,
          gstAmount,
          bonusAmount,
          invoiceAmount,
          commissionDetailId: h.commissionDetailId ?? h.CommissionDetailId,
          commissionHistoryOriginalStatus: status,
          commissionStatus: status,
        };
      })
      .filter((row) => {
        const paid = String(row.commissionHistoryOriginalStatus || '').trim().toLowerCase() === 'paid';
        const initial = Number(row.installmentNo) < 1;
        if (paid || initial || row.isBonus) return true;
        return paymentList.some(
          (item) =>
            (row.studentPaymentInstallmentId &&
              Number(item.studentPaymentInstallmentId) === Number(row.studentPaymentInstallmentId)) ||
            (Number(item.installmentNo) === Number(row.installmentNo) &&
              String(item.feeType || '').trim().toLowerCase() === String(row.feeType || '').trim().toLowerCase())
        );
      });

    const historyKey = (row) =>
      `${Number(row.installmentNo)}|${String(row.feeType || '').trim().toLowerCase()}`;
    const seen = new Set(rows.map(historyKey));

    commissionRows.forEach((calc) => {
      const key = historyKey(calc);
      const id = Number(calc.studentPaymentInstallmentId);
      if (seen.has(key)) return;
      if (id && rows.some((r) => Number(r.studentPaymentInstallmentId) === id)) return;

      const extra = {
        studentPaymentInstallmentId: calc.studentPaymentInstallmentId,
        installmentNo: calc.installmentNo,
        displayInstallmentNo: calc.installmentNo,
        feeType: calc.feeType,
        dueDate: calc.feesDate,
        feesAmount: Number(calc.fees || 0),
        paymentStatus: calc.paymentStatus,
        commissionAmount: Number(calc.commission || 0),
        gstAmount: Number(calc.gst || 0),
        bonusAmount: Number(calc.bonus || 0),
        invoiceAmount: Number(calc.invoice || 0),
        commissionStatus: 'Pending',
        commissionHistoryOriginalStatus: 'Pending',
      };

      const at = rows.findIndex((r) => Number(r.installmentNo) > Number(extra.installmentNo));
      if (at === -1) rows.push(extra);
      else rows.splice(at, 0, extra);
      seen.add(key);
    });

    rows.sort((a, b) =>
      compareInstallmentNo(
        a.displayInstallmentNo ?? a.installmentNo,
        b.displayInstallmentNo ?? b.installmentNo
      )
    );

    return rows.map(applyBonusEdit);
  }, [isEdit, paymentList, commissionHistory, commissionRows, bonusOverrides, gstInclusive, bonusFromDetail]);

  const totals = useMemo(
    () => ({
      fees: round2(historyRows.reduce((sum, x) => sum + Number(x.feesAmount ?? x.fees ?? 0), 0)),
      commission: round2(
        historyRows.reduce((sum, x) => sum + Number(x.commissionAmount ?? x.commission ?? 0), 0)
      ),
      gst: round2(historyRows.reduce((sum, x) => sum + Number(x.gstAmount ?? x.gst ?? 0), 0)),
      bonus: round2(historyRows.reduce((sum, x) => sum + Number(x.bonusAmount ?? x.bonus ?? 0), 0)),
      invoice: round2(
        historyRows.reduce((sum, x) => sum + Number(x.invoiceAmount ?? x.invoice ?? 0), 0)
      ),
    }),
    [historyRows]
  );

  const paymentTotals = useMemo(() => {
    const paidCents = paymentList.reduce((sum, row) => sum + toCents(shownPaidAmount(row)), 0);
    const feeCents = paymentList.reduce((sum, row) => sum + toCents(row.amount), 0);

    return {
      paid: centsToAmount(paidCents),
      remaining: centsToAmount(Math.max(0, feeCents - paidCents)),
      total: centsToAmount(feeCents),
    };
  }, [paymentList]);

  const hasChanges = useMemo(() => {
    if (!isEdit) return true;
    if (!savedScheduleSnapshot || !savedStudentSnapshot) return false;

    const studentNow = buildStudentSnapshot({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      folderNo: form.FolderNo,
      leadNo: form.leadNo,
      studentIdDisplay: form.studentIdDisplay,
      bonus: addBonus ? Number(form.bonus || 0) : 0,
      bonusType: form.bonusType,
      bonusOption: form.bonusOption,
      dueDate: form.dueDate,
    });

    const bonusEdited = historyRows.some(
      (row) => round2(row.bonusAmount ?? row.bonus) !== round2(row.bonusBaseline ?? row.bonusAmount ?? row.bonus)
    );

    return (
      studentNow !== savedStudentSnapshot ||
      Number(originalSchedule?.noOfInstallment) !== Number(form.noOfInstallment) ||
      buildChangeSnapshot(paymentList, commissionHistory) !== savedScheduleSnapshot ||
      bonusEdited
    );
  }, [
    isEdit,
    savedScheduleSnapshot,
    savedStudentSnapshot,
    paymentList,
    commissionHistory,
    form.fullName,
    form.email,
    form.phone,
    form.FolderNo,
    form.leadNo,
    form.studentIdDisplay,
    form.bonus,
    form.bonusType,
    form.bonusOption,
    form.dueDate,
    form.noOfInstallment,
    originalSchedule,
    addBonus,
    historyRows,
  ]);

  const getPaymentRowKey = (item) => {
    if (item.studentPaymentInstallmentId) {
      return `id-${item.studentPaymentInstallmentId}`;
    }

    return `${String(item.installmentNo)}-${String(
      item.feeType || ""
    ).trim().toLowerCase()}`;
  };
  const isRowPastDataEditable = (item) =>
    editPastDataAll || editPastDataRows.has(getPaymentRowKey(item));

  const isNewlySetPartial = (item) =>
    item.status === 'Partial' && item.originalStatus !== 'Partial';

  const isPersistedPartial = (item) =>
    item.status === 'Partial' && item.originalStatus === 'Partial';

  const isConfirmedByCollege = (item) =>
    item.status === 'ConfirmedByCollege' ||
    item.originalStatus === 'ConfirmedByCollege' ||
    item.originalStatus === 'PaidByCollege';

  const canEditPaidFields = (item) => {
    if (!isEdit) return false;
    if (!item.studentPaymentInstallmentId) return true;

    if (isConfirmedByCollege(item)) { return isRowPastDataEditable(item); }
    if (isPersistedPartial(item)) { return isRowPastDataEditable(item); }
    if (isNewlySetPartial(item)) return true; return isRowPastDataEditable(item);
  };

  const canEditPartialFee = (item) => {
    if (!item) return false;
    if (String(item.originalStatus || '').toLowerCase() === 'partial') return false;
    return String(item.status || '').toLowerCase() === 'partial';
  };

  const canEditFees = (item) => {
    if (isPaidLike(item.status) || isConfirmedByCollege(item)) return false;

    return !isEdit || isRowPastDataEditable(item) || canEditPartialFee(item);
  };

  const canEditStatus = (index) => {
    const item = paymentList[index];
    const isRootOfGroup = item.installmentNo === getGroupNo(item);

    if (!isRootOfGroup) return true;
    if (index === 0) return true;

    const prevStatus = paymentList[index - 1]?.status;
    return isPaidLike(prevStatus) || prevStatus === 'Partial';
  };

  const isStatusDisabled = (item, groupComplete, isLastOfGroup) => {
    // Pending row hamesha editable rahe
    if (item.status === 'Pending' && (!item.originalStatus || item.originalStatus === 'Pending')) {
      return false;
    }

    return (
      (item.originalStatus &&
        item.originalStatus !== 'Pending' &&
        !isRowPastDataEditable(item)) ||
      item.originalStatus === 'ConfirmedByCollege' ||
      item.originalStatus === 'PaidByCollege' ||
      (isPersistedPartial(item) && !isRowPastDataEditable(item)) ||
      (groupComplete &&
        !isLastOfGroup &&
        !isPaidLike(item.status) &&
        item.status !== 'Partial' &&
        !isRowPastDataEditable(item))
    );
  };

  const canEditCommissionStatus = (row) => {
    const sortedRows = historyRows;
    const currentIndex = sortedRows.findIndex((x) => x.commissionDetailId === row.commissionDetailId);

    if (currentIndex <= 0) return true;

    const previous = sortedRows[currentIndex - 1];
    return String(previous?.commissionStatus ?? '').toLowerCase() === 'paid';
  };

  const toggleRowPastData = (item) => {
    const rowKey = getPaymentRowKey(item);

    setEditPastDataRows((prev) => {
      const next = new Set(prev);

      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }

      return next;
    });
  };

  const handleFeeAmountChange = (item, value) => {
    setPaymentList((prev) => {
      let updated = prev.map((x) => ({ ...x }));

      const currentIndex = updated.findIndex(
        (x) =>
          String(x.installmentNo) === String(item.installmentNo) &&
          String(x.feeType).toLowerCase() === String(item.feeType).toLowerCase()
      );
      if (currentIndex === -1) return prev;

      const currentItem = updated[currentIndex];

      if (!isEdit) {
        const feeType = String(currentItem.feeType || '').trim().toLowerCase();
        const followerIndexes = [];
        for (let i = currentIndex + 1; i < updated.length; i += 1) {
          const row = updated[i];
          if (String(row.feeType || '').trim().toLowerCase() !== feeType) continue;
          if (!isScheduledInstallment(row)) continue;
          followerIndexes.push(i);
        }

        let typedCents = toCents(value);
        if (typedCents < 0) typedCents = 0;

        const setFee = (row, cents) => {
          const amount = centsToAmount(cents);
          return {
            ...row,
            amount,
            balance: amount,
            originalAmount: Number(amount),
            autoPartial: false,
          };
        };

        if (followerIndexes.length > 0) {
          const poolCents =
            toCents(currentItem.amount) +
            followerIndexes.reduce((sum, i) => sum + toCents(updated[i].amount), 0);
          if (typedCents > poolCents) typedCents = poolCents;
          const shares = splitCents(poolCents - typedCents, followerIndexes.length);
          followerIndexes.forEach((index, shareIndex) => {
            updated[index] = setFee(updated[index], shares[shareIndex] ?? 0);
          });
        }

        updated[currentIndex] = setFee(currentItem, typedCents);
        return updated;
      }

      // This row plus the leftover rows already split from it (0.1, 2.1, ...) is the
      // ceiling. A smaller amount keeps the difference on the next row. A larger
      // amount is not applied, and going back to the full amount removes that row.
      const currentFeeType = String(currentItem.feeType || '').trim().toLowerCase();
      const childIndexes = [];
      for (let i = currentIndex + 1; i < updated.length; i++) {
        const row = updated[i];
        if (isScheduledInstallment(row) || isPaidLike(row.status)) break;
        if (String(row.feeType || '').trim().toLowerCase() !== currentFeeType) continue;
        childIndexes.push(i);
      }

      const poolCents =
        toCents(currentItem.amount) +
        childIndexes.reduce((sum, i) => sum + toCents(updated[i].amount), 0);
      let typedCents = toCents(value);
      if (typedCents > poolCents) typedCents = poolCents;
      if (typedCents < 0) typedCents = 0;

      const cappedAmount = centsToAmount(typedCents);
      const reduced = typedCents < poolCents;
      let nextStatus = currentItem.status;
      let nextPaid = currentItem.paidAmount;
      let nextBalance = cappedAmount;
      let nextPaidDate = currentItem.paidDate;
      let nextAuto = currentItem.autoPartial;

      if (isEdit && !isPaidLike(currentItem.status)) {
        if (currentItem.autoPartial && !reduced) {
          nextStatus = 'Pending';
          nextAuto = false;
          nextPaid = '0.00';
          nextBalance = cappedAmount;
          nextPaidDate = null;
        } else if (reduced && (currentItem.status === 'Pending' || currentItem.autoPartial)) {
          nextStatus = 'Partial';
          nextAuto = true;
          nextPaid = cappedAmount;
          nextBalance = '0.00';
          nextPaidDate = currentItem.paidDate || todayIso();
        } else if (currentItem.status === 'Partial') {
          nextPaid = cappedAmount;
          nextBalance = '0.00';
        }
      }

      updated[currentIndex] = {
        ...currentItem,
        amount: cappedAmount,
        originalAmount: Number(centsToAmount(poolCents)),
        balance: nextBalance,
        status: nextStatus,
        paidAmount: nextPaid,
        paidDate: nextPaidDate,
        autoPartial: nextAuto,
      };

      const remainderCents = poolCents - typedCents;
      const remainderText = centsToAmount(remainderCents);

      if (remainderCents > 0 && childIndexes.length === 0) {
        const rootNo = Number(currentItem.parentGroupNo ?? currentItem.installmentNo ?? 0);
        let n = 1;
        let childNo = Number((rootNo + n / 10).toFixed(2));
        while (
          updated.some(
            (x) => Number(x.installmentNo) === childNo && isSameFeeType(x, currentItem)
          )
        ) {
          n += 1;
          childNo = Number((rootNo + n / 10).toFixed(2));
        }

        updated.splice(currentIndex + 1, 0, {
          installmentNo: childNo,
          parentInstallmentNo: currentItem.installmentNo,
          parentGroupNo: rootNo,
          feeType: currentItem.feeType,
          dueDate: currentItem.dueDate,
          amount: remainderText,
          paidAmount: '0.00',
          balance: remainderText,
          status: 'Pending',
          originalStatus: 'Pending',
        });
      } else if (remainderCents > 0) {
        const first = childIndexes[0];
        const firstRow = updated[first];
        const childPartial = firstRow.status === 'Partial';
        updated[first] = {
          ...firstRow,
          amount: remainderText,
          balance: childPartial ? '0.00' : remainderText,
          paidAmount: childPartial ? remainderText : '0.00',
        };

        const drop = new Set(childIndexes.slice(1));
        if (drop.size > 0) {
          updated = updated.filter((_, index) => !drop.has(index));
        }
      } else if (childIndexes.length > 0) {
        const drop = new Set(childIndexes);
        updated = updated.filter((_, index) => !drop.has(index));
      }

      if (nextStatus === 'Partial') {
        updated = pendingRowsBelow(updated, updated[currentIndex]);
      }

      return updated;
    });
  };

  const handlePaidDateChange = (item, value) => {
    setPaymentList((prev) =>
      prev.map((x) =>
        isSamePaymentRow(x, item)
          ? { ...x, paidDate: value }
          : x
      )
    );
  };

  const handleDueDateChange = (item, value) => {
    manualDueDatesRef.current.set(
      `${String(item.installmentNo)}|${String(item.feeType || '').trim().toLowerCase()}`,
      value
    );
    setPaymentList((prev) =>
      prev.map((x) =>
        isSamePaymentRow(x, item)
          ? { ...x, dueDate: value }
          : x
      )
    );
  };

  const handleStatusChange = (item, value) => {
    if (value === 'ConfirmedByStudent') {
      setConfirmTargetInstallment(item);
      setConfirmDialogOpen(true);
    }

    setPaymentList((prev) => {
      let updated = prev.map((x) => {
        if (!isSamePaymentRow(x, item)) return x;

        const isPaid = isPaidLike(value);
        const isPartial = value === 'Partial';
        const paidLikeAmount =
          hasSplitChild(prev, x) && Number(x.paidAmount) > 0
            ? x.paidAmount
            : x.amount;

        return {
          ...x,
          status: value,
          originalAmount: isPartial ? x.originalAmount ?? x.amount : x.originalAmount,
          paidAmount: isPaid ? paidLikeAmount : isPartial ? x.paidAmount || '0.00' : '0.00',
          balance: isPaid ? '0.00' : isPartial ? x.balance : x.amount,
          paidDate: isPaid || isPartial ? x.paidDate || todayIso() : null,
        };
      });

      if (value === 'Partial') {
        updated = pendingRowsBelow(updated, item);
      }

      if (value !== 'Partial') {
        // Only a row leaving Partial gets its pre-split amount back; split children carry
        // originalAmount 0 and fee-edited rows carry a baseline, neither of which is a restore target.
        const wasPartial = item.status === 'Partial';

        if (wasPartial) {
          const existingChild = updated.find(
            (x) =>
              x.parentInstallmentNo === item.installmentNo &&
              isSameFeeType(x, item) &&
              !x.studentPaymentInstallmentId
          );

          if (existingChild) {
            updated = updated.filter((x) => x !== existingChild);
          }

          updated = updated.map((x) => {
            if (!isSamePaymentRow(x, item)) return x;

            const restoredAmount =
              Number(x.originalAmount) > 0 ? Number(x.originalAmount).toFixed(2) : x.amount;

            return {
              ...x,
              amount: restoredAmount,
              balance: isPaidLike(value) ? '0.00' : restoredAmount,
              paidAmount: isPaidLike(value) ? restoredAmount : '0.00',
              originalAmount: undefined,
            };
          });
        }
      }

      return updated;
    });

    setCommissionHistory((prev) =>
      prev.map((x) => {
        if (isCommissionOfPaymentRow(x, item)) {
          return { ...x, paymentStatus: value };
        }
        if (
          (value === 'Pending' || value === 'Partial') &&
          Number(x.installmentNo) > Number(item.installmentNo)
        ) {
          return { ...x, paymentStatus: 'Pending' };
        }
        return x;
      })
    );
  };

  const handleCommissionStatusChange = (row, value) => {
    const currentCommissionDetailId = Number(row.commissionDetailId ?? row.CommissionDetailId);

    setCommissionHistory((prev) =>
      prev.map((x) => {
        const commissionDetailId = Number(x.commissionDetailId ?? x.CommissionDetailId);
        return commissionDetailId === currentCommissionDetailId
          ? { ...x, commissionStatus: value }
          : x;
      })
    );
  };

  const handleConfirmedByStudent = (installment, documentUrl) => {
    setPaymentList((prev) => {
      let updated = prev;
      const leftoverChild = updated.find(
        (x) =>
          x.parentInstallmentNo === installment.installmentNo &&
          isSameFeeType(x, installment) &&
          !x.studentPaymentInstallmentId
      );

      if (leftoverChild) {
        updated = updated.filter((x) => x !== leftoverChild);
      }

      return updated.map((x) => {
        if (!isSamePaymentRow(x, installment)) return x;

        const paidLikeAmount = hasSplitChild(updated, x) && Number(x.paidAmount) > 0
          ? x.paidAmount
          : Number(x.originalAmount) > 0
            ? Number(x.originalAmount).toFixed(2)
            : Number(x.amount || 0).toFixed(2);

        return {
          ...x,
          amount: hasSplitChild(updated, x) ? x.amount : paidLikeAmount,
          status: 'ConfirmedByStudent',
          paidAmount: paidLikeAmount,
          balance: '0.00',
          paidDate: x.paidDate || todayIso(),
          documentUrl,
          originalAmount: hasSplitChild(updated, x) ? x.originalAmount : undefined,
        };
      });
    });

    setCommissionHistory((prev) =>
      prev.map((x) =>
        isCommissionOfPaymentRow(x, installment)
          ? { ...x, paymentStatus: 'ConfirmedByStudent' }
          : x
      )
    );

    setConfirmDialogOpen(false);
    setConfirmTargetInstallment(null);
  };

  const handleApplyBonus = () => {
    if (!form.bonus || Number(form.bonus) <= 0) {
      alert('Please enter Bonus.');
      return;
    }
    setBonusOverrides({});
    setBonusFromDetail(false);
    setBonusApplied(true);
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;


    if (!isEdit && (!form.courseFee || Number(form.courseFee) <= 0)) {
      setError('Course Fee cannot be zero. Please enter fee details before saving.');
      return;
    }

    if (!form.noOfInstallment || Number(form.noOfInstallment) <= 0) {
      setError('Please enter Number of Installments before saving the student.');
      return;
    }

    const invalidPartialRow = paymentList.find((x) => {
      if (x.status !== 'Partial') return false;
      if (!x.paidAmount || Number(x.paidAmount) <= 0) return true;

      // Partial is only valid after the fee is reduced and the remainder sits on the next row.
      const baseline = Number(x.originalAmount);
      const feeNotReduced =
        !hasSplitChild(paymentList, x) &&
        (!(baseline > 0) || Number(x.amount) + EPSILON >= baseline);
      return feeNotReduced;
    });
    if (invalidPartialRow) {
      setError(
        `Installment ${invalidPartialRow.isInitialPayment ? 'Initial Payment' : invalidPartialRow.installmentNo
        } is marked "Partial", but the amount has not been changed. Please update the amount before saving.`
      );
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    const totalInstallmentCount = Number(form.noOfInstallment || 0);
    const totalScheduledAmount = Number(form.courseFee || 0);

    try {
      let scheduleId;
      let commissionId;
      let scheduleChanged = false;

      if (!isEdit) {
        const student = await createStudentWithPaymentSchedule(buildStudentPayload());
        const studentId = student.studentId ?? student.StudentId;

        const schedule = await createPaymentSchedule({
          studentId,
          totalCourseFee: totalScheduledAmount,
          noOfInstallments: totalInstallmentCount,
          frequency: form.frequency,
          firstDueDate: form.startDate,
        });

        scheduleId = schedule.scheduleId ?? schedule.ScheduleId;

        const commission = await createStudentCommission({
          scheduleId,
          commissionPercentage: Number(form.commissionPercentage),
          gstPercentage: Number(form.gstPercentage),
          commissionAmount: Number(form.commissionAmount || 0),
          gstAmount: Number(form.gstAmount || 0),
          bonus: addBonus ? Number(form.bonus) : 0,
          bonusType: addBonus ? form.bonusType : null,
          bonusOption: addBonus ? form.bonusOption : null,
          dueDate: form.dueDate || null,
        });

        commissionId = commission.commissionId ?? commission.CommissionId;

        for (const contract of contracts) {
          if (contract.contractId) continue;

          try {
            await createStudentContract({
              studentId,
              status: contract.status,
              referenceNo: contract.referenceNo,
              fileUrl: contract.fileUrl,
              fileName: contract.fileName,
              startDate: contract.startDate || null,
              endDate: contract.endDate || null,
              notes: contract.notes,
            });
          } catch (err) {
            console.warn('Failed to save contract', err);
          }
        }
      } else {
        const persistedRows = paymentList.filter((x) => x.studentPaymentInstallmentId);

        scheduleChanged =
          originalSchedule.noOfInstallment !== totalInstallmentCount ||
          originalSchedule.frequency !== form.frequency ||
          originalSchedule.startDate !== form.startDate;

        const rowsForSave = scheduleChanged ? paymentList : persistedRows;

        await saveStudentEnrollmentNumber(form.studentId, form);

        const result = await updateStudentPaymentSchedule({
          studentId: form.studentId,
          fullName: String(form.fullName ?? '').trim(),
          email: String(form.email ?? '').trim(),
          noOfInstallments: totalInstallmentCount,
          frequency: form.frequency,
          firstDueDate: form.startDate,
          phone: form.phone ?? '',
          folderNo: String(form.FolderNo ?? ''),
          leadNo: String(form.leadNo ?? ''),
          bonus: addBonus ? Number(form.bonus || 0) : 0,
          bonusType: addBonus ? form.bonusType ?? null : null,
          bonusOption: addBonus ? form.bonusOption ?? null : null,
          dueDate: form.dueDate || null,
          paymentList: rowsForSave.map((x) => ({
            studentPaymentInstallmentId: x.studentPaymentInstallmentId || 0,
            installmentNo: String(x.installmentNo ?? x.apiInstallmentNo ?? ''),
            parentInstallmentId:
              x.parentInstallmentId ??
              (x.parentInstallmentNo != null
                ? paymentList.find(
                  (row) => row.installmentNo === x.parentInstallmentNo && isSameFeeType(row, x)
                )?.studentPaymentInstallmentId ?? null
                : null),
            dueDate: x.dueDate || null,
            feesAmount: Number(x.amount || 0),
            paymentStatus: x.status,
            paidAmount: Number(x.paidAmount || 0),
            balanceAmount: Number(x.balance || 0),
            paidDate: x.paidDate || null,
            installmentImage: x.documentUrl ?? x.installmentImage ?? null,
            feeType: x.feeType ?? null,
          })),
          commissionHistory: historyRows
            .filter((r) => r.commissionDetailId)
            .map((r) => {
              const isAlreadyPaid =
                String(r.commissionHistoryOriginalStatus ?? '').trim().toLowerCase() === 'paid';

              const original = commissionHistory.find(
                (x) =>
                  Number(x.commissionDetailId ?? x.CommissionDetailId) ===
                  Number(r.commissionDetailId)
              );

              const source =
                isAlreadyPaid && original
                  ? {
                    commissionAmount: original.commissionAmount,
                    gstAmount: original.gstAmount,
                    bonusAmount: original.bonusAmount,
                    invoiceAmount: original.invoiceAmount,
                  }
                  : r;

              return {
                CommissionDetailId: r.commissionDetailId,
                CommissionAmount: Number(source.commissionAmount ?? 0),
                GSTAmount: Number(source.gstAmount ?? 0),
                BonusAmount: Number(source.bonusAmount ?? 0),
                InvoiceAmount: Number(source.invoiceAmount ?? 0),
                CommissionStatus: r.commissionStatus ?? 'Pending',
              };
            }),
        });

        scheduleId = result.scheduleId;
        commissionId = result.commissionId;
      }

      if (!isEdit) {
        const installmentIds = [];

        for (const item of paymentList) {
          if (isEdit && isPaidLike(item.status)) continue;

          const installment = await createStudentPaymentInstallment({
            scheduleId,
            installmentNo: String(item.installmentNo ?? ''),
            parentInstallmentId: item.parentInstallmentNo != null
              ? paymentList.find(
                (x) => x.installmentNo === item.parentInstallmentNo && isSameFeeType(x, item)
              )?.studentPaymentInstallmentId ?? null
              : null,
            dueDate: item.dueDate,
            feesAmount: Number(item.amount),
            paidAmount: Number(item.paidAmount),
            balanceAmount: Number(item.balance),
            paymentStatus: item.status,
            paidDate: item.paidDate || null,
            documentUrl: item.documentUrl ?? null,
            feeType: item.feeType ?? null,
          });

          installmentIds.push(
            installment.studentPaymentInstallmentId ?? installment.StudentPaymentInstallmentId
          );
        }

        let index = 0;

        for (const row of historyRows) {
          if (isEdit && isPaidLike(row.paymentStatus)) continue;

          await createStudentCommissionDetail({
            commissionId,
            studentPaymentInstallmentId: installmentIds[index],
            commissionAmount: Number(row.commission),
            gstAmount: Number(row.gst),
            bonusAmount: Number(row.bonus),
            invoiceAmount: Number(row.invoice),
            invoiceNo: null,
            receivedDate: null,
            commissionStatus: row.status,
            remark: form.remark ?? '',
          });

          index++;
        }
      }

      if (isEdit && !scheduleChanged) {
        const newSplitRows = paymentList.filter((x) => !x.studentPaymentInstallmentId);

        const rowKey = (installmentNo, feeType) => `${installmentNo}|${feeType ?? ''}`;

        const idByInstallmentNo = new Map(
          paymentList
            .filter((x) => x.studentPaymentInstallmentId)
            .map((x) => [rowKey(x.installmentNo, x.feeType), x.studentPaymentInstallmentId])
        );

        const sortedNewSplitRows = [...newSplitRows].sort((a, b) => a.installmentNo - b.installmentNo);

        for (const item of sortedNewSplitRows) {
          // Parent can be the Initial Payment (installment 0), so check for null rather than truthiness.
          const parentId =
            item.parentInstallmentNo != null
              ? idByInstallmentNo.get(rowKey(item.parentInstallmentNo, item.feeType)) ?? null
              : null;

          const installment = await createStudentPaymentInstallment({
            scheduleId,
            installmentNo: String(item.installmentNo),
            parentInstallmentId: parentId,
            dueDate: item.dueDate,
            feesAmount: Number(item.amount),
            paidAmount: Number(item.paidAmount || 0),
            balanceAmount: Number(item.balance ?? item.amount),
            paymentStatus: item.status,
            paidDate: item.paidDate || null,
            documentUrl: item.documentUrl ?? null,
            feeType: item.feeType ?? null,
          });

          const newInstallmentId =
            installment.studentPaymentInstallmentId ?? installment.StudentPaymentInstallmentId;

          idByInstallmentNo.set(rowKey(item.installmentNo, item.feeType), newInstallmentId);

          const row = historyRows.find((x) => isSamePaymentRow(x, item));

          if (row) {
            await createStudentCommissionDetail({
              commissionId,
              studentPaymentInstallmentId: newInstallmentId,
              commissionAmount: Number(row.commission),
              gstAmount: Number(row.gst),
              bonusAmount: Number(row.bonus),
              invoiceAmount: Number(row.invoice),
              invoiceNo: null,
              receivedDate: null,
              commissionStatus: row.status,
              remark: form.remark ?? '',
            });
          }
        }
      }

      alert(isEdit ? 'Student updated successfully.' : 'Student created successfully.');

      setForm(getEmptyForm(basePath));
      setPaymentList([]);
      setCourses([]);
      setBonusApplied(false);
      setAddBonus(false);
      setGstPercentage(0);
      setContracts([]);

      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to save student.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const openAddContract = () => {
    setEditingContractKey(null);
    setContractForm({
      ...getEmptyContractForm(),
      startDate: form.courseStartDate || '',
      endDate: form.courseEndDate || '',
    });
    setContractDialogOpen(true);
  };

  const openEditContract = (contract, index) => {
    setEditingContractKey(contract.contractId ?? `local-${index}`);
    setContractForm({
      status: contract.status || 'Active',
      referenceNo: contract.referenceNo || '',
      fileUrl: contract.fileUrl || '',
      fileName: contract.fileName || '',
      startDate: contract.startDate?.substring(0, 10) || '',
      endDate: contract.endDate?.substring(0, 10) || '',
      notes: contract.notes || '',
    });
    setContractDialogOpen(true);
  };

  const closeContractDialog = () => {
    if (contractSaving || contractUploading) return;
    setContractDialogOpen(false);
    setEditingContractKey(null);
  };

  const updateContractField = (field, value) => {
    setContractForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleContractFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const studentId = form?.studentId;
    if (!studentId) {
      alert('Please save the student first (Student Details tab), then upload contract files here.');
      if (contractFileInputRef.current) contractFileInputRef.current.value = '';
      return;
    }

    setContractUploading(true);
    try {
      const result = await uploadStudentContractFile(studentId, file);
      updateContractField('fileUrl', result?.fileUrl ?? '');
      updateContractField('fileName', result?.fileName ?? file.name);
    } catch (err) {
      alert(err.message || 'Failed to upload file.');
    } finally {
      setContractUploading(false);
      if (contractFileInputRef.current) contractFileInputRef.current.value = '';
    }
  };

  const handleSaveContract = async () => {
    if (!contractForm.status) {
      alert('Please select a contract status.');
      return;
    }

    setContractSaving(true);

    try {
      const payload = {
        status: contractForm.status,
        referenceNo: contractForm.referenceNo,
        fileUrl: contractForm.fileUrl,
        fileName: contractForm.fileName,
        startDate: contractForm.startDate || null,
        endDate: contractForm.endDate || null,
        notes: contractForm.notes,
      };

      if (form.studentId) {
        if (editingContractKey && typeof editingContractKey === 'number') {
          const updated = await updateStudentContract(editingContractKey, {
            ...payload,
            studentId: form.studentId,
          });
          setContracts((prev) =>
            prev.map((c) => (c.contractId === editingContractKey ? updated : c))
          );
        } else {
          const created = await createStudentContract({ ...payload, studentId: form.studentId });

          setContracts((prev) => {
            if (editingContractKey) {
              const idx = Number(String(editingContractKey).replace('local-', ''));
              return prev.map((c, i) => (i === idx ? created : c));
            }
            return [...prev, created];
          });
        }
      } else {
        setContracts((prev) => {
          if (editingContractKey && String(editingContractKey).startsWith('local-')) {
            const idx = Number(String(editingContractKey).replace('local-', ''));
            return prev.map((c, i) => (i === idx ? { ...c, ...payload } : c));
          }
          return [...prev, { contractId: null, ...payload }];
        });
      }

      setContractDialogOpen(false);
      setEditingContractKey(null);
    } catch (err) {
      alert(err.message || 'Failed to save contract.');
    } finally {
      setContractSaving(false);
    }
  };

  const handleDeleteContract = async (contract, index) => {
    if (!window.confirm('Delete this contract?')) return;

    try {
      if (contract.contractId) {
        await deleteStudentContract(contract.contractId, form.studentId);
      }
      setContracts((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      alert(err.message || 'Failed to delete contract.');
    }
  };

  if (id && !/^\d+$/.test(String(id))) {
    let raw = String(id);
    try {
      raw = decodeURIComponent(raw);
    } catch {
      raw = String(id);
    }
    const fromInstituteLink = /^institute=/i.test(raw);
    return (
      <Navigate
        to="/students"
        replace
        state={
          fromInstituteLink
            ? { instituteName: raw.replace(/^institute=/i, ''), fromInstitute: true }
            : null
        }
      />
    );
  }

  if (!resource) return null;

  return (
    <FormPageLayout
      title={isEdit ? `Edit ${resource.singular}` : `Add new ${resource.singular.toLowerCase()}`}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {(error || loadError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || loadError}
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="Student Details" sx={tabSx} />
          <Tab label="Payment Schedule" sx={tabSx} />
          <Tab label="Commission" sx={tabSx} />
          <Tab label="Offer Letter" sx={tabSx} />
        </Tabs>

        {activeTab === 0 && (
          <FormSectionsLayout
            sections={[resource.sections[0]]}
            form={form}
            onChange={updateField}
            selectOptions={selectOptions}
            requiredFields={resource.requiredFields}
            disabled={false}
            disabledFields={isEdit ? ['fullName', 'email'] : []}
          />
        )}

        {activeTab === 1 && (
          <>
            <FormSectionsLayout
              sections={[resource.sections[1]]}
              form={form}
              onChange={updateField}
              selectOptions={selectOptions}
              requiredFields={resource.requiredFields}
              disabled={isEdit}
              disabledFields={['assignment', ...(!form.instituteId ? ['campusname'] : [])]}
              fieldDefsOverride={{
                ...(instituteLocked ? { instituteId: { readOnly: true } } : {}),
                ...(isEdit ? {} : { courseEndDate: { readOnly: false } }),
              }}
            />

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                mb: 3,
                borderColor: 'divider',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
                Course Cost
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Fee breakdown for the selected course
              </Typography>

              <TableContainer
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fc' }}>
                      <TableCell sx={headerCellSx}>Description</TableCell>
                      <TableCell align="right" sx={{ ...headerCellSx, width: 220 }}>
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {FEE_TYPES.map(({ key, label, amountField }, idx) => (
                      <TableRow
                        key={key}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbfd',
                          '&:hover': { backgroundColor: '#f2f5fa' },
                          '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500, py: 1.25 }}>{label}</TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={form[amountField] ?? 0}
                            onChange={(e) => updateField(amountField, e.target.value)}
                            disabled={isEdit || amountField === 'tuitionFee'}
                            inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                            InputProps={{
                              startAdornment: (
                                <Typography sx={{ color: 'text.secondary', mr: 0.5 }}>$</Typography>
                              ),
                            }}
                            sx={amountFieldSx}
                          />
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow sx={{ backgroundColor: '#eef1f8' }}>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Total course fees due</TableCell>
                      <TableCell align="right" sx={{ py: 1.25 }}>
                        <TextField
                          size="small"
                          value={form.courseFee ?? 0}
                          disabled
                          InputProps={{
                            startAdornment: (
                              <Typography sx={{ color: 'text.secondary', mr: 0.5, fontWeight: 700 }}>
                                $
                              </Typography>
                            ),
                          }}
                          inputProps={{ style: { textAlign: 'right', fontWeight: 700 } }}
                          sx={amountFieldSx}
                        />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ fontWeight: 500, py: 1.25 }}>
                        Initial Payment (Upfront)
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={form.initialPayment ?? ''}
                          onChange={(e) => updateField('initialPayment', e.target.value)}
                          disabled={isEdit}
                          inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                          InputProps={{
                            startAdornment: (
                              <Typography sx={{ color: 'text.secondary', mr: 0.5 }}>$</Typography>
                            ),
                          }}
                          sx={amountFieldSx}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Box sx={{ height: 48 }} />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                Student Payment List
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ '& .MuiTableCell-root': { fontWeight: 700 } }}>
                    <TableRow>
                      <TableCell>Installment</TableCell>
                      <TableCell>Fee Type</TableCell>
                      <TableCell>Fees</TableCell>
                      <TableCell>Fees Date</TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={editPastDataAll}
                              disabled={!isEdit}
                              onChange={(e) => {
                                setEditPastDataAll(e.target.checked);
                                if (e.target.checked) setEditPastDataRows(new Set());
                              }}
                            />
                          }
                          label="Paid"
                          sx={{ m: 0 }}
                        />
                      </TableCell>
                      <TableCell>Paid Date</TableCell>
                      <TableCell>Payment Status</TableCell>
                      <TableCell>Paid Amount</TableCell>
                      <TableCell>Document</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {paymentList.length > 0 ? (
                      paymentList.map((item, index) => {
                        const groupNo = getGroupNo(item);
                        const groupComplete = isGroupFullyCovered(paymentList, groupNo);
                        const isLastOfGroup = isLastInGroup(paymentList, groupNo, item);

                        return (
                          <TableRow key={`${item.installmentNo}-${item.feeType}-${index}`}>
                            <TableCell>
                              {item.isInitialPayment ? 'Initial Payment' : item.installmentNo}
                            </TableCell>

                            <TableCell>{item.feeType || '-'}</TableCell>

                            <TableCell>
                              {canEditFees(item) ? (
                                <TextField
                                  size="small"
                                  type="text"
                                  value={
                                    feeDraft?.key === getPaymentRowKey(item)
                                      ? feeDraft.text
                                      : (item.amount ?? '')
                                  }
                                  onFocus={(e) => {
                                    setFeeDraft({
                                      key: getPaymentRowKey(item),
                                      text: String(item.amount ?? ''),
                                      maxCents: isEdit
                                        ? feeRemainderPoolCents(paymentList, item)
                                        : createFeePoolCents(paymentList, item),
                                    });
                                    e.target.select();
                                  }}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    if (!(next === '' || /^\d*\.?\d{0,2}$/.test(next))) return;

                                    const rowKey = getPaymentRowKey(item);
                                    const maxCents =
                                      feeDraft?.key === rowKey
                                        ? feeDraft.maxCents
                                        : isEdit
                                          ? feeRemainderPoolCents(paymentList, item)
                                          : createFeePoolCents(paymentList, item);
                                    const text =
                                      next !== '' && toCents(next) > maxCents
                                        ? centsToAmount(maxCents)
                                        : next;

                                    setFeeDraft({
                                      key: rowKey,
                                      text,
                                      maxCents,
                                    });

                                    if (text !== '' && text !== '.') {
                                      handleFeeAmountChange(item, text);
                                    }
                                  }}
                                  onBlur={() => {
                                    const rowKey = getPaymentRowKey(item);
                                    if (feeDraft?.key === rowKey) {
                                      handleFeeAmountChange(
                                        item,
                                        feeDraft.text === '' ? '0' : feeDraft.text
                                      );
                                    }
                                    setFeeDraft(null);
                                  }}
                                  inputProps={{ inputMode: 'decimal' }}
                                  sx={{ width: 110 }}
                                />
                              ) : (
                                item.amount
                              )}
                            </TableCell>

                            <TableCell>
                              {canEditFees(item) ? (
                                <TextField
                                  size="small"
                                  type="date"
                                  value={(item.dueDate || '').slice(0, 10)}
                                  onChange={(e) => handleDueDateChange(item, e.target.value)}
                                  sx={{ width: 140 }}
                                />
                              ) : (
                                formatDateCell(item.dueDate)
                              )}
                            </TableCell>

                            <TableCell>
                              <Checkbox
                                size="small"
                                checked={isRowPastDataEditable(item)}
                                disabled={!isEdit || editPastDataAll || item.status !== "Pending"}
                                onChange={() => toggleRowPastData(item)}
                              />
                            </TableCell>

                            <TableCell>
                              {canEditPaidFields(item) ? (
                                <TextField
                                  size="small"
                                  type="date"
                                  value={item.paidDate || ''}
                                  onChange={(e) => handlePaidDateChange(item, e.target.value)}
                                  sx={{ width: 140 }}
                                />
                              ) : (
                                formatDateCell(item.paidDate) || '-'
                              )}
                            </TableCell>

                            <TableCell>
                              {isEdit ? (
                                <Select
                                  size="small"
                                  value={item.status}
                                  disabled={isStatusDisabled(item, groupComplete, isLastOfGroup)}
                                  onChange={(e) => handleStatusChange(item, e.target.value)}
                                  MenuProps={menuProps}
                                  sx={statusSelectSx}
                                >
                                  <MenuItem value="Pending">Pending</MenuItem>
                                  <MenuItem value="Partial" disabled={!canEditStatus(index)}>  Partial </MenuItem>
                                  <MenuItem
                                    value="ConfirmedByCollege"
                                    disabled={!(canEditStatus(index) || (groupComplete && isLastOfGroup))}
                                  >
                                    Confirmed by College
                                  </MenuItem>
                                  <MenuItem
                                    value="ConfirmedByStudent"
                                    disabled={!(canEditStatus(index) || (groupComplete && isLastOfGroup))}
                                  > Confirmed by Student  </MenuItem>
                                </Select>
                              ) : (
                                item.status
                              )}
                            </TableCell>

                            <TableCell>{shownPaidAmount(item).toFixed(2)}</TableCell>

                            <TableCell>
                              {item.documentUrl ? (
                                <Button
                                  size="small" variant="outlined"
                                  onClick={() => window.open(item.documentUrl, '_blank')}
                                  sx={{ textTransform: 'none' }}
                                > View </Button>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          No Payment Schedule
                        </TableCell>
                      </TableRow>
                    )}
                    {paymentList.length > 0 && (
                      <>
                        <TableRow sx={{ height: 55 }}>
                          <TableCell />
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <b>Total Paid Amount:</b>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <b>{paymentTotals.paid}</b>
                          </TableCell>
                          <TableCell colSpan={6} />
                        </TableRow>
                        <TableRow sx={{ height: 55 }}>
                          <TableCell
                            sx={{
                              verticalAlign: 'middle',
                              padding: '4px 8px',
                              width: 140,
                            }}
                          >
                         {isEdit && (
  <TextField
    size="small"
    label="Installments"
    value={installmentCountDraft}
    disabled={installmentsLocked}
    onChange={(e) => {
      const next = e.target.value;

      if (next !== '' && !/^\d+$/.test(next)) return;

      setInstallmentCountDraft(next);
      if (installmentResizeTimer.current) clearTimeout(installmentResizeTimer.current);
      const count = Number(next);
      if (count >= 1 && count !== Number(form.noOfInstallment)) {
        installmentResizeTimer.current = setTimeout(() => {
          updateField('noOfInstallment', String(count));
        }, 400);
      }
    }}
    onBlur={() => {
      if (installmentResizeTimer.current) clearTimeout(installmentResizeTimer.current);
      const count = Math.floor(Number(installmentCountDraft));
      if (!count || count < 1) {
        setInstallmentCountDraft(String(form.noOfInstallment ?? ''));
        return;
      }
      if (count !== Number(form.noOfInstallment)) {
        updateField('noOfInstallment', String(count));
      }
    }}
    inputProps={{
      inputMode: 'numeric',
      min: 1,
    }}
    sx={{
      width: 125,

      '& .MuiOutlinedInput-root': {
        height: 42,
        borderRadius: 1.5,
      },

      '& .MuiInputBase-input': {
        fontWeight: 600,
        fontSize: '0.85rem',
        padding: '8px 10px',
      },

     '& .MuiInputLabel-root.Mui-focused': {
  fontWeight: 700,
},
    }}
  />
)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <b>Total Remaining Amount:</b>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <b>{paymentTotals.remaining}</b>
                          </TableCell>
                          <TableCell colSpan={6} />
                        </TableRow>
                        <TableRow sx={{ height: 55 }}>
                          <TableCell />
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <b>Total:</b>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <b>{paymentTotals.total}</b>
                          </TableCell>
                          <TableCell colSpan={6} />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {activeTab === 2 && (
          <>
            <FormSectionsLayout
              sections={[resource.sections[2]]}
              form={form}
              onChange={updateField}
              selectOptions={selectOptions}
              requiredFields={resource.requiredFields}
              disabled={isEdit}
              disabledFields={['dueDate']}
            />

            <Box sx={{ height: 24 }} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={addBonus}
                  onChange={(e) => {
                    setAddBonus(e.target.checked);
                    if (!e.target.checked) setBonusApplied(false);
                  }}
                />
              }
              label="Add Bonus"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={gstInclusive}
                  onChange={(e) => {
                    setGstInclusive(e.target.checked);
                    setForm((prev) => {
                      const next = { ...prev };
                      calculateAmounts(next);
                      return next;
                    });
                  }}
                  disabled={isEdit}
                />
              }
              label={gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}
            />

            {addBonus && (
              <>
                <FormSectionsLayout
                  sections={[resource.sections[3]]}
                  form={form}
                  onChange={updateField}
                  selectOptions={selectOptions}
                  requiredFields={resource.requiredFields}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 2 }}>
                  <Button variant="contained" color="success" onClick={handleApplyBonus}> Apply Bonus  </Button>
                </Box>
              </>
            )}

            <Box sx={{ height: 24 }} />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                Commission History
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ '& .MuiTableCell-root': { fontWeight: 700 } }}>
                    <TableRow>
                      <TableCell>Installment</TableCell>
                      <TableCell>Fee Type</TableCell>
                      <TableCell>Fees Date</TableCell>
                      <TableCell>Fees</TableCell>
                      <TableCell>Payment Status</TableCell>
                      <TableCell>Commission</TableCell>
                      <TableCell>Bonus</TableCell>
                      <TableCell>GST</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {historyRows.length > 0 ? (
                      <>
                        {historyRows.map((row, index) => (
                          <TableRow
                            key={`${row.studentPaymentInstallmentId ?? row.installmentNo}-${row.feeType}-${index}`}
                          >
                            <TableCell>{row.displayInstallmentNo ?? row.installmentNo}</TableCell>
                            <TableCell>{row.feeType || '-'}</TableCell>
                            <TableCell>{formatDateCell(row.dueDate ?? row.feesDate)}</TableCell>
                            <TableCell>{Number(row.feesAmount ?? row.fees).toFixed(2)}</TableCell>
                            <TableCell>{row.paymentStatus}</TableCell>
                            <TableCell> {Number(row.commissionAmount ?? row.commission).toFixed(2)}</TableCell>
                            <TableCell>
                              {isTuitionFeeType(row.feeType) &&
                              String(row.commissionHistoryOriginalStatus ?? '').trim().toLowerCase() !== 'paid' &&
                              !row.isBonus ? (
                                <TextField
                                  size="small"
                                  value={
                                    bonusOverrides[bonusRowKey(row)] ??
                                    Number(row.bonusBaseline ?? row.bonusAmount ?? row.bonus ?? 0).toFixed(2)
                                  }
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value !== '' && !/^\d*\.?\d{0,2}$/.test(value)) return;
                                    setBonusOverrides((prev) => ({ ...prev, [bonusRowKey(row)]: value }));
                                  }}
                                  inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                                  sx={{ width: 90 }}
                                />
                              ) : (
                                Number(row.bonusAmount ?? row.bonus).toFixed(2)
                              )}
                            </TableCell>
                            <TableCell>{Number(row.gstAmount ?? row.gst).toFixed(2)}</TableCell>
                            <TableCell> {Number(row.invoiceAmount ?? row.invoice).toFixed(2)} </TableCell>
                            <TableCell>
                              {isEdit ? (
                                <Select
                                  size="small"
                                  value={row.commissionStatus ?? 'Pending'}
                                  disabled={
                                    String(row.commissionHistoryOriginalStatus ?? '')
                                      .trim()
                                      .toLowerCase() === 'paid'
                                  }
                                  onChange={(e) => handleCommissionStatusChange(row, e.target.value)}
                                  MenuProps={menuProps}
                                  sx={commissionSelectSx}
                                >
                                  <MenuItem value="Pending">Pending</MenuItem>
                                  <MenuItem value="Paid" disabled={!canEditCommissionStatus(row)}> Paid </MenuItem>
                                </Select>
                              ) : (
                                row.commissionStatus ?? 'Pending'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}

                        <TableRow sx={{ backgroundColor: '#f5f7fb' }}>
                          <TableCell colSpan={3}> <b>Total</b>    </TableCell>
                          <TableCell> <b>{totals.fees.toFixed(2)}</b> </TableCell>
                          <TableCell />
                          <TableCell>  <b>{totals.commission.toFixed(2)}</b> </TableCell>
                          <TableCell>  <b>{totals.bonus.toFixed(2)}</b> </TableCell>
                          <TableCell> <b>{totals.gst.toFixed(2)}</b> </TableCell>
                          <TableCell> <b>{totals.invoice.toFixed(2)}</b> </TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    ) : (
                      <TableRow> <TableCell colSpan={10} align="center"> No Commission History </TableCell> </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {activeTab === 3 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, }}  >
              <Typography variant="h6" sx={{ fontWeight: 700 }}> Offer Letter  </Typography>

              <Button
                variant="contained" size="small"
                startIcon={<AddIcon />}
                onClick={openAddContract}>
                Add Offer Letter</Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ '& .MuiTableCell-root': { fontWeight: 700 } }}>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Reference no.</TableCell>
                    <TableCell>Start date</TableCell>
                    <TableCell>End date</TableCell>
                    <TableCell>File</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {contracts.length > 0 ? (
                    contracts.map((contract, index) => (
                      <TableRow key={contract.contractId ?? `local-${index}`}>
                        <TableCell>{contract.status}</TableCell>
                        <TableCell>{contract.referenceNo || '-'}</TableCell>
                        <TableCell>{formatDateCell(contract.startDate)}</TableCell>
                        <TableCell>{formatDateCell(contract.endDate)}</TableCell>
                        <TableCell>
                          {contract.fileUrl ? (
                            <Button size="small"
                              onClick={() => window.open(contract.fileUrl, '_blank')}
                              sx={{ textTransform: 'none' }}
                            >  View file </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEditContract(contract, index)}>  <EditIcon fontSize="small" /> </IconButton>
                          <IconButton size="small"
                            onClick={() => handleDeleteContract(contract, index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow> <TableCell colSpan={6} align="center">  No Contracts  </TableCell>  </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Box sx={{ mt: 4 }} />

        {!isEdit && !visitedTabs.has(2) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Please review the Commission tab before saving the student.
          </Alert>
        )}

        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleCreate}
          submitLabel={submitting
            ? isEdit ? 'Updating...' : 'Saving...'
            : isEdit ? 'Update Student' : 'Save Student'
          }
          submitDisabled={
            !isFormValid(resource, form) ||
            submitting ||
            (isEdit && !hasChanges) ||
            (isEdit && addBonus && !bonusApplied) ||
            (!isEdit && !visitedTabs.has(2)) ||
            (!isEdit && (!form.courseFee || Number(form.courseFee) <= 0)) ||
            (!isEdit && (!form.noOfInstallment || Number(form.noOfInstallment) <= 0))
          }
        />

        <ConfirmByStudentDialog
          open={confirmDialogOpen}
          installment={confirmTargetInstallment}
          onClose={() => {
            setConfirmDialogOpen(false);
            setConfirmTargetInstallment(null);
          }}
          onConfirmed={handleConfirmedByStudent}
        />

        <Dialog open={contractDialogOpen} onClose={closeContractDialog} maxWidth="xs" fullWidth>
          <DialogTitle
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            {editingContractKey !== null ? 'Edit contract' : 'Add contract'}
            <IconButton size="small" onClick={closeContractDialog}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
              <TextField
                select
                fullWidth
                size="small" label="Contract status"
                value={contractForm.status}
                onChange={(e) => updateContractField('status', e.target.value)}
              >
                {CONTRACT_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}> {option} </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                size="small" label="Contract reference no."
                value={contractForm.referenceNo}
                onChange={(e) => updateContractField('referenceNo', e.target.value)}
              />

              <TextField
                fullWidth
                size="small" label="Contract file URL"
                helperText="Paste a link to the uploaded contract document, or upload a file below."
                value={contractForm.fileUrl}
                onChange={(e) => updateContractField('fileUrl', e.target.value)}
              />

              <Box>
                <Button variant="outlined" size="small" component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={contractUploading}
                >
                  {contractUploading ? 'Uploading...' : 'Upload file'}
                  <input
                    ref={contractFileInputRef}
                    type="file"
                    hidden
                    onChange={handleContractFileSelected}
                  />
                </Button>

                {contractForm.fileName && (
                  <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
                    {contractForm.fileName}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    Start date
                  </Typography>
                  <TextField
                    fullWidth
                    type="date" size="small"
                    value={contractForm.startDate || ''}
                    onChange={(e) => updateContractField('startDate', e.target.value)}
                    disabled={contractSaving}
                  />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    End date
                  </Typography>
                  <TextField
                    fullWidth
                    type="date" size="small"
                    value={contractForm.endDate || ''}
                    onChange={(e) => updateContractField('endDate', e.target.value)}
                    disabled={contractSaving}
                  />
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                minRows={3} size="small" label="Notes"
                value={contractForm.notes}
                onChange={(e) => updateContractField('notes', e.target.value)}
              />
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={closeContractDialog} disabled={contractSaving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveContract}
              disabled={contractSaving || contractUploading}
            >
              {contractSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </FormPageLayout>
  );
}
