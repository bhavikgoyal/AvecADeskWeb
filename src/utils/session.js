export const Session = {
  getToken() {
    return localStorage.getItem("auth_token");
  },

  getRole() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role || null;
  },
  getUserId() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id || null;
  }
};