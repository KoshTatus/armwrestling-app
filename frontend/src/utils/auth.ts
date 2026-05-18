import { Role } from "../types/authTypes";

export const getCookieValue = (cookieName: string): string | null => {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === cookieName) {
        return decodeURIComponent(value);
      }
    }
    return null;
};
  
export const decodeTokenPayload = (token: string): { id: number, role_id: number }=> {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
};

export const clearAuthCookies = (): void => {
  document.cookie = "token=; max-age=0; path=/;";
};

export const numberToRole = (roleNumber: number): Role=> {
  switch (roleNumber) {
    case Role.PARTICIPANT:
      return Role.PARTICIPANT;
    case Role.ORGANIZER:
      return Role.ORGANIZER;
    case Role.ADMIN:
      return Role.ADMIN;
    default:
      return Role.PARTICIPANT;;
  }
};