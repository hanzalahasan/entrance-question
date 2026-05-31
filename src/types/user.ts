export type UserRole =
  | "super_admin"
  | "question_manager"
  | "reviewer"
  | "viewer";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: string;
};