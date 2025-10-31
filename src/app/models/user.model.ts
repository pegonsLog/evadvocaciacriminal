export enum UserRole {
  ADMIN = 'ADMIN',
  COMUM = 'COMUM'
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
  active: boolean;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserRegistration extends UserCredentials {
  displayName: string;
  role: UserRole;
}
