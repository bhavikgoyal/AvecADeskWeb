import axiosClient from "./axiosClient";

const API_BASE = (studentId) => `/api/students/${studentId}/contracts`;

const toApiPayload = (contract) => ({
  ContractStatus: contract.status || "Active",
  ContractStartDate: contract.startDate ? contract.startDate : null,
  ContractEndDate: contract.endDate ? contract.endDate : null,
  ContractReferenceNo: contract.referenceNo || null,
  ContractFileUrl: contract.fileUrl || null,
  ContractFileName: contract.fileName || null,
  Notes: contract.notes || null,
});

const fromApiDto = (dto) => ({
  contractId: dto.id ?? dto.Id,
  studentId: dto.studentId ?? dto.StudentId,
  status: dto.contractStatus ?? dto.ContractStatus ?? "Active",
  startDate: (dto.contractStartDate ?? dto.ContractStartDate)?.substring(0, 10) ?? "",
  endDate: (dto.contractEndDate ?? dto.ContractEndDate)?.substring(0, 10) ?? "",
  referenceNo: dto.contractReferenceNo ?? dto.ContractReferenceNo ?? "",
  fileUrl: dto.contractFileUrl ?? dto.ContractFileUrl ?? "",
  fileName: dto.contractFileName ?? dto.ContractFileName ?? "",
  notes: dto.notes ?? dto.Notes ?? "",
});

// GET api/students/{studentId}/contracts
export async function fetchStudentContracts(studentId) {
  const { data } = await axiosClient.get(API_BASE(studentId));
  return (data || []).map(fromApiDto);
}

// POST api/students/{studentId}/contracts
export async function createStudentContract(contract) {
  const { data } = await axiosClient.post(
    API_BASE(contract.studentId),
    toApiPayload(contract)
  );
  return fromApiDto(data);
}

// PUT api/students/{studentId}/contracts/{contractId}
export async function updateStudentContract(contractId, contract) {
  const { data } = await axiosClient.put(
    `${API_BASE(contract.studentId)}/${contractId}`,
    toApiPayload(contract)
  );
  return fromApiDto(data);
}

// DELETE api/students/{studentId}/contracts/{contractId}
export async function deleteStudentContract(contractId, studentId) {
  const { data } = await axiosClient.delete(`${API_BASE(studentId)}/${contractId}`);
  return data;
}

// POST api/students/{studentId}/contracts/upload (multipart/form-data)
export async function uploadStudentContractFile(studentId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axiosClient.post(
    `${API_BASE(studentId)}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  // Matches the controller response { url, fileName }
  return {
    fileUrl: data?.url ?? "",
    fileName: data?.fileName ?? file.name,
  };
}