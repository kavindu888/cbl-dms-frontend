import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const result = response.data?.data

  if (!response.data?.success || result?.isFailure) {
    throw new Error(result?.errorMessage || response.data?.errorMessage || fallbackMessage)
  }

  return result?.value ?? result
}

function roleName(role) {
  return typeof role === 'string' ? role : role?.name
}

function mapUser(user) {
  if (!user) return null

  return {
    id: user.id,
    username: user.username ?? '',
    email: user.email ?? '',
    employeeCode: user.employeeId ?? user.employeeCode ?? '',
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? '',
    roles: (user.roles || []).map(roleName).filter(Boolean),
    roleDtos: user.roles || [],
    permissions: user.permissions || [],
    isActive: Boolean(user.isActive),
    isLocked: Boolean(user.isLocked),
    orgId: user.organizationId ?? user.orgId ?? '',
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }
}

function mapRole(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? '',
    isSystemRole: Boolean(role.isSystemRole),
    permissionCount: role.permissionCount ?? 0,
  }
}

function mapPermission(permission) {
  return {
    id: permission.id,
    module: permission.module,
    resource: permission.resource,
    action: permission.action,
    key:
      permission.permissionKey ||
      `${permission.module}:${permission.resource}:${permission.action}`,
    label: `${permission.module}:${permission.resource}:${permission.action}`,
  }
}

export const usersService = {
  async listUsers(params = {}) {
    const response = await getOnce('/identity-proxy/users', { params })
    const page = getValue(response, 'Unable to load users.')
    const items = page?.items || []

    return {
      ...page,
      items: items.map(mapUser),
    }
  },

  async getUser(id) {
    const response = await getOnce(`/identity-proxy/user/${id}`)
    return mapUser(getValue(response, 'Unable to load user.'))
  },

  async createUser(payload) {
    const response = await api.post('/identity-proxy/users/create', payload)
    return mapUser(getValue(response, 'Unable to create user.'))
  },

  async assignRoles(userId, roleIds) {
    const response = await api.post(`/identity-proxy/users/${userId}/assign-roles`, { roleIds })
    return mapUser(getValue(response, 'Unable to assign roles.'))
  },

  async removeRole(userId, roleId) {
    const response = await api.delete(`/identity-proxy/users/${userId}/${roleId}`)
    return getValue(response, 'Unable to remove role.')
  },

  async listRoles() {
    const response = await getOnce('/identity-proxy/roles')
    return (getValue(response, 'Unable to load roles.') || []).map(mapRole)
  },

  async listPermissions() {
    const response = await getOnce('/identity-proxy/permissions')
    return (getValue(response, 'Unable to load permissions.') || []).map((group) => ({
      module: group.module,
      permissions: (group.permissions || []).map(mapPermission),
    }))
  },

  async getDirectPermissions(userId) {
    const response = await getOnce(`/api/v1/users/${userId}/get-direct-permissions`)
    return getValue(response, 'Unable to load user permissions.') || []
  },

  async assignDirectPermission(userId, payload) {
    const response = await api.post(`/api/v1/users/${userId}/create-direct-permission`, payload)
    return getValue(response, 'Unable to assign permission.')
  },

  async revokeDirectPermission(userId, directPermissionId) {
    const response = await api.delete(
      `/api/v1/users/${userId}/direct-permissions/${directPermissionId}`
    )
    return getValue(response, 'Unable to revoke permission.')
  },
}
