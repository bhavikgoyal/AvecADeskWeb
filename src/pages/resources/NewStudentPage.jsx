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


const EPSILON = 0.01;
const getGroupNo = (row) => row.parentGroupNo ?? row.installmentNo;

const getGroupMembers = (list, groupNo) =>
  list.filter((x) => getGroupNo(x) === groupNo);

const getGroupRoot = (list, groupNo) =>
  list.find((x) => x.installmentNo === groupNo);


const isGroupFullyCovered = (list, groupNo) => {
  const root = getGroupRoot(list, groupNo);
  if (!root) return false;

  const totalOriginal = Number(root.amount || 0);
  if (totalOriginal <= 0) return false;

  const members = getGroupMembers(list, groupNo);
  const sumPaid = members.reduce((sum, x) => {
    if (isPaidLike(x.status)) return sum + Number(x.amount || 0);
    return sum + Number(x.paidAmount || 0);
  }, 0);

  return sumPaid + EPSILON >= totalOriginal;
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

  const parent = rowById.get(parentId);
  if (!parent) {
    return Number(item.installmentNo ?? item.InstallmentNo ?? 0);
  }

  return deriveParentGroupNo(rowById, parent);
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

  const rowById = new Map(
    rawRows
      .filter((item) => item.studentPaymentInstallmentId != null)
      .map((item) => [item.studentPaymentInstallmentId, item])
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
    const processedInGroup = groupCounts.get(parentGroupNo) ?? 0;
    const installmentNo = item.parentInstallmentId
      ? Number((parentGroupNo + (processedInGroup + 1) / 10).toFixed(2))
      : item.apiInstallmentNo;

    groupCounts.set(parentGroupNo, processedInGroup + 1);

    return {
      studentPaymentInstallmentId: item.studentPaymentInstallmentId,
      apiInstallmentNo: item.apiInstallmentNo,
      installmentNo,
      parentInstallmentId: item.parentInstallmentId,
      parentInstallmentNo: null,
      parentGroupNo,
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
          scheduleId: data.scheduleId, 
          assignment: data.assignment ?? data.Assignment ?? '',
          instituteId: String(data.instituteId),
          courseId: String(data.courseId),
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          FolderNo: data.folderNo,
          campusname: data.campus,
          courseStartDate: data.courseStartDate?.substring(0, 10),
          courseEndDate: data.courseEndDate?.substring(0, 10),
          commissionAmount: data.commissionAmount,
          gstAmount: data.gstAmount,
          bonus: data.bonusAmount,
          dueDate: data.dueDate?.substring(0, 10),
          courseFee: data.totalCourseFee,
          amountDue: data.totalCourseFee, 
          noOfInstallment: data.noOfInstallments,
          frequency: data.frequency,
          startDate: data.firstDueDate?.substring(0, 10),

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
  const generateInstallments = (data) => {
    const fee = Number(data.courseFee || 0);
    const count = Number(data.noOfInstallment || 0);

    if (!fee || !count || !data.startDate || !data.frequency) {
      setPaymentList([]);
      return;
    }

    let installmentAmount;

    const paidInstallments = isEdit
      ? originalPaymentList.filter(x => isPaidLike(x.status))
      : [];

    if (isEdit) {

      const paidAmount = paidInstallments.reduce(
        (sum, x) => sum + Number(x.paidAmount || x.amount || 0),
        0
      );

      const remainingAmount = fee - paidAmount;
      const remainingInstallments = count - paidInstallments.length;

      installmentAmount =
        remainingInstallments > 0
          ? remainingAmount / remainingInstallments
          : 0;
    }
    else {

      installmentAmount = fee / count;

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

    const list = [];

    for (let i = 0; i < count; i++) {

      const paidRow = paidInstallments.find(
        x => x.installmentNo === i + 1
      );

      if (paidRow) {
        list.push(paidRow);
        continue;
      }

      const dueDate = new Date(startDate);

      if (data.frequency === "Monthly") {
        dueDate.setMonth(startDate.getMonth() + i);
      } else if (data.frequency === "Quarterly") {
        dueDate.setMonth(startDate.getMonth() + (i * 3));
      }

      list.push({
        installmentNo: i + 1,
        dueDate: formatDate(dueDate),
        amount: installmentAmount.toFixed(2),
        paidAmount: "0.00",
        balance: installmentAmount.toFixed(2),
        status: "Pending",
      });
    }

    setPaymentList(list);
  };

  const calculateAmounts = (next) => {
    const fee = Number(next.courseFee || 0);
    const installments = Number(next.noOfInstallment || 1);
    const installmentFee = installments > 0 ? fee / installments : fee;

    const rawCommission = (installmentFee * Number(next.commissionPercentage || 0)) / 100;
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

  const updateField = (field, value) => {

    if (field === "noOfInstallment" && isEdit) {

      const paidCount = paymentList.filter(x => isPaidLike(x.status)).length;

      const paidAmount = paymentList
        .filter(x => isPaidLike(x.status))
        .reduce((sum, x) => sum + Number(x.paidAmount || x.amount || 0), 0);

      const remainingAmount = Number(form.courseFee || 0) - paidAmount;

      const minInstallments =
        remainingAmount > 0 ? paidCount + 1 : paidCount;

      if (
        value !== "" &&
        Number(value) < minInstallments
      ) {
        alert(`Minimum allowed installments is ${minInstallments}.`);
        return;
      }
    }

    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "instituteId" && value !== prev.instituteId) {

        next.campusname = "";  
        next.courseId = "";
        next.courseFee = "";
        next.amountDue = "";

        next.commissionRate = 0;
        next.rateType = "";
        next.commissionPercentage = 0;
        next.gstPercentage = Number(gstPercentage || 0);

        next.commissionAmount = 0;
        next.gstAmount = 0;
        next.invoiceAmount = 0;

        setPaymentList([]);
      }

      // Bonus Changed
      if (field === "bonus" || field === "bonusType" || field === "bonusOption") {
        next[field] = value;
        setBonusApplied(false);
      }

      // Course Changed
      if (!isEdit && field === "courseId") {
        const selectedCourse = courses.find(
          (c) => String(c.courseId) === String(value)
        );

        next.courseFee = selectedCourse?.fees ?? "";
        next.amountDue = selectedCourse?.fees ?? "";

        next.commissionRate = Number(selectedCourse?.commissionRate ?? 0);
        next.rateType = selectedCourse?.rateType ?? "";
        next.commissionPercentage = Number(next.commissionRate ?? 0);
        next.gstPercentage = Number(gstPercentage || 0);

        const today = new Date();
        next.courseStartDate = today.toISOString().split("T")[0];

        if (selectedCourse?.duration) {
          const endDate = new Date(today);

          const match = selectedCourse.duration.match(/(\d+)\s*(Year|Years|Month|Months|Week|Weeks)/i);

          if (match) {
            const value = Number(match[1]);
            const unit = match[2].toLowerCase();

            if (unit.startsWith("year")) {
              endDate.setFullYear(endDate.getFullYear() + value);
            } else if (unit.startsWith("month")) {
              endDate.setMonth(endDate.getMonth() + value);
            } else if (unit.startsWith("week")) {
              endDate.setDate(endDate.getDate() + value * 7);
            }

            next.courseEndDate = endDate.toISOString().split("T")[0];
          }
        }
      }

      // Commission Calculation
      if (
        field === "courseId" ||
        field === "courseFee" ||
        field === "noOfInstallment" ||
        field === "commissionPercentage" ||
        field === "gstPercentage"
      ) {
        if (field === "commissionPercentage") {
          next.commissionPercentage = Number(value || 0);
        }

        if (field === "gstPercentage") {
          next.gstPercentage = Number(value || 0);
        }

        calculateAmounts(next);
      }

      // Generate Installments
      if (
        field === "courseId" ||
        field === "courseFee" ||
        field === "noOfInstallment" ||
        field === "frequency" ||
        field === "startDate"
      ) {
        generateInstallments(next);
      }

      return next;
    });

    if (error) setError("");
    if (loadError) setLoadError("");
  };

  const commissionRows = useMemo(() => {
    return paymentList.map((item) => {
      const fees = Number(item.amount || 0);

      const rawCommission = (fees * Number(form.commissionPercentage || 0)) / 100;
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
        case "Everytime":
          applyBonus = true;
          break;

        case "Quarterly":
          applyBonus = item.installmentNo % 3 === 0;
          break;

        case "HalfYearly":
          applyBonus = item.installmentNo % 6 === 0;
          break;

        case "Yearly":
          applyBonus = item.installmentNo === paymentList.length;
          break;

        default:
          applyBonus = false;
      }

      let bonus = 0;

      if (addBonus && bonusApplied && applyBonus) {
        if (form.bonusType === "Percentage") {
          bonus = (fees * Number(form.bonus || 0)) / 100;
        } else if (form.bonusType === "Fixed") {
          bonus = Number(form.bonus || 0);
        }
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
  }, [
    paymentList,
    form.commissionPercentage,
    form.gstPercentage,
    form.bonus,
    form.bonusType,
    form.bonusOption,
    bonusApplied,
    addBonus,
    gstInclusive,
  ]);

const handleCreate = async () => {
  if (submittingRef.current) return;

  submittingRef.current = true;
  setSubmitting(true);
  setError("");

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
        totalCourseFee: Number(form.courseFee),
        noOfInstallments: Number(form.noOfInstallment),
        frequency: form.frequency,
        firstDueDate: form.startDate,
      });

      scheduleId = schedule.scheduleId ?? schedule.ScheduleId;

      const commission = await createStudentCommission({
        scheduleId,
        commissionPercentage: Number(form.commissionPercentage),
        gstPercentage: Number(form.gstPercentage),
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

      try {
        const studentUpdatePayload = {
          ...buildStudentPayload(),
          studentId: form.studentId,
          assignment: form.assignment ?? form.Assignment ?? null,
        };

        await updateStudentWithPaymentSchedule(
          form.studentId,
          studentUpdatePayload
        );
      } catch (err) {
        console.warn(
          "Failed updating student core data",
          err
        );
      }

        scheduleChanged =
          originalSchedule.noOfInstallment !== Number(form.noOfInstallment) ||
          originalSchedule.frequency !== form.frequency ||
          originalSchedule.startDate !== form.startDate;

        const result = await updateStudentPaymentSchedule({
          studentId: form.studentId,
          noOfInstallments: Number(form.noOfInstallment),
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

  const splitBase = Math.max(
    9000,
    Number(form.noOfInstallment || 0) + 9000
  );
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
    prev.map((x) =>
      x.installmentNo === installment.installmentNo
        ? {
            ...x,
            status: "ConfirmedByStudent",
            paidAmount: Number(x.amount || 0).toFixed(2),
            balance: "0.00",
            paidDate:
              x.paidDate || new Date().toISOString().slice(0, 10),
            documentUrl,
          }
        : x
    )
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
          ...commissionRow,
          ...historyRow,
          paymentStatus: payment.status,
          commissionStatus:
            historyRow?.commissionStatus ??
            commissionRow?.commissionStatus ??
            "Pending",
        };
      })
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }, [isEdit, paymentList, commissionHistory, commissionRows]);

  const totals = useMemo(() => ({
    fees: historyRows.reduce((sum, x) => sum + Number(x.feesAmount ?? x.fees ?? 0), 0),
    commission: historyRows.reduce((sum, x) => sum + Number(x.commissionAmount ?? x.commission ?? 0), 0),
    gst: historyRows.reduce((sum, x) => sum + Number(x.gstAmount ?? x.gst ?? 0), 0),
    bonus: historyRows.reduce((sum, x) => sum + Number(x.bonusAmount ?? x.bonus ?? 0), 0),
    invoice: historyRows.reduce((sum, x) => sum + Number(x.invoiceAmount ?? x.invoice ?? 0), 0),
  }), [historyRows]);

 
  const canEditStatus = (index) => {
  const item = paymentList[index];
  const groupNo = getGroupNo(item);
  const isRootOfGroup = item.installmentNo === groupNo;

  if (!isRootOfGroup) return true;

  if (index === 0) return true;

  return isPaidLike(paymentList[index - 1]?.status);
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
                "noOfInstallment",
                "frequency",
                "assignment",
                ...(!form.instituteId ? ["campusname"] : []),
              ]}
              fieldDefsOverride={instituteLocked ? { instituteId: { readOnly: true } } : {}}
            />

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
                          <TableCell>{item.installmentNo}</TableCell>
                          <TableCell>{item.amount}</TableCell>
                          <TableCell>{formatDateCell(item.dueDate)}</TableCell>
                          <TableCell>
                            {isEdit && (isPaidLike(item.status) || item.status === "Partial") ? (
                              <DateTextField
                                size="small"
                                sx={{ width: 125 }}
                                value={item.paidDate || new Date().toISOString().slice(0, 10)}
                                onChangeValue={(value) => {
                                setPaymentList((prev) => prev.map((x) => (x.installmentNo === item.installmentNo ? { ...x, paidDate: value } : x)));
                                setCommissionHistory((prev) => prev.map((x) => (x.installmentNo === item.installmentNo ? { ...x, paidDate: value } : x)));
                              }}
                              />
                            ) : (
                              formatDateCell(item.paidDate)
                            )}
                          </TableCell>

                          <TableCell>
                            {isEdit ? (
                              <Select
                                size="small"
                                value={item.status}
                                disabled={
                                  item.originalStatus === "ConfirmedByCollege" ||
                                  item.originalStatus === "PaidByCollege" ||

                                  (groupComplete && !isLastOfGroup && !isPaidLike(item.status))
                                }
                                onChange={async (e) => {
                                  const value = e.target.value;
                                      if (value === "ConfirmedByStudent") {
                                      try {
                                        await confirmInstallmentByStudent(
                                          item.studentPaymentInstallmentId
                                        );

                                        setPaymentList((prev) =>
                                          prev.map((x) =>
                                            x.installmentNo === item.installmentNo
                                              ? {
                                                  ...x,
                                                  status: "ConfirmedByStudent",
                                                  paidAmount: x.amount,
                                                  balance: "0.00",
                                                  paidDate:
                                                    x.paidDate ||
                                                    new Date().toISOString().slice(0, 10),
                                                }
                                              : x
                                          )
                                        );

                                        setConfirmTargetInstallment(item);
                                        setConfirmDialogOpen(true);
                                      } catch (err) {
                                        console.error(
                                          "Failed to confirm installment by student:",
                                          err
                                        );
                                      }

                                      return;
                                    }

                                  setPaymentList((prev) => {
                                    let updated = prev.map((x) => {
                                      if (x.installmentNo === item.installmentNo) {
                                        const isPaid = isPaidLike(value);
                                        const isPartial = value === "Partial";
                                        return {
                                          ...x,
                                          status: value,
                                          paidAmount: isPaid ? x.amount : (isPartial ? (x.paidAmount || "0.00") : "0.00"),
                                          balance: isPaid ? "0.00" : (isPartial ? x.balance : x.amount),
                                          paidDate: (isPaid || isPartial) ? (x.paidDate || new Date().toISOString().slice(0, 10)) : null,
                                        };
                                      }

                                      if (
                                        value === "Pending" &&
                                        x.installmentNo > item.installmentNo
                                      ) {
                                        return {
                                          ...x,
                                          status: "Pending",
                                          paidAmount: "0.00",
                                          balance: x.amount,
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

                                      if (
                                        value === "Pending" &&
                                        x.installmentNo > item.installmentNo
                                      ) {
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

                                <MenuItem
                                  value="Partial" disabled={!canEditStatus(index)}
                                >
                                  Partial
                                </MenuItem>

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

                          <TableCell>
                            {isEdit && item.status === "Partial" && !(groupComplete && !isLastOfGroup) ? (
                              <TextField
                                size="small"
                                type="number"
                                value={item.paidAmount ?? "0"}
                                onChange={(e) => {
                                  const val = e.target.value;

                                  setPaymentList((prev) => {
                                    const updatedRows = prev.map((x) => {
                                      if (x.installmentNo === item.installmentNo) {
                                        const newBalance = (
                                          Number(x.amount) - Number(val || 0)
                                        ).toFixed(2);

                                        return {
                                          ...x,
                                          paidAmount: val,
                                          balance: newBalance,
                                        };
                                      }

                                      return x;
                                    });

                                    const childIndex = updatedRows.findIndex(
                                      (x) => x.parentInstallmentNo === item.installmentNo
                                    );

                                    if (childIndex !== -1) {
                                      const child = updatedRows[childIndex];
                                      const newRemaining = Number(item.amount) - Number(val || 0);

                                      if (newRemaining <= EPSILON) {
                                        if (!child.studentPaymentInstallmentId) {
                                          updatedRows.splice(childIndex, 1);
                                        } else {
                                          updatedRows[childIndex] = {
                                            ...child,
                                            amount: "0.00",
                                            balance: "0.00",
                                          };
                                        }
                                      } else {
                                        updatedRows[childIndex] = {
                                          ...child,
                                          amount: newRemaining.toFixed(2),
                                          balance: newRemaining.toFixed(2),
                                        };
                                      }
                                    }

                                    return updatedRows;
                                  });
                                }}
                                inputProps={{
                                  min: 0,
                                  max: Number(item.amount),
                                  step: "0.01",
                                }}
                                sx={{ width: 120 }}
                              />
                            ) : (
                              isPaidLike(item.status)
                                ? Number(item.amount || 0).toFixed(2)
                                : Number(item.paidAmount || 0).toFixed(2)
                            )}
                          </TableCell>
                          <TableCell>
                          {item.documentUrl ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                window.open(item.documentUrl, "_blank")
                              }
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
                        <TableCell colSpan={7} align="center">
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
                          <TableCell colSpan={2}><b>Total</b></TableCell>
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
                        <TableCell colSpan={9} align="center">
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
            (!isEdit && !visitedTabs.has(2))
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
