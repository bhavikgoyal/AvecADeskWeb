
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
  try {
    const response = await fetch(`/api/Members/delete/${userId}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || `Delete failed with status ${response.status}`
      };
    }

    return { success: true, data };

  } catch (err) {
    return { success: false, message: err.message || 'Network error' };
  }
};

export const resignMember = async (userId) => {
  try {
    const response = await fetch(`/api/Members/Resign/${userId}`, {
      method: "PATCH",
      headers: authHeaders()
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || `Resign failed with status ${response.status}`
      };
    }

    return { success: true, data };

  } catch (err) {
    return { success: false, message: err.message || 'Network error' };
  }
};

export const createMember = async (memberData) => {
  const response = await fetch("/api/Members/create", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(memberData)
  });

  return response;
};

export const updateMember = async (memberData) => {
  const response = await fetch("/api/Members/update", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(memberData)
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