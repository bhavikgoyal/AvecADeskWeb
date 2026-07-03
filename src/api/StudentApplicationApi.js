import axiosClient from "./axiosClient";

const BASE_URL = "/api/StudentApplication";

export const getStudentApplications = async (search = '', pagenumber = 1, pageSize = 200) => {
  const response = await axiosClient.get(
    '/api/StudentApplication/GetStudentApplicationList',{params: {search, pagenumber, pageSize}, }
  );

  return response.data;
};