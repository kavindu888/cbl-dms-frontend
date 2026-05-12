export enum Role {
  Admin = 'Admin',
  PurchasingManager = 'PurchasingManager',
  InventoryController = 'InventoryController',
  SalesRepresentative = 'SalesRepresentative',
  CollectionsOfficer = 'CollectionsOfficer',
  FleetCoordinator = 'FleetCoordinator',
  Analyst = 'Analyst',
  UserAdministrator = 'UserAdministrator',
}

export type Permission =
  | 'dashboard:view'
  | 'purchasing:view'
  | 'purchasing:manage'
  | 'inventory:view'
  | 'inventory:adjust'
  | 'sales:view'
  | 'sales:manage'
  | 'collections:view'
  | 'collections:manage'
  | 'fleet:view'
  | 'fleet:manage'
  | 'reports:view'
  | 'users:view'
  | 'users:manage'
  | 'settings:manage'
  | '*'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken?: string | null
  user: UserDto
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  employeeCode: string
  phone: string
  roles: Role[]
  orgId: string
}

export interface UserDto {
  id: string
  username: string
  email: string
  employeeCode: string
  phone: string
  roles: Role[]
  permissions: Permission[]
  orgId: string
}

export interface TokenPayload {
  sub: string
  username: string
  roles: Role[]
  permissions: Permission[]
  orgId: string
  exp: number
  iat: number
}
