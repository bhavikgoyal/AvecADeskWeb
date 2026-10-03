
import axiosClient from "./axiosClient";

const BASE_URL = "/api/VendorStudent";

export const getStudentApplications = async (
  search = '',
  pagenumber = 1,
  pageSize = 200,
  vendorId = null,
) => {
  const params = { search, pagenumber, pageSize };
  if (vendorId != null && vendorId !== '') {
    params.vendorId = vendorId;
  }

  const response = await axiosClient.get(
    `${BASE_URL}/GetStudentApplicationList`,
    { params },
  );

  return response.data;
};
