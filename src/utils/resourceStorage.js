import { getEmptyForm, getRecordLabel, pathToKey } from '../config/resourceConfig';
import { getResourceConfig } from '../config/resourceConfig';

const STORAGE_VERSION = 'arch-v3';

function storageKey(path) {
  return `avec_${STORAGE_VERSION}_${pathToKey(path)}`;
}

const SEED_SAMPLES = {
  vendors: [
    {
      vendorCode: 'VEN-1001', username: 'ravi.mehta', businessName: 'Global Edu Partners', contactPerson: 'Ravi Mehta',
      email: 'ravi@globaledu.com', phone: '+61 412 345 678', referral: 'REF-AU-01', vendorStatus: 'Active',
      vendorRef: 'Global Edu Partners', instituteName: 'Melbourne Tech College', websiteUrl: 'https://mtc.edu.au',
      logoUrl: 'https://mtc.edu.au/logo.png', primaryColor: '#3385c6', secondaryColor: '#1a2b3d',
      address: '120 Collins St', city: 'Melbourne', state: 'VIC', serviceType: 'Higher Education',
      contact: 'Ravi Mehta', isPublic: 'Yes',
    },
    {
      vendorCode: 'VEN-1002', username: 'lisa.chen', businessName: 'Study Abroad Hub', contactPerson: 'Lisa Chen',
      email: 'lisa@studyhub.com', phone: '+61 423 456 789', referral: 'REF-AU-02', vendorStatus: 'Pending',
      vendorRef: 'Study Abroad Hub', instituteName: 'Sydney Business School', websiteUrl: 'https://sbs.edu.au',
      logoUrl: 'https://sbs.edu.au/logo.png', primaryColor: '#2f80c9', secondaryColor: '#0f172a',
      address: '88 George St', city: 'Sydney', state: 'NSW', serviceType: 'Business Programs',
      contact: 'Lisa Chen', isPublic: 'No',
    },
    {
      vendorCode: 'VEN-1003', username: 'tom.wilson', businessName: 'Pacific Pathways', contactPerson: 'Tom Wilson',
      email: 'tom@pacificpath.com', phone: '+61 434 567 890', referral: 'REF-AU-03', vendorStatus: 'Active',
      vendorRef: 'Pacific Pathways', instituteName: 'Brisbane Arts Institute', websiteUrl: 'https://bai.edu.au',
      logoUrl: 'https://bai.edu.au/logo.png', primaryColor: '#5aa9e6', secondaryColor: '#334155',
      address: '45 Queen St', city: 'Brisbane', state: 'QLD', serviceType: 'Creative Arts',
      contact: 'Tom Wilson', isPublic: 'Yes',
    },
  ],
  institutes: [
    {
      vendorName: 'Global Edu Partners', instituteName: 'Melbourne Tech College',
      address: '120 Collins St, Melbourne VIC', serviceType: 'Higher Education',
      city: 'Melbourne', instituteStatus: 'Active', isPublished: 'Yes', contactEmail: 'admissions@mtc.edu.au',
    },
    {
      vendorName: 'Study Abroad Hub', instituteName: 'Sydney Business School',
      address: '88 George St, Sydney NSW', serviceType: 'Business Programs',
      city: 'Sydney', instituteStatus: 'Active', isPublished: 'Yes', contactEmail: 'info@sbs.edu.au',
    },
    {
      vendorName: 'Pacific Pathways', instituteName: 'Brisbane Arts Institute',
      address: '45 Queen St, Brisbane QLD', serviceType: 'Creative Arts',
      city: 'Brisbane', instituteStatus: 'Inactive', isPublished: 'No', contactEmail: 'contact@bai.edu.au',
    },
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
