export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface UserWithManager extends User {
  manager: User | null;
}

export interface Company {
  id: string;
  name: string;
  country: string;
  currencyCode: string;
}
