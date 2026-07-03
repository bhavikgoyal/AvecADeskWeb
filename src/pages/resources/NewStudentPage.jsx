import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Paper, Tab, Tabs } from '@mui/material';
import { fetchCoursesByInstitute, fetchInstitutes } from '../../api/lookupApi';
import { createStudentWithPaymentSchedule, derivePaymentStatus } from '../../api/studentsApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function NewStudentPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const submittingRef = useRef(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showSaveFirst, setShowSaveFirst] = useState(false);
  const [createdStudentId, setCreatedStudentId] = useState(null);

const handleTabChange = (_, value) => {
  setShowSaveFirst(false);
  setActiveTab(value);
};

  useEffect(() => {
    let active = true;

    fetchInstitutes()
      .then((data) => {
        if (active) setInstitutes(data);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load institutes.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!form.instituteId) {
      setCourses([]);
      return undefined;
    }

    fetchCoursesByInstitute(form.instituteId)
      .then((data) => {
        if (active) setCourses(data);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load courses.');
      });

    return () => {
      active = false;
    };
  }, [form.instituteId]);

  const selectOptions = useMemo(
    () => ({
      instituteId: institutes.map((item) => ({
        value: item.instituteId,
        label: item.instituteName,
      })),
      courseId: courses.map((item) => ({
        value: item.courseId,
        label: item.courseName,
      })),
    }),
    [institutes, courses],
  );

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'instituteId' && value !== prev.instituteId) {
        next.courseId = '';
        next.courseFee = '';

        next.commissionPercentage = 0;
        next.gstPercentage = 0;
        next.bonus = 0;

        next.commissionAmount = 0;
        next.gstAmount = 0;
        next.invoiceAmount = 0;
        next.grandTotal = 0;

        next.amountDue = '';
      }

      if (field === 'courseId') 
      {
          const selectedCourse = courses.find(
          c => String(c.courseId) === String(value));

         next.courseFee = selectedCourse?.fees ?? '';
         next.amountDue = selectedCourse?.fees ?? '';
         next.commissionPercentage = selectedCourse?.commissionPercentage ?? 0;
         next.gstPercentage = selectedCourse?.gstPercentage ?? 0;
         next.bonus = selectedCourse?.bonusAmount ?? 0;

         const fee = Number(next.courseFee);
         const commission = (fee * Number(next.commissionPercentage)) / 100;
         const gst = (commission * Number(next.gstPercentage)) / 100;
         const invoice = commission + gst;
         const grandTotal = fee + invoice;

         next.commissionAmount = commission.toFixed(2);
         next.gstAmount = gst.toFixed(2);
         next.invoiceAmount = invoice.toFixed(2);
         next.grandTotal = grandTotal.toFixed(2);
     }
     
      if (field === 'amountDue' || field === 'amountPaid') {
        const due = field === 'amountDue' ? value : prev.amountDue;
        const paid = field === 'amountPaid' ? value : prev.amountPaid;
        next.paymentStatus = derivePaymentStatus(due, paid);
      }
      return next;
    });
    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const student = await createStudentWithPaymentSchedule(form);
      alert('Student created successfully.');

      navigate(basePath);
      setCreatedStudentId(student.studentId);
      setShowSaveFirst(false);
      setActiveTab(1);
    } catch (err) {
      setError(err.message || 'Failed to create student.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
      <FormPageLayout title={`Add new ${resource.singular.toLowerCase()}`}>
       <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Student Details" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Payment Schedule" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {(error || loadError) && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error || loadError}
          </Alert>
        )}
    {activeTab === 0 && (
  <>
    <FormSectionsLayout
      sections={[resource.sections[0]]}
      form={form}
      onChange={updateField}
      selectOptions={selectOptions}
      requiredFields={resource.requiredFields}
      
    />
  </>
)}

{activeTab === 1 && (
  <>
    <FormSectionsLayout
      sections={[resource.sections[1], resource.sections[2]]}
      form={form}
      onChange={updateField}
      selectOptions={selectOptions}
      requiredFields={resource.requiredFields}
    />
    <FormActions
      onCancel={() => navigate(basePath)}
      onSubmit={handleCreate}
      submitLabel={submitting ? 'Saving...' : 'Save Student'}
      submitDisabled={!isFormValid(resource, form) || submitting}
    />
  </>
)}
      </Paper>
    </FormPageLayout>
  );
}
