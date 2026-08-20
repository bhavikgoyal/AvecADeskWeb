import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Typography, Button, Select, MenuItem, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { fetchCoursesByScrappingId } from "../../api/coursesApi";
import { fetchUniqueInstituteNames } from "../../api/institutesScrappingApi";
import ConfirmByStudentDialog from './ConfirmByStudentDialog';
import { createStudentWithPaymentSchedule, derivePaymentStatus, fetchStudentPaymentDetail, updateStudentWithPaymentSchedule, } from "../../api/studentsApi";
import { createPaymentSchedule, createStudentPaymentInstallment, createStudentCommission, createStudentCommissionDetail, updateStudentPaymentSchedule ,uploadInstallmentDocument,} from "../../api/schedulesApi";
import { FormActions, FormPageLayout, FormSectionsLayout, formPaperSx, } from "../../components/forms";
import { getEmptyForm, getResourceConfig, isFormValid, } from "../../config/resourceConfig";


const isPaidLike = (status) =>
  status === "ConfirmedByCollege" ||
  status === "ConfirmedByStudent" ||
  status === "PaidByCollege" ||       
  status === "PaidByStudent";        

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
    if (isEdit) return;
    const preselectedInstituteId = location.state?.instituteId;
    if (preselectedInstituteId) {
      setForm((prev) => ({ ...prev, instituteId: String(preselectedInstituteId) }));
    }
    
  }, []);

  useEffect(() => {
    let active = true;

    if (!form.instituteId) {
      setCourses([]);
      return;
    }
    fetchCoursesByScrappingId(form.instituteId)
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
  }, [form.instituteId]);

  
  const selectedInstitute = useMemo(
    () => institutes.find((x) => String(x.id) === String(form.instituteId)),
    [institutes, form.instituteId]
  );

  const campusOptions = useMemo(() => {
    const raw = selectedInstitute?.campusname || '';
    return raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }, [selectedInstitute]);

  const selectOptions = useMemo(
    () => ({
      instituteId: institutes.map((item) => ({
        value: item.id,
        label: item.name,
      })),

      courseId: courses.map((item) => ({
        value: item.courseId,
        label: item.courseName,
      })),

      campusname: campusOptions.map((c) => ({
        value: c,
        label: c,
      })),
    }),
    [institutes, courses, campusOptions]
  );

  if (!resource) return null;

  useEffect(() => {
    if (!isEdit) return;

    async function loadData() {
      try {
        const data = await fetchStudentPaymentDetail(id);
        setForm({
          ...getEmptyForm(basePath),
          studentId: data.studentId,
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
        const list = (data.studentPaymentList || []).map(x => ({
          studentPaymentInstallmentId: x.studentPaymentInstallmentId,
          installmentNo: x.installmentNo,
          dueDate: x.dueDate?.substring(0, 10),
          paidDate: x.paidDate?.substring(0, 10),
          amount: x.feesAmount,
          paidAmount: x.paidAmount,
          balance: x.balanceAmount,
          status: x.paymentStatus,
          originalStatus: x.paymentStatus ?? x.PaymentStatus ?? null,
          documentUrl: x.installmentImage ?? x.InstallmentImage ?? null, 
        }));

        setOriginalPaymentList(list);
        setPaymentList(list);
        setCommissionHistory(data.commissionHistory || []);

        if (data.bonusAmount > 0) {
          setBonusApplied(true);
          setAddBonus(true);
        }
      } catch (err) {
        setError(err.message || "Failed to load student.");
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
  if (!value) return "-";

  const isoValue = String(value).split("T")[0];
  const date = parseIsoDate(isoValue);

  if (!date) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
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

    const commission =
      (installmentFee * Number(next.commissionPercentage || 0)) / 100;

    const gst =
      (commission * Number(next.gstPercentage || 0)) / 100;

    next.commissionAmount = commission.toFixed(2);
    next.gstAmount = gst.toFixed(2);
    next.invoiceAmount = (commission + gst).toFixed(2);
  }
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

      const commission =
        (fees * Number(form.commissionPercentage || 0)) / 100;

      const gst =
        (commission * Number(form.gstPercentage || 0)) / 100;

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

      const invoice = commission + gst + bonus;

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
  ]);

  const handleCreate = async () => {

    if (isEdit) {
      const paidCount = paymentList.filter(x => isPaidLike(x.status)).length;

      const paidAmount = paymentList
        .filter(x => isPaidLike(x.status))
        .reduce((sum, x) => sum + Number(x.paidAmount || x.amount || 0), 0);

      const remainingAmount = Number(form.courseFee || 0) - paidAmount;

      const minInstallments =
        remainingAmount > 0 ? paidCount + 1 : paidCount;

      if (Number(form.noOfInstallment) < minInstallments) {
        alert(`Minimum allowed installments is ${minInstallments}.`);
        return;
      }
    }
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

        const student = await createStudentWithPaymentSchedule(form);
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

        commissionId = commission.commissionId ?? commission.CommissionId;

      } else {
        try {
          const studentUpdatePayload = {
            ...form,
            studentId: form.studentId,
            assignment: form.assignment ?? form.Assignment ?? null,
          };

          await updateStudentWithPaymentSchedule(form.studentId, studentUpdatePayload);
        } catch (err) {
          console.warn('Failed updating student core data', err);
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

          paymentList: paymentList.map(x => ({
            studentPaymentInstallmentId: x.studentPaymentInstallmentId,
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

      alert(isEdit ? "Student updated successfully." : "Student created successfully.");

      setForm(getEmptyForm(basePath));
      setPaymentList([]);
      setCourses([]);
      setBonusApplied(false);
      setAddBonus(false);
      setGstPercentage(0);

      navigate(basePath);

    } catch (err) {
      setError(err.message || "Failed to save student.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
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

        {/* Student Details */}
        <FormSectionsLayout
          sections={[resource.sections[0]]}
          form={form}
          onChange={updateField}
          selectOptions={selectOptions}
          requiredFields={resource.requiredFields}
          disabled={isEdit}
        />

        <Box sx={{ height: 24 }} />

        {/* Student Payment Schedule */}
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
          ]}
        />

        <Box sx={{ height: 24 }} />

        {/* Student Payment List */}
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
                  <TableCell>Remaining Fees</TableCell> 
                  <TableCell>Document</TableCell> 
                </TableRow>
              </TableHead>

              <TableBody>
                {paymentList.length > 0 ? (
                  paymentList.map((item, index) => (
                    <TableRow key={item.installmentNo}>
                      <TableCell>{item.installmentNo}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                      <TableCell>{formatDateCell(item.dueDate)}</TableCell>
                      <TableCell>
                        {isEdit && (isPaidLike(item.status) || item.status === "Partial") ? (
                          <TextField
                            size="small"
                            type="date"
                            sx={{ width: 125 }}
                            value={
                              item.paidDate
                                ? String(item.paidDate).split("T")[0]
                                : new Date().toISOString().slice(0, 10)
                            }
                            onChange={(e) => {
                            const value = e.target.value;
                            setPaymentList((prev) => prev.map((x) => (x.installmentNo === item.installmentNo ? { ...x, paidDate: value } : x)));
                            setCommissionHistory((prev) => prev.map((x) => (x.installmentNo === item.installmentNo ? { ...x, paidDate: value } : x)));
                          }}
                          />
                        ) : (
                          item.paidDate ? String(item.paidDate).split("T")[0] : "-"
                        )}
                      </TableCell>

                      <TableCell>
                        {isEdit ? (
                          <Select
                            size="small"
                            value={item.status}
                            disabled={
                              item.originalStatus === "ConfirmedByCollege" ||
                              item.originalStatus === "PaidByCollege"
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "ConfirmedByStudent") {
                                setConfirmTargetInstallment(item);
                                setConfirmDialogOpen(true);
                                return;
                              }

                              setPaymentList((prev) =>
                                prev.map((x) => {
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
                                })
                              );

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
                            <MenuItem value="Partial">Partial</MenuItem>

                            <MenuItem
                              value="ConfirmedByCollege" disabled={!canEditStatus(index)}
                            >
                              Confirmed by College
                            </MenuItem>

                            <MenuItem
                              value="ConfirmedByStudent" disabled={!canEditStatus(index)}
                            >
                              Confirmed by Student
                            </MenuItem>
                          </Select>
                        ) : (
                          item.status
                        )}
                      </TableCell>
             
                      <TableCell>
                        {isEdit && item.status === "Partial" ? (
                          <TextField
                            size="small"
                            type="number"
                            value={item.paidAmount ?? "0"}
                            onChange={(e) => {
                              const val = e.target.value;

                              setPaymentList((prev) =>
                                prev.map((x) =>
                                  x.installmentNo === item.installmentNo
                                    ? {
                                        ...x,
                                        paidAmount: val,
                                        balance: (
                                          Number(x.amount) - Number(val || 0)
                                        ).toFixed(2),
                                      }
                                    : x
                                )
                              );
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
                            : "0.00"
                        )}
                      </TableCell>
                      <TableCell>                                   
                        {isPaidLike(item.status)
                          ? "0.00"
                          : Number(item.balance ?? item.amount).toFixed(2)}
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
                  ))
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

        {/* Commission */}
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

        {/* Commission History */}
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

        <Box sx={{ mt: 4 }} />

        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleCreate}
          submitLabel={
            submitting
              ? (isEdit ? "Updating..." : "Saving...")
              : (isEdit ? "Update Student" : "Save Student")
          }
          submitDisabled={!isFormValid(resource, form) || submitting}
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
      </Paper>
    </FormPageLayout>
  );
}