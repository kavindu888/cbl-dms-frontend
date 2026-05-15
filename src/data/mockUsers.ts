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

export const mockUsers: UserListItemDto[] = [
  {
    id: 'usr-001',
    username: 'a.perera',
    email: 'a.perera@cblfoods.lk',
    employeeCode: 'EMP-001',
    phone: '+94 77 234 5678',
    roles: [Role.Admin],
    isActive: true,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-002',
    username: 'john.perera',
    email: 'john.perera@cblfoods.lk',
    employeeCode: 'EMP-042',
    phone: '+94 77 234 5678',
    roles: [Role.SalesRepresentative],
    isActive: true,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-003',
    username: 'k.bandara',
    email: 'k.bandara@cblfoods.lk',
    employeeCode: 'EMP-018',
    phone: '+94 71 345 6789',
    roles: [Role.FleetCoordinator],
    isActive: true,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-004',
    username: 'r.fernando',
    email: 'r.fernando@cblfoods.lk',
    employeeCode: 'EMP-023',
    phone: '+94 76 456 7890',
    roles: [Role.SalesRepresentative],
    isActive: true,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-005',
    username: 'm.silva',
    email: 'm.silva@cblfoods.lk',
    employeeCode: 'EMP-031',
    phone: '+94 70 567 8901',
    roles: [Role.InventoryController],
    isActive: true,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-006',
    username: 's.jayawardena',
    email: 's.jayawardena@cblfoods.lk',
    employeeCode: 'EMP-055',
    phone: '+94 77 678 9012',
    roles: [Role.CollectionsOfficer],
    isActive: false,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-007',
    username: 'n.wickrama',
    email: 'n.wickrama@cblfoods.lk',
    employeeCode: 'EMP-060',
    phone: '+94 71 789 0123',
    roles: [Role.PurchasingManager],
    isActive: true,
    orgId: 'cbl-lk',
  },
  {
    id: 'usr-008',
    username: 'd.gunawardena',
    email: 'd.gunawardena@cblfoods.lk',
    employeeCode: 'EMP-075',
    phone: '+94 76 890 1234',
    roles: [Role.Analyst],
    isActive: true,
    orgId: 'cbl-lk',
  },
]

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
