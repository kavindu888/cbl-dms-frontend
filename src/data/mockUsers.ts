import { Role, type LoginResponse, type Permission, type UserDto } from '@/types/auth.types'
import type { UserListItemDto } from '@/types/users.types'

const adminPermissions: Permission[] = ['*']

export const mockAuthUsers: UserDto[] = [
  {
    id: 'usr-001',
    username: 'admin',
    email: 'admin@cblfoods.lk',
    employeeCode: 'CBL-ADM-001',
    phone: '+94 77 000 0000',
    roles: [Role.Admin, Role.UserAdministrator],
    permissions: adminPermissions,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-002',
    username: 'saleslead',
    email: 'saleslead@cblfoods.lk',
    employeeCode: 'CBL-SAL-001',
    phone: '+94 77 111 1111',
    roles: [Role.SalesRepresentative],
    permissions: ['dashboard:view', 'sales:view', 'sales:manage', 'collections:view'],
    orgId: 'cbl-lk',
  },
]

export const mockUsers: UserListItemDto[] = mockAuthUsers.map((user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  employeeCode: user.employeeCode,
  phone: user.phone,
  roles: user.roles,
  isActive: true,
  orgId: user.orgId,
}))

export function getMockUserByUsername(username: string) {
  return (
    mockAuthUsers.find((user) => user.username.toLowerCase() === username.trim().toLowerCase()) ??
    mockAuthUsers[0]
  )
}

export function createMockLoginResponse(username: string): LoginResponse {
  const user = getMockUserByUsername(username)

  return {
    accessToken: 'local-dev-access-token',
    refreshToken: 'local-dev-refresh-token',
    user,
  }
}
