export type ApiResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string };

export interface SessionUser {
  id: string;
  phone: string;
  role: "CLIENT" | "MASTER" | "ADMIN";
}
