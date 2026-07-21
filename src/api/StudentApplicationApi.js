
import axiosClient from "./axiosClient";

const BASE_URL = "/api/VendorStudent";

export const getStudentApplications = async (search = '', pagenumber = 1, pageSize = 200) => {
  const response = await axiosClient.get(
    `${BASE_URL}/GetStudentApplicationList`, 
    { params: { search, pagenumber, pageSize } }
  );

  return response.data;
};