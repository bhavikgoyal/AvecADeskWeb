import axiosClient from "./axiosClient";

const BASE_URL = "/api/StartStop";

export const createStartStop = async (data) => {
    const response = await axiosClient.post(
        `${BASE_URL}/Create_Start_Stop`,
        data
    );
    return response.data;
};

export const updateStartStop = async (data) => {
    const response = await axiosClient.put(
        `${BASE_URL}/Update_Start_Stop`,
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
        `${BASE_URL}/Start_Stop_ALL`
    );
    return response.data;
};