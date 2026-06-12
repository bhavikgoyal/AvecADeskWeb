import { getEmptyForm, getRecordLabel, pathToKey } from '../config/resourceConfig';
import { getResourceConfig } from '../config/resourceConfig';

const STORAGE_VERSION = 'arch-v2';

function storageKey(path) {
  return `avec_${STORAGE_VERSION}_${pathToKey(path)}`;
}

const SEED_SAMPLES = {
  vendors: [
    { businessName: 'Global Edu Partners', vendorCode: 'VEN-1001', vendorStatus: 'Active', contactPerson: 'Ravi Mehta', email: 'ravi@globaledu.com', phone: '+61 412 345 678', commissionPreference: 'Percentage 12%' },
    { businessName: 'Study Abroad Hub', vendorCode: 'VEN-1002', vendorStatus: 'Pending', contactPerson: 'Lisa Chen', email: 'lisa@studyhub.com', phone: '+61 423 456 789' },
    { businessName: 'Pacific Pathways', vendorCode: 'VEN-1003', vendorStatus: 'Active', contactPerson: 'Tom Wilson', email: 'tom@pacificpath.com', phone: '+61 434 567 890' },
  ],
  institutes: [
    { instituteName: 'Melbourne Tech College', city: 'Melbourne', instituteStatus: 'Active', isPublished: 'Yes', contactEmail: 'admissions@mtc.edu.au' },
    { instituteName: 'Sydney Business School', city: 'Sydney', instituteStatus: 'Active', isPublished: 'Yes', contactEmail: 'info@sbs.edu.au' },
    { instituteName: 'Brisbane Arts Institute', city: 'Brisbane', instituteStatus: 'Inactive', isPublished: 'No', contactEmail: 'contact@bai.edu.au' },
  ],
  students: [
    { fullName: 'Aisha Patel', enrolmentStatus: 'Enrolled', paymentStatus: 'Paid', instituteNameRef: 'Melbourne Tech College', amountDue: '0', amountPaid: '12400' },
    { fullName: 'Rohan Singh', enrolmentStatus: 'Applied', paymentStatus: 'Pending', instituteNameRef: 'Sydney Business School', amountDue: '8200', amountPaid: '0' },
    { fullName: 'Kavya Mehta', enrolmentStatus: 'Interested', paymentStatus: 'Partial', instituteNameRef: 'Brisbane Arts Institute', amountDue: '5600', amountPaid: '2000' },
  ],
  invoices: [
    { invoiceNumber: 'INV-2041', instituteNameRef: 'Melbourne Tech College', invoiceStatus: 'Approved', totalAmount: '18400' },
    { invoiceNumber: 'INV-2038', instituteNameRef: 'Sydney Business School', invoiceStatus: 'PendingApproval', totalAmount: '9200' },
    { invoiceNumber: 'INV-2035', instituteNameRef: 'Brisbane Arts Institute', invoiceStatus: 'Draft', totalAmount: '6100' },
  ],
  tasks: [
    { taskTitle: 'Vendor payout batch review', taskStatus: 'InProgress', priority: 'High', dueDate: '2026-06-15', assignedTo: 'Sarah Finance' },
    { taskTitle: 'Student enrolment documentation', taskStatus: 'Open', priority: 'Medium', dueDate: '2026-06-12', assignedTo: 'Mark Consultant' },
    { taskTitle: 'Invoice reconciliation Q2', taskStatus: 'Done', priority: 'Low', dueDate: '2026-06-10', assignedTo: 'Alex Admin' },
  ],
};

function seedRecords(path, count = 6) {
  const key = pathToKey(path);
  const resource = getResourceConfig(path);
  const samples = SEED_SAMPLES[key] || [];
  const updated = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return Array.from({ length: count }, (_, index) => {
    const base = { ...getEmptyForm(path), ...samples[index % samples.length] };
    return {
      ...base,
      id: `${key}-${index + 1}`,
      name: getRecordLabel(resource, base),
      updated: `Jun ${10 + index}, 2026`,
    };
  });
}

export function loadRecords(path) {
  try {
    const raw = localStorage.getItem(storageKey(path));
    if (raw) return JSON.parse(raw);
    const seeded = seedRecords(path);
    saveRecords(path, seeded);
    return seeded;
  } catch (error) {
    console.error('Failed to load records:', error);
    return seedRecords(path);
  }
}

export function saveRecords(path, records) {
  localStorage.setItem(storageKey(path), JSON.stringify(records));
}

export function getRecordById(path, id) {
  return loadRecords(path).find((item) => String(item.id) === String(id)) || null;
}

export function upsertRecord(path, record) {
  const resource = getResourceConfig(path);
  const records = loadRecords(path);
  const index = records.findIndex((item) => String(item.id) === String(record.id));
  const payload = {
    ...record,
    name: getRecordLabel(resource, record),
    updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  if (index >= 0) {
    records[index] = payload;
  } else {
    records.unshift(payload);
  }
  saveRecords(path, records);
  return payload;
}

export function deleteRecord(path, id) {
  const records = loadRecords(path).filter((item) => String(item.id) !== String(id));
  saveRecords(path, records);
}

/** Clear seeded data so architecture-aligned samples reload (dev helper). */
export function resetModuleData(path) {
  localStorage.removeItem(storageKey(path));
}
