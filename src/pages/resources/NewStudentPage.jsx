import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Alert, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Typography, Button, Select, MenuItem, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel, Switch, Tabs, Tab } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { fetchCoursesByScrappingId } from '../../api/coursesApi';
import { fetchStudentContracts,  createStudentContract,  updateStudentContract,  deleteStudentContract,  uploadStudentContractFile,} from '../../api/studentContractsApi';
import { fetchUniqueInstituteNames,  getCampusesForInstitute,  getUniqueInstituteNames,  normalizeInstituteName,  resolveScrappingId,} from '../../api/institutesScrappingApi';
import ConfirmByStudentDialog from './ConfirmByStudentDialog';
import { createStudentWithPaymentSchedule, fetchStudentPaymentDetail } from '../../api/studentsApi';
import { createPaymentSchedule, createStudentPaymentInstallment,  createStudentCommission,  createStudentCommissionDetail,  updateStudentPaymentSchedule,  confirmInstallmentByStudent,} from '../../api/schedulesApi';
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
const amountFieldSx = { width: 170, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#fff' },};

const headerCellSx = {
  fontWeight: 700,
  color: 'text.secondary',
  textTransform: 'uppercase',
  fontSize: '0.72rem',
  letterSpacing: 0.4,
  py: 1.25,
};

const tabSx = { textTransform: 'none', fontWeight: 700, minHeight: 48 };
const statusSelectSx = { width: 150,height: 40,'& .MuiSelect-select': { minWidth: '70px', padding: '8px 32px 8px 12px' },};
const commissionSelectSx = { width: 110,  height: 40, '& .MuiSelect-select': { minWidth: '70px', padding: '8px 32px 8px 12px' },};
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

// Half-up rounding like Excel/SQL ROUND; toFixed(2) turns 31.325 into 31.32 because of float error.
const round2 = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  const sign = num < 0 ? -1 : 1;
  return (sign * Number(`${Math.round(Number(`${Math.abs(num)}e2`))}e-2`)) || 0;
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

  if ( Number.isNaN(date.getTime()) ||  date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ) 
  {
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
const getGroupNo = (row) => row.parentGroupNo ?? row.installmentNo;
const getGroupMembers = (list, groupNo) => list.filter((x) => getGroupNo(x) === groupNo);
const getGroupRoot = (list, groupNo) => list.find((x) => x.installmentNo === groupNo);

const isSameFeeType = (a, b) => (a.feeType ?? null) === (b.feeType ?? null);

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
      paidAmount: item.paidAmount,
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

const buildStudentSnapshot = ({ phone, folderNo, leadNo, bonus, bonusType, bonusOption }) =>
  JSON.stringify({
    phone: String(phone ?? ''),
    folderNo: String(folderNo ?? ''),
    leadNo: String(leadNo ?? ''),
    bonus: Number(bonus || 0),
    bonusType: bonus > 0 ? String(bonusType ?? '') : '',
    bonusOption: bonus > 0 ? String(bonusOption ?? '') : '',
  });

export default function NewStudentPage({ basePath }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
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
  const [addBonus, setAddBonus] = useState(false);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [originalPaymentList, setOriginalPaymentList] = useState([]);
  const [originalSchedule, setOriginalSchedule] = useState(null);
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

    const rawCommission = round2((tuitionShare * Number(next.commissionPercentage || 0)) / 100);
    const gstPct = Number(next.gstPercentage || 0);

    let commission;
    let gst;
    if (gstInclusive) {
      gst = round2(rawCommission - rawCommission / (1 + gstPct / 100));
      commission = round2(rawCommission - gst);
    } else {
      commission = rawCommission;
      gst = round2((rawCommission * gstPct) / 100);
    }

    next.commissionAmount = commission.toFixed(2);
    next.gstAmount = gst.toFixed(2);
    next.invoiceAmount = round2(commission + gst).toFixed(2);
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

    let installmentAmount;
    if (isEdit) {
      const paidRegularAmount = paidRegularInstallments.reduce(
        (sum, x) => sum + Number(x.paidAmount || x.amount || 0),
        0
      );
      const remainingAmount = remainingTuitionFee - paidRegularAmount;
      const remainingInstallments = count - paidRegularInstallments.length;
      installmentAmount = remainingInstallments > 0 ? remainingAmount / remainingInstallments : 0;
    } else {
      installmentAmount = count > 0 ? remainingTuitionFee / count : remainingTuitionFee;
    }

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
          installmentNo: 0.1,
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
      const paidRow = paidRegularInstallments.find((x) => Number(x.installmentNo) === i + 1);

      if (paidRow) {
        list.push({ ...paidRow, feeType: paidRow.feeType || 'Tuition Fee' });
        continue;
      }

      list.push({
        installmentNo: String(i + 1),
        feeType: 'Tuition Fee',
        dueDate: toIsoDate(shiftByFrequency(regularStartDate, data.frequency, i)),
        amount: installmentAmount.toFixed(2),
        paidAmount: '0.00',
        balance: installmentAmount.toFixed(2),
        status: 'Pending',
      });
    }

    setPaymentList(list);
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

  useEffect(() => { if (!isEdit || !form.courseId || !courses.length) return;
    const selectedCourse = courses.find((c) => String(c.courseId) === String(form.courseId));
    if (!selectedCourse) return;

    setForm((prev) => ({
      ...prev,
      courseDurationWeeks: durationToWeeks(selectedCourse.duration),
    }));
  }, [isEdit, form.courseId, courses]);

  useEffect(() => {
    if (isEdit || prefillAppliedRef.current) return;

    const preselectedInstituteName = normalizeInstituteName(location.state?.instituteName);
    const preselectedInstituteId = location.state?.instituteId;

    if (!preselectedInstituteName && !preselectedInstituteId) return;
    prefillAppliedRef.current = true;

    if (preselectedInstituteName) {
      setForm((prev) => ({ ...prev, instituteId: preselectedInstituteName }));
    } else if (preselectedInstituteId) {
      setForm((prev) => ({ ...prev, instituteId: String(preselectedInstituteId) }));
    }

    if (location.state?.fromInstitute) {
      setInstituteLocked(true);
    }

    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [isEdit, location.pathname, location.search, location.state, navigate]);

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

    fetchCoursesByScrappingId(resolvedScrappingId)
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
  }, [resolvedScrappingId]);

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
    if (!isEdit) return;

    async function loadData() {
      try {
        const data = await fetchStudentPaymentDetail(id);

        setForm({
          ...getEmptyForm(basePath),
          studentId: data.studentId,
          studentIdDisplay: String(data.studentId ?? ''),
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
          remark: data.remark,
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
        // Upfront payment = installment 0 plus every 0.x row (initial Tuition share, split balances).
        const initialRows = list.filter((x) => {
          const no = Number(x.installmentNo);
          return no >= 0 && no < 1;
        });
        const initialPaymentTotal = initialRows.length
          ? round2(initialRows.reduce((sum, x) => sum + Number(x.amount || 0), 0))
          : '';

        setForm((prev) => {
          const next = { ...prev, initialPayment: initialPaymentTotal };
          calculateAmounts(next);
          return next;
        });

        const history = (data.commissionHistory || []).map((x) => ({
          ...x,
          installmentNo: apiInstallmentMap.get(Number(x.installmentNo)) ?? x.installmentNo,
        }));

        setOriginalPaymentList(list);
        setPaymentList(list);
        setCommissionHistory(history);
        setSavedScheduleSnapshot(buildChangeSnapshot(list, history));
        setSavedStudentSnapshot(
          buildStudentSnapshot({
            phone: data.phone,
            folderNo: data.folderNo,
            leadNo: data.leadNo,
            bonus: Number(data.bonusAmount || 0),
            bonusType: data.bonusType,
            bonusOption: data.bonusOption,
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

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
    setVisitedTabs((prev) => {
      if (prev.has(newValue)) return prev;
      const next = new Set(prev);
      next.add(newValue);
      return next;
    });
  };

  const updateField = (field, value) => {
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
        const tuitionFee = Number(selectedCourse?.tuitionFee || 0);
        const oshcFee = Number(selectedCourse?.oshcFee || 0);
        const hasBreakdown = enrollmentFee + materialFee + tuitionFee + oshcFee > 0;

        next.enrollmentFee = enrollmentFee;
        next.materialFee = materialFee;
        next.oshcFee = oshcFee;
        next.tuitionFee = hasBreakdown ? tuitionFee : Number(selectedCourse?.fees || 0);
        next.courseFee = selectedCourse?.fees ?? '';
        next.amountDue = selectedCourse?.fees ?? '';
        next.courseDurationWeeks = durationToWeeks(selectedCourse?.duration);
        next.commissionRate = Number(selectedCourse?.commissionRate ?? 0);
        next.rateType = selectedCourse?.rateType ?? '';
        next.commissionPercentage = Number(next.commissionRate ?? 0);
        next.gstPercentage = Number(gstPercentage || 0);
        next.courseStartDate = next.startDate || next.courseStartDate || '';
        next.courseEndDate = computeCourseEndDate(next.courseStartDate, selectedCourse?.duration);
      }

      if (FEE_COMPONENT_FIELDS.includes(field)) {
        const total =
          Number(next.enrollmentFee || 0) +
          Number(next.materialFee || 0) +
          Number(next.tuitionFee || 0) +
          Number(next.oshcFee || 0);
        next.courseFee = total.toFixed(2);
        next.amountDue = next.courseFee;
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
        generateInstallments(next);
      }

      return next;
    });

    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const commissionRows = useMemo(
    () =>
      paymentList.map((item) => {
        const isNewPartial = item.status === 'Partial' && item.originalStatus !== 'Partial';

        const fees = isNewPartial
          ? Number(item.amount || 0)
          : isPaidLike(item.status) || item.status === 'Partial'
            ? getEffectivePaidAmount(paymentList, item)
            : Number(item.amount || 0);

        let rawCommission = 0;
        let commission = 0;
        let gst = 0;

        const feeTypeKey = String(item.feeType || '').trim().toLowerCase();
        const isCommissionable = feeTypeKey
          ? feeTypeKey === 'tuition fee'
          : Number(item.installmentNo) !== 0;

        if (isCommissionable) {
          rawCommission = round2((fees * Number(form.commissionPercentage || 0)) / 100);
          const gstPct = Number(form.gstPercentage || 0);

          if (gstInclusive) {
            gst = round2(rawCommission - rawCommission / (1 + gstPct / 100));
            commission = round2(rawCommission - gst);
          } else {
            commission = rawCommission;
            gst = round2((rawCommission * gstPct) / 100);
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

        if (isCommissionable && addBonus && bonusApplied && applyBonus) {
          if (form.bonusType === 'Percentage') {
            bonus = round2((fees * Number(form.bonus || 0)) / 100);
          } else if (form.bonusType === 'Fixed') {
            bonus = round2(form.bonus);
          }
        }

        const invoice = round2(commission + gst + bonus);

        return {
          studentPaymentInstallmentId: item.studentPaymentInstallmentId,
          installmentNo: item.installmentNo,
          feeType: item.feeType,
          feesDate: item.dueDate,
          fees: fees.toFixed(2),
          paymentStatus: item.status,
          commission: commission.toFixed(2),
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
    if (!isEdit) return commissionRows;

    const normalCounters = {};
    const bonusCounters = {};

    return commissionRows
      .map((commissionRow) => {
        const payment = paymentList.find(
          (item) =>
            Number(item.studentPaymentInstallmentId) ===
            Number(commissionRow.studentPaymentInstallmentId)
        );

        const historyRow = commissionHistory.find(
          (row) =>
            Number(row.studentPaymentInstallmentId ?? row.StudentPaymentInstallmentId) ===
            Number(commissionRow.studentPaymentInstallmentId)
        );

        const rawInstallmentNo = commissionRow.installmentNo ?? payment?.installmentNo ?? 0;
        const installmentNo = Number(String(rawInstallmentNo).split('.')[0]);

        const feeType =
          payment?.feeType ?? commissionRow.feeType ?? historyRow?.feeType ?? historyRow?.FeeType ?? null;
        const counterKey = `${installmentNo}|${feeType ?? ''}`;

        const rawIsBonus = historyRow?.isBonus ?? historyRow?.IsBonus ?? false;
        const isBonus =
          rawIsBonus === 1 || rawIsBonus === '1' || String(rawIsBonus).toLowerCase() === 'true';

        let displayInstallmentNo;
        if (isBonus) {
          bonusCounters[counterKey] = (bonusCounters[counterKey] ?? 0) + 1;
          displayInstallmentNo = `${installmentNo}.1.${bonusCounters[counterKey]}`;
        } else {
          normalCounters[counterKey] = (normalCounters[counterKey] ?? 0) + 1;
          const normalCount = normalCounters[counterKey];
          displayInstallmentNo =
            normalCount === 1 ? `${installmentNo}` : `${installmentNo}.${normalCount - 1}`;
        }

        return {
          ...historyRow,
          studentPaymentInstallmentId: commissionRow.studentPaymentInstallmentId,
          installmentNo,
          feeType,
          displayInstallmentNo,
          isBonus,
          dueDate:
            payment?.dueDate ??
            historyRow?.dueDate ??
            historyRow?.DueDate ??
            commissionRow.feesDate ??
            null,
          feesAmount: Number(commissionRow.fees || 0),
          paymentStatus:
            payment?.status ??
            commissionRow.paymentStatus ??
            historyRow?.paymentStatus ??
            historyRow?.PaymentStatus ??
            'Pending',
          commissionAmount: Number(commissionRow.commission || 0),
          gstAmount: Number(commissionRow.gst || 0),
          bonusAmount: Number(commissionRow.bonus || 0),
          invoiceAmount: Number(commissionRow.invoice || 0),
          commissionDetailId: historyRow?.commissionDetailId ?? historyRow?.CommissionDetailId,
          commissionHistoryOriginalStatus:
            historyRow?.commissionStatus ?? historyRow?.CommissionStatus ?? null,
          commissionStatus:
            historyRow?.commissionStatus ?? historyRow?.CommissionStatus ?? 'Pending',
        };
      })
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }, [isEdit, paymentList, commissionHistory, commissionRows]);

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

  const hasChanges = useMemo(() => {
    if (!isEdit) return true;
    if (!savedScheduleSnapshot || !savedStudentSnapshot) return false;

    const studentNow = buildStudentSnapshot({
      phone: form.phone,
      folderNo: form.FolderNo,
      leadNo: form.leadNo,
      bonus: addBonus ? Number(form.bonus || 0) : 0,
      bonusType: form.bonusType,
      bonusOption: form.bonusOption,
    });

    return (
      studentNow !== savedStudentSnapshot ||
      buildChangeSnapshot(paymentList, commissionHistory) !== savedScheduleSnapshot
    );
  }, [
    isEdit,
    savedScheduleSnapshot,
    savedStudentSnapshot,
    paymentList,
    commissionHistory,
    form.phone,
    form.FolderNo,
    form.leadNo,
    form.bonus,
    form.bonusType,
    form.bonusOption,
    addBonus,
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

  const isStatusDisabled = (item, groupComplete, isLastOfGroup) =>
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
      !isRowPastDataEditable(item));

  const canEditCommissionStatus = (row) => {
    const sortedRows = [...historyRows].sort((a, b) => a.installmentNo - b.installmentNo);
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
    const newAmount = Number(value || 0);

    setPaymentList((prev) => {
      let updated = prev.map((x) => ({ ...x }));

      const currentIndex = updated.findIndex(
        (x) =>
          String(x.installmentNo) === String(item.installmentNo) &&
          String(x.feeType).toLowerCase() === String(item.feeType).toLowerCase()
      );
      if (currentIndex === -1) return prev;

      const currentItem = updated[currentIndex];
      const oldAmount = Number(currentItem.originalAmount ?? currentItem.amount ?? 0);
      const difference = newAmount - oldAmount;

      const currentFeeType = String(currentItem.feeType || '').trim().toLowerCase();
      const isNonTuition = currentFeeType === 'non-tuition fee';
      const isTuition = currentFeeType === 'tuition fee';

      const isReduced = newAmount + EPSILON < oldAmount;

      let nextStatus = currentItem.status;
      let nextPaid = currentItem.paidAmount;
      let nextBalance = newAmount.toFixed(2);
      let nextPaidDate = currentItem.paidDate;
      let nextAuto = currentItem.autoPartial;

      if (isEdit) {
        if (currentItem.status === 'Pending' && isReduced) {
          nextStatus = 'Partial';
          nextAuto = true;
          nextPaidDate = currentItem.paidDate || todayIso();
        } else if (currentItem.autoPartial && !isReduced) {
          nextStatus = 'Pending';
          nextAuto = false;
          nextPaid = '0.00';
          nextPaidDate = null;
        }

        if (nextStatus === 'Partial' && currentItem.originalStatus !== 'Partial') {
          nextPaid = newAmount.toFixed(2);
          nextBalance = '0.00';
        }
      }

      updated[currentIndex] = {
        ...currentItem,
        amount: value,
        originalAmount: oldAmount,
        balance: nextBalance,
        status: nextStatus,
        paidAmount: nextPaid,
        paidDate: nextPaidDate,
        autoPartial: nextAuto,
      };

      // Fee went back up to its original amount, so the auto-created Partial split is no longer needed.
      const revertedAutoPartial = isEdit && currentItem.autoPartial && !isReduced;
      if (revertedAutoPartial) {
        updated = updated.filter(
          (x) =>
            !(
              x.parentInstallmentNo === currentItem.installmentNo &&
              isSameFeeType(x, currentItem) &&
              !x.studentPaymentInstallmentId
            )
        );
      }

      if (
        !revertedAutoPartial &&
        (currentItem.status === 'Partial' || currentItem.originalStatus === 'Partial')
      ) {
        const baseAmount = Number(currentItem.originalAmount ?? oldAmount);
        const childIndex = updated.findIndex(
          (x) => x.parentInstallmentNo === currentItem.installmentNo && isSameFeeType(x, currentItem)
        );
        const diff = baseAmount - newAmount;

        updated[currentIndex] = {
          ...updated[currentIndex],
          paidAmount: newAmount.toFixed(2),
          balance: '0.00',
        };

        if (childIndex === -1 && diff > EPSILON) {
          const rootNo = currentItem.parentGroupNo ?? currentItem.installmentNo;
          let n = 1;
          let childNo = Number((rootNo + n / 10).toFixed(2));
          while (updated.some((x) => x.installmentNo === childNo)) {
            n++;
            childNo = Number((rootNo + n / 10).toFixed(2));
          }

          updated.splice(currentIndex + 1, 0, {
            installmentNo: childNo,
            parentInstallmentNo: currentItem.installmentNo,
            parentGroupNo: rootNo,
            feeType: currentItem.feeType,
            dueDate: currentItem.dueDate,
            amount: diff.toFixed(2),
            paidAmount: '0.00',
            balance: diff.toFixed(2),
            status: 'Pending',
            originalStatus: 'Pending',
            originalAmount: 0,
          });
        }

        if (diff >= -EPSILON && childIndex !== -1) {
          updated[childIndex] = {
            ...updated[childIndex],
            originalAmount: 0,
            amount: Math.max(0, diff).toFixed(2),
            balance: Math.max(0, diff).toFixed(2),
          };

          for (let i = childIndex + 1; i < updated.length; i++) {
            const row = updated[i];
            if (row.status !== 'Pending' || row.studentPaymentInstallmentId) continue;
            if (String(row.feeType) !== String(currentItem.feeType)) continue;
            updated[i] = resetToOriginal(row);
          }
        } else if (diff < -EPSILON) {
          if (childIndex !== -1 && !updated[childIndex].studentPaymentInstallmentId) {
            updated.splice(childIndex, 1);
          }

          const targets = [];
          for (let i = currentIndex + 1; i < updated.length; i++) {
            const row = updated[i];
            if (row.status !== 'Pending' || row.studentPaymentInstallmentId) continue;
            if (String(row.feeType) !== String(currentItem.feeType)) continue;
            targets.push(i);
          }

          targets.forEach((i) => { updated[i] = resetToOriginal(updated[i]); });
          let left = Math.abs(diff);
          targets.forEach((i, idx) => {
            if (left <= EPSILON) return;

            const rowAmount = Number(updated[i].amount || 0);
            const share =
              idx === targets.length - 1
                ? left : Number((left / (targets.length - idx)).toFixed(2));
            const cut = Math.min(rowAmount, share);

            updated[i] = {
              ...updated[i],
              amount: (rowAmount - cut).toFixed(2),
              balance: (rowAmount - cut).toFixed(2),
            };
            left -= cut;
          });
        }

        return updated;
      }

      const feeTypeKey = (row) => String(row.feeType || '').trim().toLowerCase();
      const isCurrentFeeType = (row) =>
        (isNonTuition || isTuition) && feeTypeKey(row) === currentFeeType;

      const remainingIndexes = [];
      for (let i = currentIndex + 1; i < updated.length; i++) {
        const row = updated[i];
        if (isCurrentFeeType(row) && row.status === 'Pending') {
          remainingIndexes.push(i);
        }
      }

      if (remainingIndexes.length === 0 && !isNonTuition) {
        return updated;
      }

      // Tuition rows are reset only so a Non-Tuition overflow can be re-applied on top of them.
      if (isNonTuition) {
        for (let i = currentIndex + 1; i < updated.length; i++) {
          const row = updated[i];
          if (row.status !== 'Pending' || row.studentPaymentInstallmentId) continue;
          if (isCurrentFeeType(row)) continue;
          updated[i] = resetToOriginal(row);
        }
      }

      // originalAmount is captured once per row, so this total stays fixed across repeated edits.
      const baselineOf = (row) => Number(row.originalAmount ?? row.amount ?? 0);
      const feeTypeTotal = prev.reduce(
        (sum, row) => (isCurrentFeeType(row) ? sum + baselineOf(row) : sum),
        0
      );

      const remainingSet = new Set(remainingIndexes);
      const fixedAmount = updated.reduce((sum, row, i) => {
        if (!isCurrentFeeType(row) || remainingSet.has(i)) return sum;
        return sum + (i === currentIndex ? newAmount : Number(row.amount || 0));
      }, 0);

      const amountToSplit = feeTypeTotal - fixedAmount;
      const distributable = Math.max(0, amountToSplit);

      if (remainingIndexes.length > 0) {
        const share = Number((distributable / remainingIndexes.length).toFixed(2));
        let left = distributable;

        remainingIndexes.forEach((i, index) => {
          const row = updated[i];
          const isLast = index === remainingIndexes.length - 1;
          const rowAmount = Math.max(0, isLast ? Number(left.toFixed(2)) : share);

          updated[i] = {
            ...row,
            originalAmount: baselineOf(row),
            amount: rowAmount.toFixed(2),
            balance: rowAmount.toFixed(2),
          };
          left -= rowAmount;
        });
      }

      const overflow = isNonTuition ? Math.max(0, -amountToSplit) : 0;

      if (overflow > EPSILON) {
        const tuitionIndexes = [];
        for (let i = currentIndex + 1; i < updated.length; i++) {
          const row = updated[i];
          if (
            String(row.feeType || '').trim().toLowerCase() === 'tuition fee' &&
            row.status === 'Pending' &&
            !row.studentPaymentInstallmentId
          ) {
            tuitionIndexes.push(i);
          }
        }

        if (tuitionIndexes.length > 0) {
          const cut = Number((overflow / tuitionIndexes.length).toFixed(2));
          let cutLeft = overflow;

          tuitionIndexes.forEach((i, idx) => {
            const row = updated[i];
            const base = Number(row.originalAmount ?? row.amount ?? 0);
            const thisCut = idx === tuitionIndexes.length - 1 ? cutLeft : cut;
            const newRowAmount = Math.max(0, base - thisCut);

            updated[i] = {
              ...row,
              originalAmount: base,
              amount: newRowAmount.toFixed(2),
              balance: newRowAmount.toFixed(2),
            };
            cutLeft -= thisCut;
          });
        }
      }

      if (isNonTuition && difference < -EPSILON && remainingIndexes.length === 0) {
        const newRowAmount = Math.abs(difference);

        const nextDue =
          updated.find((x, i) => i > currentIndex && !x.isInitialPayment)?.dueDate ||
          currentItem.dueDate;

        let childNo = 1;
        let childInstallmentNo = Number((childNo / 10).toFixed(2));
        while (updated.some((x) => x.installmentNo === childInstallmentNo)) {
          childNo++;
          childInstallmentNo = Number((childNo / 10).toFixed(2));
        }

        updated.splice(currentIndex + 1, 0, {
          installmentNo: childInstallmentNo,
          parentInstallmentNo: currentItem.installmentNo,
          parentGroupNo: 0,
          feeType: 'Non-Tuition Fee',
          dueDate: nextDue,
          amount: newRowAmount.toFixed(2),
          paidAmount: '0.00',
          balance: newRowAmount.toFixed(2),
          status: 'Pending',
          originalStatus: 'Pending',
          isInitialPayment: false,
          originalAmount: 0,
        });
      }

      if (isNonTuition) {
        updated = updated.filter((x, i) => {
          if (i <= currentIndex) return true;

          const sameType = String(x.feeType || '').trim().toLowerCase() === 'non-tuition fee';
          const isZero = Number(x.amount || 0) <= EPSILON;
          const shouldDelete =
            sameType &&
            isZero &&
            !x.studentPaymentInstallmentId &&
            x.status === 'Pending' &&
            !x.isInitialPayment;

          return !shouldDelete;
        });
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

  const handleStatusChange = async (item, value) => {
    if (value === 'ConfirmedByStudent') {
      try {
        await confirmInstallmentByStudent(item.studentPaymentInstallmentId);

        setPaymentList((prev) =>
          prev.map((x) => {
            if (!isSamePaymentRow(x, item)) return x;

            const paidLikeAmount = hasSplitChild(prev, x)
              ? x.paidAmount || '0.00'
              : x.amount;

            return {
              ...x,
              status: 'ConfirmedByStudent',
              paidAmount: paidLikeAmount,
              balance: '0.00',
              paidDate: x.paidDate || todayIso(),
            };
          })
        );

        setConfirmTargetInstallment(item);
        setConfirmDialogOpen(true);
      } catch (err) {
        console.error('Failed to confirm installment by student:', err);
      }
      return;
    }

    setPaymentList((prev) => {
      let updated = prev.map((x) => {
        if (!isSamePaymentRow(x, item)) return x;

        const isPaid = isPaidLike(value);
        const isPartial = value === 'Partial';
        const paidLikeAmount = hasSplitChild(prev, x)
          ? x.paidAmount || '0.00'
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
        const alreadySplit = hasSplitChild(updated, item);

        if (!alreadySplit) {
          const rootNo = item.parentGroupNo ?? item.installmentNo;
          const childCount = updated.filter(
            (x) => x.parentGroupNo === rootNo && isSameFeeType(x, item) && !isSamePaymentRow(x, item)
          ).length;

          let n = childCount + 1;
          let newInstallmentNo = Number((rootNo + n / 10).toFixed(2));
          while (
            updated.some((x) => x.installmentNo === newInstallmentNo && isSameFeeType(x, item))
          ) {
            n++;
            newInstallmentNo = Number((rootNo + n / 10).toFixed(2));
          }

          const remainingRow = {
            installmentNo: newInstallmentNo,
            parentInstallmentNo: item.installmentNo,
            parentGroupNo: rootNo,
            feeType: item.feeType,
            dueDate: item.dueDate,
            amount: '0.00',
            paidAmount: '0.00',
            balance: '0.00',
            status: 'Pending',
          };

          const insertIndex = updated.findIndex((x) => isSamePaymentRow(x, item)) + 1;

          updated = [...updated.slice(0, insertIndex), remainingRow, ...updated.slice(insertIndex)];
        }
      } else {
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
        if (value === 'Pending' && x.installmentNo > item.installmentNo) {
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
    setPaymentList((prev) =>
      prev.map((x) => {
        if (!isSamePaymentRow(x, installment)) return x;

        const paidLikeAmount = hasSplitChild(prev, x)
          ? x.paidAmount || '0.00'
          : Number(x.amount || 0).toFixed(2);

        return {
          ...x,
          status: 'ConfirmedByStudent',
          paidAmount: paidLikeAmount,
          balance: '0.00',
          paidDate: x.paidDate || todayIso(),
          documentUrl,
        };
      })
    );

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
    setBonusApplied(true);
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;

    if (!isEdit && (!form.initialPayment || Number(form.initialPayment) <= 0)) {
      setError('Please enter Initial Payment before saving the student.');
      return;
    }

    if (!isEdit && (!form.courseFee || Number(form.courseFee) <= 0)) {
      setError('Course Fee cannot be zero. Please enter fee details before saving.');
      return;
    }

    if (!form.noOfInstallment || Number(form.noOfInstallment) <= 0) {
      setError('Please enter Number of Installments before saving the student.');
      return;
    }

    const invalidPartialRow = paymentList.find(
      (x) => x.status === 'Partial' && (!x.paidAmount || Number(x.paidAmount) <= 0)
    );
    if (invalidPartialRow) {
      setError(
        `Installment ${invalidPartialRow.isInitialPayment ? 'Initial Payment' : invalidPartialRow.installmentNo
        } is marked "Partial" but Paid Amount is 0. Please enter a paid amount or change the status.`
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

        const result = await updateStudentPaymentSchedule({
          studentId: form.studentId,
          noOfInstallments: totalInstallmentCount,
          frequency: form.frequency,
          firstDueDate: form.startDate,
          phone: form.phone ?? '',
          folderNo: String(form.FolderNo ?? ''),
          leadNo: String(form.leadNo ?? ''),
          bonus: addBonus ? Number(form.bonus || 0) : 0,
          bonusType: addBonus ? form.bonusType ?? null : null,
          bonusOption: addBonus ? form.bonusOption ?? null : null,
          paymentList: persistedRows.map((x) => ({
            studentPaymentInstallmentId: x.studentPaymentInstallmentId,
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

      if (!isEdit || scheduleChanged) {
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

        for (const row of commissionRows) {
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

          const row = commissionRows.find((x) => isSamePaymentRow(x, item));

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
            disabledFields={isEdit ? ['fullName', 'email', 'studentIdDisplay'] : []}
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
                                  type="number"
                                  value={item.amount ?? ''}
                                  onChange={(e) => handleFeeAmountChange(item, e.target.value)}
                                  inputProps={{ min: 0, step: '0.01' }}
                                  sx={{ width: 110 }}
                                />
                              ) : (
                                item.amount
                              )}
                            </TableCell>

                            <TableCell>{formatDateCell(item.dueDate)}</TableCell>

                            <TableCell>
                              <Checkbox
                                size="small"
                                checked={isRowPastDataEditable(item)}
                                disabled={editPastDataAll || item.status !== "Pending"}
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

                            <TableCell>{Number(item.paidAmount || 0).toFixed(2)}</TableCell>

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
                            <TableCell>{Number(row.bonusAmount ?? row.bonus).toFixed(2)}</TableCell>
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
            <Box sx={{ display: 'flex',  justifyContent: 'space-between', alignItems: 'center', mb: 1.5, }}  >
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
          submitLabel={ submitting
              ? isEdit ? 'Updating...'    : 'Saving...'
              : isEdit ? 'Update Student' : 'Save Student'
          }
          submitDisabled={
            !isFormValid(resource, form) ||
            submitting ||
            (isEdit && !hasChanges) ||
            (isEdit && addBonus && !bonusApplied) ||
            (!isEdit && !visitedTabs.has(2)) ||
            (!isEdit && (!form.initialPayment || Number(form.initialPayment) <= 0)) ||
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
