import type { Permission, Role } from './auth.types'

export interface UserListItemDto {
  id: string
  username: string
  email: string
  employeeCode: string
  phone: string
  roles: Role[]
  isActive: boolean
  orgId: string
}

export interface CreateUserRequest {
  username: string
  email: string
  phone: string
  employeeCode: string
  password: string
  roles: Role[]
  orgId: string
}

export interface UpdateUserRequest {
  email?: string
  phone?: string
  roles?: Role[]
  isActive?: boolean
}

export interface RoleDto {
  id: string
  name: Role
  description: string
}

export interface PermissionDto {
  id: string
  code: Permission
  label: string
  module: string
}

export type PermissionMatrix = Record<string, PermissionDto[]>
