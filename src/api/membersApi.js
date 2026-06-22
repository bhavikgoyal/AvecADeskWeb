import axiosClient from './axiosClient';
import { Session } from "../utils/session";

const authHeaders = () => {
  const token = Session.getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
};

export const getMembers = async () => {
  const response = await fetch("/api/Members/Users_List", {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

export const deleteMember = async (userId) => {
  const response = await fetch(`/api/Members/delete/${userId}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  return response;
};

export const resignMember = async (userId) => {
  const response = await fetch(`/api/Members/Resign/${userId}`, {
    method: "PATCH",
    headers: authHeaders()
  });

  return response;
};

export const createMember = async (data) => {
  const response = await fetch("/api/Members/create", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  return response;
};

export const updateMember = async (data) => {
  const response = await fetch("/api/Members/update", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  return response;
};

export const getRoles = async () => {
  const response = await fetch("/api/UserRole/roles", {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Roles fetch failed: ${response.status}`);
  }

  return response.json();
};

export const getCompanies = async () => {
  const response = await fetch("/api/UserRole/companies", {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Companies fetch failed: ${response.status}`);
  }

  return response.json();
};

