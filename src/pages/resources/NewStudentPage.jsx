import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Typography, Button, Select, MenuItem, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel, Switch, Tabs, Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { fetchCoursesByScrappingId } from "../../api/coursesApi";
import {
  fetchStudentContracts,
  createStudentContract,
  updateStudentContract,
  deleteStudentContract,
  uploadStudentContractFile,
} from "../../api/studentContractsApi";
import {
  fetchUniqueInstituteNames,
  getCampusesForInstitute,
  getUniqueInstituteNames,
  normalizeInstituteName,
  resolveScrappingId,
} from "../../api/institutesScrappingApi";
import ConfirmByStudentDialog from './ConfirmByStudentDialog';
import { createStudentWithPaymentSchedule, derivePaymentStatus, fetchStudentPaymentDetail, updateStudentWithPaymentSchedule, } from "../../api/studentsApi";
import { createPaymentSchedule, createStudentPaymentInstallment, createStudentCommission, createStudentCommissionDetail, updateStudentPaymentSchedule ,uploadInstallmentDocument,  sendInstallmentConfirmationEmail,confirmInstallmentByStudent,} from "../../api/schedulesApi";
import { DateTextField, FormActions, FormPageLayout, FormSectionsLayout, formPaperSx, } from "../../components/forms";
import { getEmptyForm, getResourceConfig, isFormValid, } from "../../config/resourceConfig";
import { formatDateDisplay } from '../../utils/dateFormat';


const isPaidLike = (status) =>
  status === "ConfirmedByCollege" ||
  status === "ConfirmedByStudent" ||
  status === "PaidByCollege" ||
  status === "PaidByStudent";

// Fee-type configuration: which course-fee field feeds the amount, and
// which student-form field holds how many installments that fee splits into.
const FEE_TYPES = [
  { key: "Enrolment", label: "Enrolment Fee", amountField: "enrollmentFee" },
  { key: "Material", label: "Material Fee", amountField: "materialFee" },
  { key: "Tuition", label: "Tuition Fee", amountField: "tuitionFee" },
  { key: "OSHC", label: "OSHC Fee", amountField: "oshcFee" },
];
const EPSILON = 0.01;
const getGroupNo = (row) => row.parentGroupNo ?? row.installmentNo;

const getGroupMembers = (list, groupNo) =>
  list.filter((x) => getGroupNo(x) === groupNo);

const getGroupRoot = (list, groupNo) =>
  list.find((x) => x.installmentNo === groupNo);

const hasSplitChild = (list, installmentNo) =>
  list.some((row) => row.parentInstallmentNo === installmentNo);


const resyncSplitChain = (rows, startInstallmentNo) => {
  let result = [...rows];
  let currentParentNo = startInstallmentNo;

  while (true) {
    const parent = result.find((x) => x.installmentNo === currentParentNo);
    if (!parent) break;

    const childIndex = result.findIndex(
      (x) => x.parentInstallmentNo === currentParentNo
    );
    if (childIndex === -1) break;

    const child = result[childIndex];

    const isLocked = child.studentPaymentInstallmentId && isPaidLike(child.status);
    if (isLocked) break;

    const remaining = Number(parent.amount || 0) - Number(parent.paidAmount || 0);

    if (remaining <= EPSILON) {
      if (!child.studentPaymentInstallmentId) {
        result.splice(childIndex, 1);
        break;
      }
      result[childIndex] = { ...child, amount: "0.00", balance: "0.00" };
      break;
    }

    result[childIndex] = {
      ...child,
      amount: remaining.toFixed(2),
      balance: (remaining - Number(child.paidAmount || 0)).toFixed(2),
    };

    currentParentNo = child.installmentNo;
  }

  return result;
};

const getEffectivePaidAmount = (list, row) => {
  if (isPaidLike(row.status)) {
    return hasSplitChild(list, row.installmentNo)
      ? Number(row.paidAmount || 0)
      : Number(row.amount || 0);
  }
  if (row.status === "Partial") return Number(row.paidAmount || 0);
  return 0;
};
const isRowLocked = (item, paymentList) => {
  // Add your group-lock or confirmation check logic here based on your app architecture
  const groupNo = getGroupNo(item);
  return isGroupFullyCovered(paymentList, groupNo) && !isPaidLike(item.status);
};


const isGroupFullyCovered = (list, groupNo) => {
  const root = getGroupRoot(list, groupNo);
  if (!root) return false;

  const totalOriginal = Number(root.amount || 0);
  if (totalOriginal <= 0) return false;

  const members = getGroupMembers(list, groupNo);

  const sumPaid = members.reduce((sum, x) => {
    const hasChild = list.some(
      (row) => row.parentInstallmentNo === x.installmentNo
    );

    if (isPaidLike(x.status)) {
      return sum + Number(hasChild ? (x.paidAmount || 0) : x.amount || 0);
    }

    return sum + Number(x.paidAmount || 0);
  }, 0);
 const cappedSumPaid = Math.min(sumPaid, totalOriginal);
  return cappedSumPaid  + EPSILON >= totalOriginal;
};

const isLastInGroup = (list, groupNo, row) => {
  const members = getGroupMembers(list, groupNo).sort(
    (a, b) => a.installmentNo - b.installmentNo
  );
  return (
    members.length > 0 &&
    members[members.length - 1].installmentNo === row.installmentNo
  );
};

const deriveParentGroupNo = (rowById, item) => {
  const parentId = item.parentInstallmentId ?? item.ParentInstallmentId ?? null;
  if (!parentId) {
    return Number(item.installmentNo ?? item.InstallmentNo ?? 0);
  }

  const parent = rowById.get(String(parentId));
  if (!parent) {
    return Number(item.installmentNo ?? item.InstallmentNo ?? 0);
  }

  return deriveParentGroupNo(rowById, parent);
};
const getLockedDescendantAmount = (list, installmentNo) => {
  let total = 0;
  let currentParentNo = installmentNo;

  while (true) {
    const child = list.find((x) => x.parentInstallmentNo === currentParentNo);
    if (!child) break;

    const isLocked = child.studentPaymentInstallmentId && isPaidLike(child.status);
    if (!isLocked) break; // unlocked/pending child ko resync karna sahi hai

    total += Number(child.amount || 0);
    currentParentNo = child.installmentNo;
  }

  return total;
};
const hydratePaymentList = (rows) => {
  const rawRows = (rows || [])
    .map((item) => ({
      ...item,
      studentPaymentInstallmentId: item.studentPaymentInstallmentId,
      apiInstallmentNo: Number(item.installmentNo),
      parentInstallmentId: item.parentInstallmentId ?? null,
    }));

  const compareByApiInstallmentNo = (left, right) =>
    Number(left.apiInstallmentNo) - Number(right.apiInstallmentNo);

  // const rowById = new Map(
  //   rawRows
  //     .filter((item) => item.studentPaymentInstallmentId != null)
  //     .map((item) => [item.studentPaymentInstallmentId, item])
  // );
  const rowById = new Map(
  rawRows
    .filter((item) => item.studentPaymentInstallmentId != null)
    .map((item) => [String(item.studentPaymentInstallmentId), item])
);
  const childrenByParentId = new Map();

  for (const item of rawRows) {
    if (!item.parentInstallmentId) {
      continue;
    }

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
    if (!item || visited.has(item.studentPaymentInstallmentId)) {
      return;
    }

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
      originalStatus: item.originalStatus,
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

const CONTRACT_STATUS_OPTIONS = ["Active", "Inactive", "Expired", "Draft"];

const getEmptyContractForm = () => ({
  status: "Active",
  referenceNo: "",
  fileUrl: "",
  fileName: "",
  startDate: "",
  endDate: "",
  notes: "",
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
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const submittingRef = useRef(false);
  const [gstPercentage, setGstPercentage] = useState(0);
  const [bonusApplied, setBonusApplied] = useState(false);
  const [addBonus, setAddBonus] = useState(false);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [originalPaymentList, setOriginalPaymentList] = useState([]);
  const [originalSchedule, setOriginalSchedule] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmTargetInstallment, setConfirmTargetInstallment] = useState(null);
  const [instituteLocked, setInstituteLocked] = useState(false);
  const [gstInclusive, setGstInclusive] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([0]));
  const handleTabChange = (_e, newValue) => {
    setActiveTab(newValue);
    setVisitedTabs((prev) => {
      if (prev.has(newValue)) return prev;
      const next = new Set(prev);
      next.add(newValue);
      return next;
    });
  };
  const [contracts, setContracts] = useState([]);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingContractKey, setEditingContractKey] = useState(null);
  const [contractForm, setContractForm] = useState(getEmptyContractForm());
  const [contractSaving, setContractSaving] = useState(false);
  const [contractUploading, setContractUploading] = useState(false);
  const contractFileInputRef = useRef(null);

  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    let active = true;

    const loadInstitutes = async () => {
      try {
        const data = await fetchUniqueInstituteNames();
        if (!active) return;

        setInstitutes(data);
      } catch (err) {
        if (active) {
          setLoadError(err.message || "Failed to load institutes.");
        }
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

  // Edit / preselect may set instituteId as ScrappingId — convert to unique name once rows load.
  useEffect(() => {
    if (!institutes.length || !form.instituteId) return;
    const asNumber = Number(form.instituteId);
    if (!Number.isFinite(asNumber) || String(asNumber) !== String(form.instituteId).trim()) {
      return;
    }
    const row = institutes.find((x) => String(x.id) === String(form.instituteId));
    if (!row) return;
    setForm((prev) => ({
      ...prev,
      instituteId: normalizeInstituteName(row.name),
      campusname: prev.campusname || '',
    }));
  }, [institutes, form.instituteId]);

  const uniqueInstituteNames = useMemo(
    () => getUniqueInstituteNames(institutes),
    [institutes],
  );
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
    [institutes, form.instituteId],
  );
const computeCourseEndDateFromWeeks = (startDateStr, weeks) => {
  const start = parseIsoDate(startDateStr);
  const numWeeks = Number(weeks);
  if (!start || !numWeeks) return "";

  const end = new Date(start);
  end.setDate(end.getDate() + numWeeks * 7);

  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

  // Only resolve after campus is chosen so courses match that institute+campus row.
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
      return;
    }
    fetchCoursesByScrappingId(resolvedScrappingId)
      .then((data) => {
        if (!active) return;

        setCourses(data.courses);
        setGstPercentage(data.gstPercentage);
      })
      .catch((err) => {
        if (active) {
          setLoadError(err.message || "Failed to load courses.");
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedScrappingId]);
  
  const selectOptions = useMemo(
    () => ({
      instituteId: instituteSelectOptions,

      courseId: courses.map((item) => ({
        value: item.courseId,
        label: item.courseName,
      })),

      campusname: campusOptions.map((c) => ({
        value: c,
        label: c,
      })),
    }),
    [instituteSelectOptions, courses, campusOptions]
  );

  const buildStudentPayload = (base = form) => ({
    ...base,
    instituteId: resolvedScrappingId
      ? Number(resolvedScrappingId)
      : base.instituteId,
  });

  if (!resource) return null;

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
   const initialRow = list.find((x) => x.installmentNo === 0);
        setForm((prev) => {
          const next = {
            ...prev,
            initialPayment: initialRow ? initialRow.amount : "",
          };
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

   
        if (data.bonusAmount > 0) {
          setBonusApplied(true);
          setAddBonus(true);
        }
      } catch (err) {
        setError(err.message || "Failed to load student.");
      }

      try {
        const contractList = await fetchStudentContracts(id);
        setContracts(contractList || []);
      } catch (err) {
        console.warn("Failed to load student contracts", err);
      }
    }

    loadData();
  }, [id, isEdit, basePath]);

  const parseIsoDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  };

  const formatDateCell = (value) => {
    return formatDateDisplay(value, '-');
  };
const computeCourseEndDate = (startDateStr, durationStr) => {
    const start = parseIsoDate(startDateStr);
    if (!start || !durationStr) return "";

    const match = durationStr.match(/(\d+)\s*(Year|Years|Month|Months|Week|Weeks)/i);
    if (!match) return "";

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const end = new Date(start);

    if (unit.startsWith("year")) end.setFullYear(end.getFullYear() + value);
    else if (unit.startsWith("month")) end.setMonth(end.getMonth() + value);
    else if (unit.startsWith("week")) end.setDate(end.getDate() + value * 7);

    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, "0");
    const d = String(end.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

const durationToWeeks = (durationStr) => {
  if (!durationStr) return "";
  const match = durationStr.match(/(\d+)\s*(Year|Years|Month|Months|Week|Weeks)/i);
  if (!match) return "";
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("year")) return Math.round(value * 52);
  if (unit.startsWith("month")) return Math.round(value * 4.345);
  if (unit.startsWith("week")) return value;
  return "";
};


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

  let commission, gst;
  if (gstInclusive) {
    gst = rawCommission - rawCommission / (1 + gstPct / 100);
    commission = rawCommission - gst;
  } else {
    commission = rawCommission;
    gst = (rawCommission * gstPct) / 100;
  }

  next.commissionAmount = commission.toFixed(2);
  next.gstAmount = gst.toFixed(2);
  next.invoiceAmount = gstInclusive ? rawCommission.toFixed(2) : (commission + gst).toFixed(2);
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

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const paidInstallments = isEdit
    ? originalPaymentList.filter((x) => isPaidLike(x.status))
    : [];

 
  const paidInitialRow = paidInstallments.find((x) => x.installmentNo === 0);
  const paidRegularInstallments = paidInstallments.filter((x) => x.installmentNo !== 0);

  const remainingFee = fee - initialPayment;

  let installmentAmount;
  if (isEdit) {
    const paidRegularAmount = paidRegularInstallments.reduce(
      (sum, x) => sum + Number(x.paidAmount || x.amount || 0), 0
    );
    const remainingAmount = remainingFee - paidRegularAmount;
    const remainingInstallments = count - paidRegularInstallments.length;
    installmentAmount = remainingInstallments > 0 ? remainingAmount / remainingInstallments : 0;
  } else {
    installmentAmount = count > 0 ? remainingFee / count : 0;
  }

  const list = [];

 
  if (initialPayment > 0) {
    if (paidInitialRow) {
      list.push(paidInitialRow);
    } else {
      list.push({
        installmentNo: 0,
        feeType: null,
        dueDate: formatDate(startDate),
        amount: initialPayment.toFixed(2),
        paidAmount: "0.00",
        balance: initialPayment.toFixed(2),
        status: "Pending",
        isInitialPayment: true,
      });
    }
  }

  
  const regularStartDate = new Date(startDate);
  if (initialPayment > 0) {
    if (data.frequency === "Monthly") regularStartDate.setMonth(regularStartDate.getMonth() + 1);
    else if (data.frequency === "Quarterly") regularStartDate.setMonth(regularStartDate.getMonth() + 3);
  }

  for (let i = 0; i < count; i++) {
    const paidRow = paidRegularInstallments.find((x) => x.installmentNo === i + 1);
    if (paidRow) {
      list.push(paidRow);
      continue;
    }

    const dueDate = new Date(regularStartDate);
    if (data.frequency === "Monthly") dueDate.setMonth(regularStartDate.getMonth() + i);
    else if (data.frequency === "Quarterly") dueDate.setMonth(regularStartDate.getMonth() + i * 3);

    list.push({
      installmentNo: i + 1,
      feeType: null,
      dueDate: formatDate(dueDate),
      amount: installmentAmount.toFixed(2),
      paidAmount: "0.00",
      balance: installmentAmount.toFixed(2),
      status: "Pending",
    });
  }

  setPaymentList(list);
};
const FEE_COMPONENT_FIELDS = FEE_TYPES.map((ft) => ft.amountField);

const updateField = (field, value) => {
  setForm((prev) => {
    const next = { ...prev, [field]: value };

    if (field === "instituteId" && value !== prev.instituteId) {
      next.campusname = "";
      next.courseId = "";
      next.courseFee = "";
      next.amountDue = "";
      next.enrollmentFee = 0;
      next.materialFee = 0;
      next.tuitionFee = 0;
      next.oshcFee = 0;
      next.commissionRate = 0;
      next.rateType = "";
      next.commissionPercentage = 0;
      next.gstPercentage = Number(gstPercentage || 0);
      next.commissionAmount = 0;
      next.gstAmount = 0;
      next.invoiceAmount = 0;
      setPaymentList([]);
    }

   if (field === "bonus") {
  setBonusApplied(false);
}

    // Course Changed
    if (!isEdit && field === "courseId") {
      const selectedCourse = courses.find((c) => String(c.courseId) === String(value));

      const ef = Number(selectedCourse?.enrollmentFee || 0);
      const mf = Number(selectedCourse?.materialFee || 0);
      const tf = Number(selectedCourse?.tuitionFee || 0);
      const of = Number(selectedCourse?.oshcFee || 0);
      const hasBreakdown = (ef + mf + tf + of) > 0;

      next.enrollmentFee = ef;
      next.materialFee = mf;
      next.oshcFee = of;
      next.tuitionFee = hasBreakdown ? tf : Number(selectedCourse?.fees || 0);
      next.courseFee = selectedCourse?.fees ?? "";
      next.amountDue = selectedCourse?.fees ?? "";
     next.courseDurationWeeks = durationToWeeks(selectedCourse?.duration);
      next.commissionRate = Number(selectedCourse?.commissionRate ?? 0);
      next.rateType = selectedCourse?.rateType ?? "";
      next.commissionPercentage = Number(next.commissionRate ?? 0);
      next.gstPercentage = Number(gstPercentage || 0);

      next.courseStartDate = next.startDate || next.courseStartDate || "";
      next.courseEndDate = computeCourseEndDate(next.courseStartDate, selectedCourse?.duration);
    }

    // Fee-breakdown field changed (Enrollment/Material/Tuition/OSHC) —
    // recompute the total Course Fee. User can still override Course Fee
    // directly afterwards (editing it doesn't get overwritten again).
    if (FEE_COMPONENT_FIELDS.includes(field)) {
      const total =
        Number(next.enrollmentFee || 0) +
        Number(next.materialFee || 0) +
        Number(next.tuitionFee || 0) +
        Number(next.oshcFee || 0);
      next.courseFee = total.toFixed(2);
      next.amountDue = next.courseFee;
    }

    // Installment Start Date badalne par Course Start Date bhi sync karo
    if (field === "startDate") {
      next.courseStartDate = value;
    }

   if (field === "startDate" || field === "courseStartDate" || field === "courseId") {
  if (next.courseDurationWeeks) {
    // Weeks field manually edit ho chuka ho sakta hai — usi ko source of truth maano
    next.courseEndDate = computeCourseEndDateFromWeeks(next.courseStartDate, next.courseDurationWeeks);
  } else {
    const selectedCourseForDuration = courses.find(
      (c) => String(c.courseId) === String(next.courseId)
    );
    next.courseEndDate = computeCourseEndDate(next.courseStartDate, selectedCourseForDuration?.duration);
  }
}

// Naya block — courseDurationWeeks khud edit hone par end date turant sync ho
if (field === "courseDurationWeeks") {
  next.courseEndDate = computeCourseEndDateFromWeeks(next.courseStartDate, value);
}

    // Commission Calculation
    if (
      field === "courseId" ||
      field === "courseFee" ||
      field === "noOfInstallment" ||
      field === "initialPayment" || 
      field === "commissionPercentage" ||
      field === "gstPercentage" ||
      FEE_COMPONENT_FIELDS.includes(field)
    ) {
      if (field === "commissionPercentage") next.commissionPercentage = Number(value || 0);
      if (field === "gstPercentage") next.gstPercentage = Number(value || 0);
      calculateAmounts(next);
    }

    // Generate Installments
    if (
      field === "courseId" ||
      field === "courseFee" ||
      field === "noOfInstallment" ||
      field === "initialPayment" || 
      field === "frequency" ||
      field === "startDate" ||
      FEE_COMPONENT_FIELDS.includes(field)
    ) {
      generateInstallments(next);
    }

    return next;
  });

  if (error) setError("");
  if (loadError) setLoadError("");
};
  
const commissionRows = useMemo(() => {
  const totalFee = Number(form.courseFee || 0);
  const tuitionFee = Number(form.tuitionFee || 0);

  return paymentList.map((item) => {
  // const fees = getEffectivePaidAmount(paymentList, item);
  const fees = (isPaidLike(item.status) || item.status === "Partial")
  ? getEffectivePaidAmount(paymentList, item)
  : Number(item.amount || 0);
    const tuitionShare = totalFee > 0 && tuitionFee > 0 ? (fees * tuitionFee) / totalFee : fees;

    const rawCommission = (tuitionShare * Number(form.commissionPercentage || 0)) / 100;
    const gstPct = Number(form.gstPercentage || 0);

    let commission, gst;
    if (gstInclusive) {
      gst = rawCommission - rawCommission / (1 + gstPct / 100);
      commission = rawCommission - gst;
    } else {
      commission = rawCommission;
      gst = (rawCommission * gstPct) / 100;
    }

    let applyBonus = false;
    switch (form.bonusOption) {
      case "Everytime": applyBonus = true; break;
      case "Quarterly": applyBonus = item.installmentNo % 3 === 0; break;
      case "HalfYearly": applyBonus = item.installmentNo % 6 === 0; break;
      case "Yearly": applyBonus = item.installmentNo === paymentList.length; break;
      default: applyBonus = false;
    }

    let bonus = 0;
    if (addBonus && bonusApplied && applyBonus) {
      if (form.bonusType === "Percentage") bonus = (fees * Number(form.bonus || 0)) / 100;
      else if (form.bonusType === "Fixed") bonus = Number(form.bonus || 0);
    }

    const invoice = gstInclusive ? rawCommission + bonus : commission + gst + bonus;

    return {
      installmentNo: item.installmentNo,
      feesDate: item.dueDate,
      fees: fees.toFixed(2),
      paymentStatus: item.status,
      commission: commission.toFixed(2),
      gst: gst.toFixed(2),
      bonus: bonus.toFixed(2),
      invoice: invoice.toFixed(2),
      status: "Pending",
    };
  });
}, [paymentList, form.courseFee, form.tuitionFee, form.commissionPercentage, form.gstPercentage, form.bonus, form.bonusType, form.bonusOption, bonusApplied, addBonus, gstInclusive]);
  const handleCreate = async () => {
    if (submittingRef.current) return;
if (!isEdit && (!form.initialPayment || Number(form.initialPayment) <= 0)) {
    setError("Please enter Initial Payment before saving the student.");
    return;
  }

  if (!isEdit && (!form.courseFee || Number(form.courseFee) <= 0)) {
    setError("Course Fee cannot be zero. Please enter fee details before saving.");
    return;
  }

if (!form.noOfInstallment || Number(form.noOfInstallment) <= 0) {
  setError("Please enter Number of Installments before saving the student.");
  return;
}
const invalidPartialRow = paymentList.find(
  (x) => x.status === "Partial" && (!x.paidAmount || Number(x.paidAmount) <= 0)
);
if (invalidPartialRow) {
  setError(
    `Installment ${invalidPartialRow.isInitialPayment ? "Initial Payment" : invalidPartialRow.installmentNo} is marked "Partial" but Paid Amount is 0. Please enter a paid amount or change the status.`
  );
  return;
}
    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    // Total installment count across all fee types — replaces the old
    // single "noOfInstallment" field.
 const totalInstallmentCount = Number(form.noOfInstallment || 0);
const totalScheduledAmount = Number(form.courseFee || 0);  
    try {
      let studentId;
      let scheduleId;
      let commissionId;
      let scheduleChanged = false;

      if (!isEdit) {

        const student = await createStudentWithPaymentSchedule(
          buildStudentPayload()
        );

        studentId = student.studentId ?? student.StudentId;

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

        commissionId =
          commission.commissionId ?? commission.CommissionId;

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
            console.warn("Failed to save contract", err);
          }
        }

      } else {
        const persistedRows = paymentList.filter(
          (x) => x.studentPaymentInstallmentId
        );

      

        scheduleChanged =
          originalSchedule.noOfInstallment !== totalInstallmentCount ||
          originalSchedule.frequency !== form.frequency ||
          originalSchedule.startDate !== form.startDate;

        const result = await updateStudentPaymentSchedule({
          studentId: form.studentId,
          noOfInstallments: totalInstallmentCount,
          frequency: form.frequency,
          firstDueDate: form.startDate,

          paymentList: persistedRows.map(x => ({
            studentPaymentInstallmentId: x.studentPaymentInstallmentId,
            installmentNo: Number(x.apiInstallmentNo ?? x.installmentNo),
            parentInstallmentId: x.parentInstallmentId
              ?? (x.parentInstallmentNo
                ? paymentList.find((row) => row.installmentNo === x.parentInstallmentNo)?.studentPaymentInstallmentId ?? null
                : null),
            dueDate: x.dueDate || null,
            feesAmount: Number(x.amount || 0),
            paymentStatus: x.status,
            paidAmount: x.paidAmount ? Number(x.paidAmount) : 0,
            balanceAmount: x.balance ? Number(x.balance) : 0,
            paidDate: x.paidDate || null,
            documentUrl: x.documentUrl ?? null,
            installmentImage: x.documentUrl ?? x.installmentImage ?? null,
            feeType: x.feeType ?? null,
          })),
          commissionHistory: commissionHistory.map(x => ({
            CommissionDetailId: x.commissionDetailId,
            commissionStatus: x.commissionStatus,
          })),
        });

        scheduleId = result.scheduleId;
        commissionId = result.commissionId;
      }

      if (!isEdit || scheduleChanged) {

        const installmentIds = [];

        for (const item of paymentList) {

          if (isEdit && isPaidLike(item.status))
            continue;

          const installment = await createStudentPaymentInstallment({
            scheduleId,
            installmentNo: item.installmentNo,
            parentInstallmentId: item.parentInstallmentNo
              ? paymentList.find(x => x.installmentNo === item.parentInstallmentNo)?.studentPaymentInstallmentId ?? null
              : null,
            dueDate: item.dueDate,
            feesAmount: Number(item.amount),
            paidAmount: Number(item.paidAmount),
            balanceAmount: Number(item.balance),
            paymentStatus: item.status,
            documentUrl: item.documentUrl ?? null,
            feeType: item.feeType ?? null,
          });

          installmentIds.push(
            installment.studentPaymentInstallmentId ??
            installment.StudentPaymentInstallmentId
          );
        }

        let index = 0;

        for (const row of commissionRows) {

          if (isEdit && isPaidLike(row.paymentStatus))
            continue;

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
            remark: form.remark ?? "",
          });

          index++;
        }
      }


      if (isEdit && !scheduleChanged) {
        const newSplitRows = paymentList.filter(x => !x.studentPaymentInstallmentId);

        const splitBase = Math.max(9000, totalInstallmentCount + 9000);
        let nextInstallmentNo = splitBase +
          paymentList.filter(x => Number(x.apiInstallmentNo) >= splitBase).length +
          1;


        const idByInstallmentNo = new Map(
          paymentList
            .filter(x => x.studentPaymentInstallmentId)
            .map(x => [x.installmentNo, x.studentPaymentInstallmentId])
        );


        const sortedNewSplitRows = [...newSplitRows].sort(
          (a, b) => a.installmentNo - b.installmentNo
        );

        for (const item of sortedNewSplitRows) {
          const parentId = item.parentInstallmentNo
            ? idByInstallmentNo.get(item.parentInstallmentNo) ?? null
            : null;

          const installment = await createStudentPaymentInstallment({
            scheduleId,
            installmentNo: nextInstallmentNo++,
            parentInstallmentId: parentId,
            dueDate: item.dueDate,
            feesAmount: Number(item.amount),
            paidAmount: Number(item.paidAmount || 0),
            balanceAmount: Number(item.balance ?? item.amount),
            paymentStatus: item.status,
            documentUrl: item.documentUrl ?? null,
            feeType: item.feeType ?? null,
          });

          const newInstallmentId =
            installment.studentPaymentInstallmentId ??
            installment.StudentPaymentInstallmentId;

          idByInstallmentNo.set(item.installmentNo, newInstallmentId);

          const row = commissionRows.find(x => x.installmentNo === item.installmentNo);

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
              remark: form.remark ?? "",
            });
          }
        }
      }

      alert(isEdit ? "Student updated successfully." : "Student created successfully.");

      setForm(getEmptyForm(basePath));
      setPaymentList([]);
      setCourses([]);
      setBonusApplied(false);
      setAddBonus(false);
      setGstPercentage(0);
      setContracts([]);

      navigate(basePath);

    } catch (err) {
      setError(err.message || "Failed to save student.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const openAddContract = () => {
    setEditingContractKey(null);
    setContractForm(getEmptyContractForm());
    setContractDialogOpen(true);
  };

  const openEditContract = (contract, index) => {
    setEditingContractKey(contract.contractId ?? `local-${index}`);
    setContractForm({
      status: contract.status || "Active",
      referenceNo: contract.referenceNo || "",
      fileUrl: contract.fileUrl || "",
      fileName: contract.fileName || "",
      startDate: contract.startDate || "",
      endDate: contract.endDate || "",
      notes: contract.notes || "",
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

    // Upload endpoint is scoped to a studentId — a brand-new,
    // not-yet-saved student doesn't have one yet.
    const studentId = form?.studentId;
    if (!studentId) {
      alert("Please save the student first (Student Details tab), then upload contract files here.");
      if (contractFileInputRef.current) contractFileInputRef.current.value = "";
      return;
    }

    setContractUploading(true);
    try {
      const result = await uploadStudentContractFile(studentId, file);
      updateContractField("fileUrl", result?.fileUrl ?? "");
      updateContractField("fileName", result?.fileName ?? file.name);
    } catch (err) {
      alert(err.message || "Failed to upload file.");
    } finally {
      setContractUploading(false);
      if (contractFileInputRef.current) contractFileInputRef.current.value = "";
    }
  };
  const handleSaveContract = async () => {
    if (!contractForm.status) {
      alert("Please select a contract status.");
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
        // Existing student — persist immediately.
        if (editingContractKey && typeof editingContractKey === "number") {
          const updated = await updateStudentContract(editingContractKey, {
            ...payload,
            studentId: form.studentId,
          });
          setContracts((prev) =>
            prev.map((c) => (c.contractId === editingContractKey ? updated : c))
          );
        } else {
          const created = await createStudentContract({
            ...payload,
            studentId: form.studentId,
          });

          setContracts((prev) => {
            if (editingContractKey) {
              const idx = Number(String(editingContractKey).replace("local-", ""));
              return prev.map((c, i) => (i === idx ? created : c));
            }
            return [...prev, created];
          });
        }
      } else {
        // New student not yet saved — keep locally, persist after student is created.
        setContracts((prev) => {
          if (editingContractKey && String(editingContractKey).startsWith("local-")) {
            const idx = Number(String(editingContractKey).replace("local-", ""));
            return prev.map((c, i) => (i === idx ? { ...c, ...payload } : c));
          }
          return [...prev, { contractId: null, ...payload }];
        });
      }

      setContractDialogOpen(false);
      setEditingContractKey(null);
    } catch (err) {
      alert(err.message || "Failed to save contract.");
    } finally {
      setContractSaving(false);
    }
  };

  const handleDeleteContract = async (contract, index) => {
    if (!window.confirm("Delete this contract?")) return;

    try {
      if (contract.contractId) {
        await deleteStudentContract(contract.contractId, form.studentId);
      }
      setContracts((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      alert(err.message || "Failed to delete contract.");
    }
  };

  const handleApplyBonus = () => {
    if (!form.bonus || Number(form.bonus) <= 0) {
      alert("Please enter Bonus.");
      return;
    }

    setBonusApplied(true);
  };
  const handleConfirmedByStudent = (installment, documentUrl) => {
    setPaymentList((prev) =>
      prev.map((x) => {
        if (x.installmentNo !== installment.installmentNo) return x;

        const paidLikeAmount = hasSplitChild(prev, x.installmentNo)
          ? (x.paidAmount || "0.00")
          : Number(x.amount || 0).toFixed(2);

        return {
          ...x,
          status: "ConfirmedByStudent",
          paidAmount: paidLikeAmount,
          balance: "0.00",
          paidDate: x.paidDate || new Date().toISOString().slice(0, 10),
          documentUrl,
        };
      })
    );


    setCommissionHistory((prev) =>
      prev.map((x) =>
        x.installmentNo === installment.installmentNo
          ? {
              ...x,
              paymentStatus: "ConfirmedByStudent",
            }
          : x
      )
    );

    setConfirmDialogOpen(false);
    setConfirmTargetInstallment(null);
  };

  const historyRows = useMemo(() => {
    if (!isEdit) return commissionRows;

    return paymentList
      .map((payment) => {
        const commissionRow = commissionRows.find(
          x => x.installmentNo === payment.installmentNo
        );

        const historyRow = commissionHistory.find(
          x => x.installmentNo === payment.installmentNo
        );

        return {
        installmentNo: payment.installmentNo,
        feeType: commissionRow?.feeType ?? historyRow?.feeType,
        dueDate: commissionRow?.feesDate ?? historyRow?.dueDate,
        feesAmount: commissionRow?.fees,          
        commissionAmount: commissionRow?.commission,
        gstAmount: commissionRow?.gst,
        bonusAmount: commissionRow?.bonus,
        invoiceAmount: commissionRow?.invoice,
        paymentStatus: payment.status,
        commissionDetailId: historyRow?.commissionDetailId,
        commissionHistoryOriginalStatus: historyRow?.commissionStatus,
        commissionStatus:
          historyRow?.commissionStatus ??
          commissionRow?.commissionStatus ??
          "Pending",
      };
      })
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }, [isEdit, paymentList, commissionHistory, commissionRows]);

const hasSplitChildInPaymentList = (installmentNo) =>
  paymentList.some((row) => row.parentInstallmentNo === installmentNo);
const totals = useMemo(() => ({
  fees: historyRows.reduce((sum, x) => sum + Number(x.feesAmount ?? x.fees ?? 0), 0),
  commission: historyRows.reduce((sum, x) => sum + Number(x.commissionAmount ?? x.commission ?? 0), 0),
  gst: historyRows.reduce((sum, x) => sum + Number(x.gstAmount ?? x.gst ?? 0), 0),
  bonus: historyRows.reduce((sum, x) => sum + Number(x.bonusAmount ?? x.bonus ?? 0), 0),
  invoice: historyRows.reduce((sum, x) => sum + Number(x.invoiceAmount ?? x.invoice ?? 0), 0),
}), [historyRows]);
const [editPastDataAll, setEditPastDataAll] = useState(false);
const [editPastDataRows, setEditPastDataRows] = useState(() => new Set());

const isRowPastDataEditable = (installmentNo) =>
  editPastDataAll || editPastDataRows.has(installmentNo);

const canEditPaidFields = (item) => {
  // Bilkul naya row (abhi DB mein save nahi hua) — freely editable.
  if (!item.studentPaymentInstallmentId) return true;

  // Confirmed by College — hamesha locked, sirf checkbox se edit.
  if (isConfirmedByCollege(item)) return isRowPastDataEditable(item.installmentNo);

  // Pehle se saved Partial — locked, sirf checkbox se edit.
  if (isPersistedPartial(item)) return isRowPastDataEditable(item.installmentNo);

  // Newly-set Partial (abhi session mein badla) — ek baar entry allow karo.
  if (isNewlySetPartial(item)) return true;

  // Pending row — sirf checkbox se editable (past-data correction).
  return isRowPastDataEditable(item.installmentNo);
};
const isNewlySetPartial = (item) =>
  item.status === "Partial" && item.originalStatus !== "Partial";
const isPersistedPartial = (item) =>
  item.status === "Partial" && item.originalStatus === "Partial";
const isConfirmedByCollege = (item) =>
  item.status === "ConfirmedByCollege" ||
  item.originalStatus === "ConfirmedByCollege" ||
  item.originalStatus === "PaidByCollege";

const isRowLocked = (item) => {
  const groupNo = getGroupNo(item);
  const groupComplete = isGroupFullyCovered(paymentList, groupNo);
  const isLastOfGroup = isLastInGroup(paymentList, groupNo, item);
  return (
    isConfirmedByCollege(item) ||
    (groupComplete && !isLastOfGroup && !isPaidLike(item.status) && !isRowPastDataEditable(item.installmentNo))
  );
};

const toggleRowPastData = (installmentNo) => {
  setEditPastDataRows((prev) => {
    const next = new Set(prev);
    if (next.has(installmentNo)) next.delete(installmentNo);
    else next.add(installmentNo);
    return next;
  });
};
  const canEditStatus = (index) => {
  const item = paymentList[index];
  const groupNo = getGroupNo(item);
  const isRootOfGroup = item.installmentNo === groupNo;

  if (!isRootOfGroup) return true;

  if (index === 0) return true;

  const prevStatus = paymentList[index - 1]?.status;
  return isPaidLike(prevStatus) || prevStatus === "Partial";
};
  const canEditCommissionStatus = (installmentNo) => {
    if (installmentNo === 1) return true;

    const previous = historyRows.find(
      x => x.installmentNo === installmentNo - 1
    );

    return previous?.commissionStatus === "Paid";
  };

  return (
    <FormPageLayout title={isEdit ? `Edit ${resource.singular}` : `Add new ${resource.singular.toLowerCase()}`}>
      <Paper elevation={0} sx={{ ...formPaperSx, width: "100%" }}>
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
          <Tab label="Student Details" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 48 }} />
          <Tab label="Payment Schedule" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 48 }} />
          <Tab label="Commission" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 48 }} />
          <Tab label="Contracts" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 48 }} />
        </Tabs>

        {/* Tab 0: Student Details */}
        {activeTab === 0 && (
          <FormSectionsLayout
            sections={[resource.sections[0]]}
            form={form}
            onChange={updateField}
            selectOptions={selectOptions}
            requiredFields={resource.requiredFields}
            disabled={isEdit}
          />
        )}

        {/* Tab 1: Student Payment Schedule + Student Payment List */}
        {activeTab === 1 && (
          <>
            <FormSectionsLayout
              sections={[resource.sections[1]]}
              form={form}
              onChange={updateField}
              selectOptions={selectOptions}
              requiredFields={resource.requiredFields}
              disabled={isEdit}
              disabledFields={[
                "assignment",
                ...(!form.instituteId ? ["campusname"] : []),
              ]}
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
    borderColor: "divider",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  }}
>
  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
    Course Cost
  </Typography>
  <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
    Fee breakdown for the selected course
  </Typography>

  <TableContainer
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      overflow: "hidden",
    }}
  >
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: "#f8f9fc" }}>
          <TableCell
            sx={{
              fontWeight: 700,
              color: "text.secondary",
              textTransform: "uppercase",
              fontSize: "0.72rem",
              letterSpacing: 0.4,
              py: 1.25,
            }}
          >
            Description
          </TableCell>
          <TableCell
            align="right"
            sx={{
              fontWeight: 700,
              color: "text.secondary",
              textTransform: "uppercase",
              fontSize: "0.72rem",
              letterSpacing: 0.4,
              width: 220,
              py: 1.25,
            }}
          >
            Amount
          </TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {FEE_TYPES.map(({ key, label, amountField }, idx) => (
          <TableRow
            key={key}
            sx={{
              backgroundColor: idx % 2 === 0 ? "#fff" : "#fafbfd",
              "&:hover": { backgroundColor: "#f2f5fa" },
              "& td": { borderBottom: "1px solid", borderColor: "divider" },
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
                inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
                InputProps={{
                  startAdornment: (
                    <Typography sx={{ color: "text.secondary", mr: 0.5 }}>$</Typography>
                  ),
                }}
                sx={{
                  width: 170,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    backgroundColor: "#fff",
                  },
                }}
              />
            </TableCell>
          </TableRow>
        ))}

        <TableRow sx={{ backgroundColor: "#eef1f8" }}>
          <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Total course fees due</TableCell>
          <TableCell align="right" sx={{ py: 1.25 }}>
            <TextField
              size="small"
              value={form.courseFee ?? 0}
              disabled
              InputProps={{
                startAdornment: (
                  <Typography sx={{ color: "text.secondary", mr: 0.5, fontWeight: 700 }}>$</Typography>
                ),
              }}
              inputProps={{ style: { textAlign: "right", fontWeight: 700 } }}
              sx={{
                width: 170,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                  backgroundColor: "#fff",
                },
              }}
            />
          </TableCell>
        </TableRow>
        <TableRow>
  <TableCell sx={{ fontWeight: 500, py: 1.25 }}>Initial Payment (Upfront)</TableCell>
  <TableCell align="right" sx={{ py: 1 }}>
    <TextField
      size="small"
      type="number"
      value={form.initialPayment ?? ""}
      onChange={(e) => updateField("initialPayment", e.target.value)}
      disabled={isEdit}
      inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
      InputProps={{
        startAdornment: (
          <Typography sx={{ color: "text.secondary", mr: 0.5 }}>$</Typography>
        ),
      }}
      sx={{
        width: 170,
        "& .MuiOutlinedInput-root": {
          borderRadius: 1.5,
          backgroundColor: "#fff",
        },
      }}
    />
  </TableCell>
</TableRow>
      </TableBody>
    </Table>
  </TableContainer>
</Paper>

<Box sx={{ height: 24 }} />

            <Box sx={{ height: 24 }} />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                }}
              >
                Student Payment List
              </Typography>
  
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ "& .MuiTableCell-root": { fontWeight: 700 } }}>
                    <TableRow>
                      
                      <TableCell>Installment</TableCell>
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

                                if (e.target.checked) {
                                  setEditPastDataRows(new Set());
                                }
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
      <TableRow key={item.installmentNo}>
        {/* 1. Installment */}
        <TableCell>{item.isInitialPayment ? "Initial Payment" : item.installmentNo}</TableCell>

        {/* 2. Fees */}
        <TableCell>
          {(!item.studentPaymentInstallmentId || item.isInitialPayment) && !isPaidLike(item.status) ? (
            <TextField
              size="small"
              type="number"
              value={item.amount}
              onChange={(e) => {
                const val = e.target.value;
                const newAmount = Number(val || 0);
                const oldAmount = Number(item.amount || 0);
                const delta = newAmount - oldAmount;

                setPaymentList((prev) =>
                  prev.map((x) =>
                    x.installmentNo === item.installmentNo
                      ? {
                          ...x,
                          amount: val,
                          balance: (newAmount - Number(x.paidAmount || 0)).toFixed(2),
                        }
                      : x
                  )
                );

                setForm((prev) => {
                  const next = { ...prev };
                  next.tuitionFee = (Number(prev.tuitionFee || 0) + delta).toFixed(2);
                  next.courseFee = (Number(prev.courseFee || 0) + delta).toFixed(2);
                  next.amountDue = next.courseFee;
                  calculateAmounts(next);
                  return next;
                });
              }}
              inputProps={{ min: 0, step: "0.01" }}
              sx={{ width: 110 }}
            />
          ) : (
            item.amount
          )}
        </TableCell>

        {/* 3. Fees Date */}
        <TableCell>{formatDateCell(item.dueDate)}</TableCell>

        {/* 4. Paid Checkbox - Sirf Pending status hone par enable rahega */}
        <TableCell>
          <Checkbox
            size="small"
            checked={isRowPastDataEditable(item.installmentNo)}
            disabled={editPastDataAll || item.status !== "Pending"}
            onChange={() => toggleRowPastData(item.installmentNo)}
          />
        </TableCell>

        {/* 5. Paid Date - Status Pending hone par hi edit hoga, warna lock / plain text rahega */}
        <TableCell>
          {canEditPaidFields(item) ? (
            <TextField
              size="small"
              type="date"
              value={item.paidDate || ""}
              onChange={(e) => {
                const val = e.target.value;
                setPaymentList((prev) =>
                  prev.map((x) =>
                    x.installmentNo === item.installmentNo ? { ...x, paidDate: val } : x
                  )
                );
              }}
              sx={{ width: 140 }}
            />
          ) : (
            formatDateCell(item.paidDate) || "-"
          )}
        </TableCell>

        {/* 6. Payment Status */}
        <TableCell>
          {isEdit ? (
            <Select
              size="small"
              value={item.status}
              disabled={
                (item.originalStatus && item.originalStatus !== "Pending" && !isRowPastDataEditable(item.installmentNo)) ||
    item.originalStatus === "ConfirmedByCollege" ||
    item.originalStatus === "PaidByCollege" ||
    (isPersistedPartial(item) && !isRowPastDataEditable(item.installmentNo)) || 
    (groupComplete && !isLastOfGroup && !isPaidLike(item.status) && item.status !== "Partial" && !isRowPastDataEditable(item.installmentNo))
  }
              onChange={async (e) => {
                const value = e.target.value;
                if (value === "ConfirmedByStudent") {
                  try {
                    await confirmInstallmentByStudent(
                      item.studentPaymentInstallmentId
                    );
                    setPaymentList((prev) =>
                      prev.map((x) => {
                        if (x.installmentNo !== item.installmentNo) return x;

                        const paidLikeAmount = hasSplitChild(prev, x.installmentNo)
                          ? (x.paidAmount || "0.00")
                          : x.amount;

                        return {
                          ...x,
                          status: "ConfirmedByStudent",
                          paidAmount: paidLikeAmount,
                          balance: "0.00",
                          paidDate: x.paidDate || new Date().toISOString().slice(0, 10),
                        };
                      })
                    );

                    setConfirmTargetInstallment(item);
                    setConfirmDialogOpen(true);
                  } catch (err) {
                    console.error("Failed to confirm installment by student:", err);
                  }
                  return;
                }

                setPaymentList((prev) => {
                  let updated = prev.map((x) => {
                    if (x.installmentNo === item.installmentNo) {
                      const isPaid = isPaidLike(value);
                      const isPartial = value === "Partial";

                      const paidLikeAmount = hasSplitChild(prev, x.installmentNo)
                        ? (x.paidAmount || "0.00")
                        : x.amount;

                      return {
                        ...x,
                        status: value,
                        paidAmount: isPaid ? paidLikeAmount : (isPartial ? (x.paidAmount || "0.00") : "0.00"),
                        balance: isPaid ? "0.00" : (isPartial ? x.balance : x.amount),
                        paidDate: (isPaid || isPartial) ? (x.paidDate || new Date().toISOString().slice(0, 10)) : null,
                      };
                    }
                    return x;
                  });

                  if (value === "Partial") {
                    const alreadySplit = updated.some(
                      (x) => x.parentInstallmentNo === item.installmentNo
                    );

                    if (!alreadySplit) {
                      const currentItem = updated.find(
                        (x) => x.installmentNo === item.installmentNo
                      );
                      const remainingAmountNum = Number(
                        currentItem?.balance ?? currentItem?.amount ?? 0
                      );

                      if (remainingAmountNum > EPSILON) {
                        const remainingAmount = remainingAmountNum.toFixed(2);
                        const rootNo = item.parentGroupNo ?? item.installmentNo;
                        const childCount = updated.filter(
                          (x) => x.parentGroupNo === rootNo && x.installmentNo !== item.installmentNo
                        ).length;
                        const newInstallmentNo = Number(
                          (rootNo + (childCount + 1) / 10).toFixed(2)
                        );

                        const remainingRow = {
                          installmentNo: newInstallmentNo,
                          parentInstallmentNo: item.installmentNo,
                          parentGroupNo: rootNo,
                          feeType: item.feeType,
                          dueDate: item.dueDate,
                          amount: remainingAmount,
                          paidAmount: "0.00",
                          balance: remainingAmount,
                          status: "Pending",
                        };

                        const insertIndex =
                          updated.findIndex(
                            (x) => x.installmentNo === item.installmentNo
                          ) + 1;

                        updated = [
                          ...updated.slice(0, insertIndex),
                          remainingRow,
                          ...updated.slice(insertIndex),
                        ];
                      }
                    }
                  } else {
                    const existingChild = updated.find(
                      (x) => x.parentInstallmentNo === item.installmentNo && !x.studentPaymentInstallmentId
                    );

                    if (existingChild) {
                      updated = updated.filter((x) => x !== existingChild);
                      updated = updated.map((x) =>
                        x.installmentNo === item.installmentNo
                          ? { ...x, balance: isPaidLike(value) ? "0.00" : x.amount }
                          : x
                      );
                    }
                  }

                  return updated;
                });

                setCommissionHistory((prev) =>
                  prev.map((x) => {
                    if (x.installmentNo === item.installmentNo) {
                      return {
                        ...x,
                        paymentStatus: value,
                      };
                    }
                    if (value === "Pending" && x.installmentNo > item.installmentNo) {
                      return {
                        ...x,
                        paymentStatus: "Pending",
                      };
                    }
                    return x;
                  })
                );
              }}
              MenuProps={{ container: typeof document !== 'undefined' ? document.body : undefined }}
              sx={{
                width: 150,
                height: 40,
                "& .MuiSelect-select": {
                  minWidth: "70px",
                  padding: "8px 32px 8px 12px",
                },
              }}
            >
              <MenuItem value="Pending">Pending</MenuItem>
              {!item.isInitialPayment && (
                <MenuItem value="Partial" disabled={!canEditStatus(index)}>
                  Partial
                </MenuItem>
              )}
              <MenuItem
                value="ConfirmedByCollege"
                disabled={!(canEditStatus(index) || (groupComplete && isLastOfGroup))}
              >
                Confirmed by College
              </MenuItem>
              <MenuItem
                value="ConfirmedByStudent"
                disabled={!(canEditStatus(index) || (groupComplete && isLastOfGroup))}
              >
                Confirmed by Student
              </MenuItem>
            </Select>
          ) : (
            item.status
          )}
        </TableCell>

        {/* 7. Paid Amount - Status Pending hone par hi edit hoga, warna lock / plain text rahega */}
       <TableCell>
{canEditPaidFields(item) ? (
    <TextField
      size="small"
      type="number"
      value={item.paidAmount ?? "0"}
      onChange={(e) => {
        const rawVal = e.target.value;
        const lockedAmount = getLockedDescendantAmount(paymentList, item.installmentNo);
        const maxAmount = Number(item.amount || 0) - lockedAmount;

        let numVal = Number(rawVal || 0);
        if (Number.isNaN(numVal)) numVal = 0;
        if (numVal > maxAmount) numVal = maxAmount;
        if (numVal < 0) numVal = 0;

        const val = rawVal === "" ? "" : String(numVal);

        setPaymentList((prev) => {
          let updatedRows = prev.map((x) => {
            if (x.installmentNo === item.installmentNo) {
              const newBalance = (Number(x.amount) - Number(val || 0)).toFixed(2);
              return { ...x, paidAmount: val, balance: newBalance };
            }
            return x;
          });

          updatedRows = resyncSplitChain(updatedRows, item.installmentNo);

          const hasChild = updatedRows.some(
            (x) => x.parentInstallmentNo === item.installmentNo
          );
          const newRemaining = Number(item.amount) - Number(val || 0);

       if (!hasChild && item.status === "Partial" && newRemaining > EPSILON) {
  const rootNo = item.parentGroupNo ?? item.installmentNo;
  const childCount = updatedRows.filter(
    (x) => x.parentGroupNo === rootNo && x.installmentNo !== item.installmentNo
  ).length;
  const newInstallmentNo = Number(
    (rootNo + (childCount + 1) / 10).toFixed(2)
  );

  const remainingRow = {
    installmentNo: newInstallmentNo,
    parentInstallmentNo: item.installmentNo,
    parentGroupNo: rootNo,
    feeType: item.feeType,
    dueDate: item.dueDate,
    amount: newRemaining.toFixed(2),
    paidAmount: "0.00",
    balance: newRemaining.toFixed(2),
    status: "Pending",
  };

  const insertIndex =
    updatedRows.findIndex(
      (x) => x.installmentNo === item.installmentNo
    ) + 1;

  updatedRows = [
    ...updatedRows.slice(0, insertIndex),
    remainingRow,
    ...updatedRows.slice(insertIndex),
  ];
}

          return updatedRows;
        });
      }}
      inputProps={{
        min: 0,
        max: Number(item.amount || 0) - getLockedDescendantAmount(paymentList, item.installmentNo),
        step: "0.01",
      }}
      sx={{ width: 120 }}
    />
  ) : (
    Number(getEffectivePaidAmount(paymentList, item)).toFixed(2)
  )}
</TableCell>

        {/* 8. Document */}
        <TableCell>
          {item.documentUrl ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => window.open(item.documentUrl, "_blank")}
              sx={{ textTransform: "none" }}
            >
              View
            </Button>
          ) : (
            "-"
          )}
        </TableCell>
      </TableRow>
    );
  })
) : (
  <TableRow>
    <TableCell colSpan={8} align="center">
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

        {/* Tab 2: Commission, Bonus, GST, Commission History */}
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
                  disabled={isEdit}
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
              label={gstInclusive ? "GST Inclusive" : "GST Exclusive"}
            />

            {addBonus && (
              <>
                <FormSectionsLayout
                  sections={[resource.sections[3]]}
                  form={form}
                  onChange={updateField}
                  selectOptions={selectOptions}
                  requiredFields={resource.requiredFields}
                  disabled={isEdit}
                />

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, mb: 2, }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleApplyBonus}
                    disabled={isEdit}
                  >
                    Apply Bonus
                  </Button>
                </Box>
              </>
            )}

            <Box sx={{ height: 24 }} />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                }}>  Commission History  </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ "& .MuiTableCell-root": { fontWeight: 700 } }}>
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
                        {historyRows.map((row) => (
                          <TableRow key={row.installmentNo}>
                            <TableCell>{row.installmentNo}</TableCell>
                            <TableCell>{row.feeType || "-"}</TableCell>
                            <TableCell>{formatDateCell(row.dueDate ?? row.feesDate)}</TableCell>
                            <TableCell>{Number(row.feesAmount ?? row.fees).toFixed(2)}</TableCell>
                            <TableCell>{row.paymentStatus}</TableCell>
                            <TableCell>{Number(row.commissionAmount ?? row.commission).toFixed(2)}</TableCell>
                            <TableCell>{Number(row.bonusAmount ?? row.bonus).toFixed(2)}</TableCell>
                            <TableCell>{Number(row.gstAmount ?? row.gst).toFixed(2)}</TableCell>
                            <TableCell>{Number(row.invoiceAmount ?? row.invoice).toFixed(2)}</TableCell>
                            <TableCell>
      {isEdit ? (
        <Select
          size="small"
          value={row.commissionStatus ?? "Pending"}
          disabled={
            String(row.commissionHistoryOriginalStatus ?? "")
              .trim()
              .toLowerCase() === "paid"
          }
          onChange={(e) => {
            const value = e.target.value;

            setCommissionHistory((prev) =>
              prev.map((x) => {
                if (x.installmentNo === row.installmentNo) {
                  return {
                    ...x,
                    commissionStatus: value,
                  };
                }

                if (
                  value === "Pending" &&
                  x.installmentNo > row.installmentNo
                ) {
                  return {
                    ...x,
                    paymentStatus: "Pending",
                    commissionStatus: "Pending",
                  };
                }

                return x;
              })
            );
          }}
          MenuProps={{
            container:
              typeof document !== "undefined"
                ? document.body
                : undefined,
          }}
          sx={{
            width: 110,
            height: 40,
            "& .MuiSelect-select": {
              minWidth: "70px",
              padding: "8px 32px 8px 12px",
            },
          }}
        >
          <MenuItem value="Pending">Pending</MenuItem>

          <MenuItem
            value="Paid"
            disabled={!canEditCommissionStatus(row.installmentNo)}
          >
            Paid
          </MenuItem>
        </Select>
      ) : (
        row.commissionStatus ?? "Pending"
      )}
    </TableCell>
                          </TableRow>
                        ))}

                        <TableRow sx={{ backgroundColor: "#f5f7fb" }}>
                          <TableCell colSpan={3}><b>Total</b></TableCell>
                          <TableCell><b>{totals.fees.toFixed(2)}</b></TableCell>
                          <TableCell />
                          <TableCell><b>{totals.commission.toFixed(2)}</b></TableCell>
                          <TableCell><b>{totals.bonus.toFixed(2)}</b></TableCell>
                          <TableCell><b>{totals.gst.toFixed(2)}</b></TableCell>
                          <TableCell><b>{totals.invoice.toFixed(2)}</b></TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} align="center">
                          No Commission History
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {/* Tab 3: Contracts */}
        {activeTab === 3 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Contracts
              </Typography>

              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={openAddContract}
              >
                Add contract
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ "& .MuiTableCell-root": { fontWeight: 700 } }}>
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
                        <TableCell>{contract.referenceNo || "-"}</TableCell>
                        <TableCell>{formatDateCell(contract.startDate)}</TableCell>
                        <TableCell>{formatDateCell(contract.endDate)}</TableCell>
                        <TableCell>
                          {contract.fileUrl ? (
                            <Button
                              size="small"
                              onClick={() => window.open(contract.fileUrl, "_blank")}
                              sx={{ textTransform: "none" }}
                            >
                              View file
                            </Button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEditContract(contract, index)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteContract(contract, index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No Contracts
                      </TableCell>
                    </TableRow>
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
          submitLabel={
            submitting
              ? (isEdit ? "Updating..." : "Saving...")
              : (isEdit ? "Update Student" : "Save Student")
          }
          submitDisabled={
            !isFormValid(resource, form) ||
            submitting ||
           (!isEdit && !visitedTabs.has(2)) ||
    (!isEdit && (!form.initialPayment || Number(form.initialPayment) <= 0))  ||
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
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {editingContractKey !== null ? "Edit contract" : "Add contract"}
            <IconButton size="small" onClick={closeContractDialog}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Contract status"
                value={contractForm.status}
                onChange={(e) => updateContractField("status", e.target.value)}
              >
                {CONTRACT_STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                size="small"
                label="Contract reference no."
                value={contractForm.referenceNo}
                onChange={(e) => updateContractField("referenceNo", e.target.value)}
              />

              <TextField
                fullWidth
                size="small"
                label="Contract file URL"
                helperText="Paste a link to the uploaded contract document, or upload a file below."
                value={contractForm.fileUrl}
                onChange={(e) => updateContractField("fileUrl", e.target.value)}
              />

              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={contractUploading}
                >
                  {contractUploading ? "Uploading..." : "Upload file"}
                  <input
                    ref={contractFileInputRef}
                    type="file"
                    hidden
                    onChange={handleContractFileSelected}
                  />
                </Button>

                {contractForm.fileName && (
                  <Typography variant="body2" sx={{ mt: 0.75, color: "text.secondary" }}>
                    {contractForm.fileName}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 0.5,
                      color: "text.secondary",
                      fontSize: "0.875rem",
                    }}
                  >
                    Start date
                  </Typography>
                  <TextField
                    type="date"
                    fullWidth
                    size="small"
                    value={contractForm.startDate || ""}
                    onChange={(e) => updateContractField("startDate", e.target.value)}
                    disabled={contractSaving}
                  />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 0.5,
                      color: "text.secondary",
                      fontSize: "0.875rem",
                    }}
                  >
                    End date
                  </Typography>
                  <TextField
                    type="date"
                    fullWidth
                    size="small"
                    value={contractForm.endDate || ""}
                    onChange={(e) => updateContractField("endDate", e.target.value)}
                    disabled={contractSaving}
                  />
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                label="Notes"
                value={contractForm.notes}
                onChange={(e) => updateContractField("notes", e.target.value)}
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
              {contractSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </FormPageLayout>
  );
}
