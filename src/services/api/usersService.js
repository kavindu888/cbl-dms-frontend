import api, { getOnce } from '@/lib/api'

const identityPath = (path) =>
  import.meta.env.DEV
    ? `/identity-proxy/${path.replace(/^\//, '')}`
    : `/${path.replace(/^\//, '')}`

function getValue(response, fallbackMessage = 'Request failed') {
  const result = response.data?.data

  if (!response.data?.success || result?.isFailure) {
    throw new Error(
      result?.validationErrors?.[0]?.message ||
        result?.errorMessage ||
        response.data?.errorMessage ||
        response.data?.message ||
        fallbackMessage
    )
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
    roles: (user.roles || []).flatMap((role) => {
      const name = roleName(role)
      return name ? [name] : []
    }),
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
    const response = await getOnce(identityPath('/users'), { params })
    const page = getValue(response, 'Unable to load users.')
    const items = page?.items || []

    return {
      ...page,
      items: items.map(mapUser),
    }
  },

  // User Details, Creation, and Role Management
  // User Details
  async getUser(id) {
    const response = await getOnce(identityPath(`/user/${id}`))
    return mapUser(getValue(response, 'Unable to load user.'))
  },

  // User Creation
  async createUser(payload) {
    const response = await api.post(identityPath('/users/create'), payload)
    return mapUser(getValue(response, 'Unable to create user.'))
  },

  // Update user profile (username + phone)
  async updateUser(userId, payload) {
    const response = await api.put(identityPath(`/users/${userId}`), payload)
    return mapUser(getValue(response, 'Unable to update user.'))
  },

  // Soft-delete / deactivate a user
  async deactivateUser(userId) {
    const response = await api.delete(identityPath(`/users/${userId}/deactivate`))
    getValue(response, 'Unable to deactivate user.')
  },

  // Role Assignment and Removal
  async assignRoles(userId, roleIds) {
    const response = await api.post(identityPath(`/users/${userId}/assign-roles`), { roleIds })
    return mapUser(getValue(response, 'Unable to assign roles.'))
  },

  // Note: Role removal endpoint is assumed to be a DELETE request to /users/{userId}/{roleId}
  async removeRole(userId, roleId) {
    const response = await api.delete(identityPath(`/users/${userId}/${roleId}`))
    return getValue(response, 'Unable to remove role.')
  },

  // Role and Permission Management
  // Role Listing
  async listRoles() {
    const response = await getOnce(identityPath('/roles'))
    return (getValue(response, 'Unable to load roles.') || []).map(mapRole)
  },

  // Permission Listing
  async listPermissions() {
    const response = await getOnce(identityPath('/permissions'))
    return (getValue(response, 'Unable to load permissions.') || []).map((group) => ({
      module: group.module,
      permissions: (group.permissions || []).map(mapPermission),
    }))
  },

  // User Permissions Management
  async getDirectPermissions(userId) {
    const response = await getOnce(`/api/v1/users/${userId}/get-direct-permissions`)
    return getValue(response, 'Unable to load user permissions.') || []
  },

  // Direct Permission Assignment and Revocation
  async assignDirectPermission(userId, payload) {
    const response = await api.post(`/api/v1/users/${userId}/create-direct-permission`, payload)
    return getValue(response, 'Unable to assign permission.')
  },

  // Note: Direct permission revocation endpoint is assumed to be a DELETE request to /users/{userId}/direct-permissions/{directPermissionId}
  async revokeDirectPermission(userId, directPermissionId) {
    const response = await api.delete(
      `/api/v1/users/${userId}/direct-permissions/${directPermissionId}`
    )
    return getValue(response, 'Unable to revoke permission.')
  },
}
