import axiosClient from "./axiosClient";

const BASE_URL = "/api/EmployeeWorkHours";

export const createStartStop = async (data) => {
    const response = await axiosClient.post(
        `${BASE_URL}/Create%20Employee%20Work%20Hours`,
        data
    );
    return response.data;
};

export const updateStartStop = async (data) => {
    const response = await axiosClient.put(
        `${BASE_URL}/Update%20Employee%20Work%20Hours`,
        data
    );
    return response.data;
};

export const getStartStopByUserId = async (id) => {
    const response = await axiosClient.get(
        `${BASE_URL}/Select_By_UserId?id=${id}`
    );
    return response.data;
};

export const getAllStartStops = async () => {
    const response = await axiosClient.get(
        `${BASE_URL}/Employee%20Work%20Hours%20ALL`
    );
    return response.data;
};