import axiosClient from "./axiosClient";
import { Session } from "../utils/session";

const authHeaders = () => {
  const token = Session.getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export async function changePassword({ userId, oldPassword, newPassword, }) {
  const response = await axiosClient.post("/api/user/change-password",
    {
      userId,
      oldPassword,
      newPassword,
    },
    {
      headers: authHeaders(),
    }
  );
  return response.data;
}