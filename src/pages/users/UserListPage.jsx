import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { Eye, EyeOff, Pencil, Plus, Search, Shield, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import RoleBadge from '@components/ui/RoleBadge'
import StatusBadge from '@components/ui/StatusBadge'
import UserAvatarIcon from '@components/ui/UserAvatarIcon'
import { masterService } from '@services/api/masterService'
import { usersService } from '@services/api/usersService'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

const DEFAULT_ORG_ID = '01JXDEFAULTORGID0000000000'
const userSchema = z.object({
  organisationId: z.string().min(1, 'Organisation is required'),
  employeeId: z.string().optional(),
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().min(1, 'Role is required'),
})

const editUserSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  phone: z.string().optional(),
  roleId: z.string().min(1, 'Role is required'),
})

const usersPageSize = 6
const permissionUsersPageSize = 1000

function getErrorMessage(error, fallback = 'Something went wrong') {
  if (error?.message === 'You do not have permission to perform this action.') {
    return 'You need user and role management permissions to load users.'
  }

  return error?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function permissionLabel(permission) {
  return `${permission.resource} ${permission.action}`.trim()
}

function getDirectPermissionId(permission) {
  return permission.permissionId ?? permission.PermissionId ?? ''
}

function getDirectPermissionRecordId(permission) {
  return permission.id ?? permission.Id ?? ''
}

function isDirectPermissionActive(permission) {
  return (
    permission.isEffective ?? permission.IsEffective ?? permission.isActive ?? permission.IsActive
  )
}

function areSetsEqual(firstSet, secondSet) {
  if (firstSet.size !== secondSet.size) return false

  for (const item of firstSet) {
    if (!secondSet.has(item)) return false
  }

  return true
}

function getCreatedTime(user) {
  const time = new Date(user.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function sortUsersByAddedOrder(users) {
  return [...users].sort((firstUser, secondUser) => {
    const createdDifference = getCreatedTime(firstUser) - getCreatedTime(secondUser)
    if (createdDifference !== 0) return createdDifference

    return firstUser.username.localeCompare(secondUser.username)
  })
}

function UserFormModal({ open, mode, user, roles, organisations, onClose, onSaved }) {
  const currentUser = useAuthStore((state) => state.user)
  const [showPassword, setShowPassword] = useState(false)
  const formRef = useRef(null)
  const schema = mode === 'edit' ? editUserSchema : userSchema

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  })

  const watchedUsername = watch('username')
  const watchedEmail = watch('email')

  useEffect(() => {
    if (mode !== 'create' || !watchedUsername) return
    const generated = `${watchedUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@ceybase-dms.local`
    if (!watchedEmail || watchedEmail.endsWith('@ceybase-dms.local')) {
      setValue('email', generated)
    }
  }, [watchedUsername, mode, setValue])

  useEffect(() => {
    if (!open) return

    if (mode === 'edit') {
      const currentRoleName = user?.roles?.[0]
      const currentRole = roles.find((role) => role.name === currentRoleName)
      reset({ username: user?.username || '', phone: user?.phone || '', roleId: currentRole?.id || '' })
      return
    }

    reset({
      organisationId: organisations[0]?.id || '',
      employeeId: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      roleId: roles[0]?.id || '',
    })
  }, [mode, open, reset, roles, user])

  useEffect(() => {
    if (!open) return

    window.setTimeout(() => {
      formRef.current?.querySelector('[data-auto-focus-field]')?.focus()
    }, 0)
  }, [open])

  async function onSubmit(values) {
    try {
      if (mode === 'edit') {
        const updatedUser = await usersService.updateUser(user.id, {
          username: values.username,
          phone: values.phone || null,
        })
        const currentRoleName = user?.roles?.[0]
        const currentRole = roles.find((role) => role.name === currentRoleName)
        if (currentRole?.id !== values.roleId) {
          await usersService.assignRoles(user.id, [values.roleId])
        }
        const freshUser = await usersService.getUser(user.id)
        onSaved(freshUser)
        toast.success('User updated.')
      } else {
        const savedUser = await usersService.createUser({
          organizationId: values.organisationId,
          employeeId: values.employeeId || null,
          username: values.username,
          email: values.email,
          password: values.password,
          phone: values.phone || null,
          roleIds: [values.roleId],
          createdByUserId: currentUser?.id || '',
        })
        onSaved(savedUser)
        toast.success('User created successfully.')
      }
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save user.'))
    }
  }

  function handleEnterToNext(event) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()

    const currentField = event.currentTarget
    const formElement = currentField.form
    if (!formElement) return

    const fields = Array.from(formElement.querySelectorAll('[data-enter-field]'))
    const currentIndex = fields.indexOf(currentField)
    const nextField = fields[currentIndex + 1]

    if (nextField) {
      nextField.focus()
      return
    }

    formElement.querySelector('#save-user-button')?.focus()
  }

  const enterKeyProps = {
    'data-enter-field': true,
    onKeyDown: handleEnterToNext,
  }

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,4,12,0.75)', backdropFilter: 'blur(2px)' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 shadow-2xl"
          style={{
            width: 'min(760px, calc(100vw - 48px))',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              padding: '28px 32px 18px',
            }}
          >
            <div>
              <Dialog.Title
                style={{ fontSize: 22, fontWeight: 650, color: 'var(--color-text-primary)' }}
              >
                {mode === 'edit' ? 'Edit User' : 'Create New Account'}
              </Dialog.Title>
              <Dialog.Description
                style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}
              >
                {mode === 'edit'
                  ? 'Update username, phone and role for this user.'
                  : 'Create a user using the backend Users API.'}
              </Dialog.Description>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="icon-button"
              onClick={onClose}
              style={{ width: 32, height: 32 }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit(onSubmit)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 20,
              padding: '0 32px 32px',
            }}
          >
            {mode === 'edit' ? (
              <>
                <div>
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    placeholder="john.silva"
                    data-auto-focus-field
                    {...enterKeyProps}
                    {...register('username')}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                  />
                  {errors.username ? (
                    <p className="mt-1 text-xs text-danger">{errors.username.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    placeholder="+94771234567"
                    {...enterKeyProps}
                    {...register('phone')}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                  />
                </div>
              </>
            ) : null}

            {mode === 'create' ? (
              <>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Organisation</label>
                  <select
                    className="form-input"
                    data-auto-focus-field
                    {...enterKeyProps}
                    {...register('organisationId')}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: 'pointer' }}
                  >
                    <option value="">Select organisation</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </option>
                    ))}
                  </select>
                  {errors.organisationId ? (
                    <p className="mt-1 text-xs text-danger">{errors.organisationId.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="form-label">Employee Code</label>
                  <input
                    className="form-input"
                    placeholder="EMP-001"
                    data-auto-focus-field
                    {...enterKeyProps}
                    {...register('employeeId')}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                  />
                </div>
                <div>
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    placeholder="john.silva"
                    {...enterKeyProps}
                    {...register('username')}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                  />
                  {errors.username ? (
                    <p className="mt-1 text-xs text-danger">{errors.username.message}</p>
                  ) : null}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="user@example.com"
                    {...enterKeyProps}
                    {...register('email')}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                  />
                  <p style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-dim)' }}>
                    Auto-filled from username — replace with a real email if available.
                  </p>
                  {errors.email ? (
                    <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    placeholder="+94771234567"
                    {...enterKeyProps}
                    {...register('phone')}
                    style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                  />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <div className="relative">
                    <input
                      className="form-input pr-11"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      {...enterKeyProps}
                      {...register('password')}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim"
                      onClick={() => setShowPassword((value) => !value)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Role</label>
              <select
                className="form-input"
                {...(mode === 'edit' ? { 'data-auto-focus-field': true } : {})}
                {...enterKeyProps}
                {...register('roleId')}
                style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: 'pointer' }}
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.roleId ? (
                <p className="mt-1 text-xs text-danger">{errors.roleId.message}</p>
              ) : null}
            </div>

            <div
              className="mt-2 flex justify-end gap-3"
              style={{ gridColumn: 'span 2' }}
            >
              <button
                type="button"
                className="button-secondary"
                onClick={onClose}
                style={{ height: 42, minWidth: 100 }}
              >
                Cancel
              </button>
              <button
                id="save-user-button"
                type="submit"
                className="button-primary"
                disabled={isSubmitting}
                style={{ height: 42, minWidth: 120 }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function UserRow({ user, onEdit, onDeactivate }) {
  return (
    <tr>
      <td style={{ padding: '15px 14px' }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated text-xs font-bold text-amber"
            title={user.username}
          >
            <UserAvatarIcon size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="text-sm font-semibold text-text-primary">{user.username}</p>
            <p
              className="text-xs text-text-dim"
              style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={user.phone || user.id}
            >
              {user.phone || 'User account'}
            </p>
          </div>
        </div>
      </td>
      <td
        className="text-xs font-mono"
        style={{ padding: '15px 14px', color: 'var(--color-text-muted)' }}
      >
        {user.employeeCode || '-'}
      </td>
      <td className="text-sm" style={{ padding: '15px 14px', color: 'var(--color-text-muted)' }}>
        <span
          style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={user.email}
        >
          {user.email}
        </span>
      </td>
      <td style={{ padding: '15px 14px' }}>
        <div className="flex flex-wrap gap-1">
          {user.roles.length ? (
            user.roles.map((role) => <RoleBadge key={role} role={role} />)
          ) : (
            <span className="text-xs text-text-dim">No role</span>
          )}
        </div>
      </td>
      <td style={{ padding: '15px 14px' }}>
        <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
      </td>
      <td className="text-xs" style={{ padding: '15px 14px', color: 'var(--color-text-muted)' }}>
        {formatDate(user.lastLoginAt)}
      </td>
      <td style={{ padding: '15px 18px 15px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          type="button"
          className="icon-button"
          title="Edit user"
          onClick={() => onEdit(user)}
          style={{ width: 34, height: 34, borderRadius: 10, marginRight: 6 }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="icon-button"
          title="Deactivate user"
          disabled={!user.isActive}
          onClick={() => onDeactivate(user)}
          style={{ width: 34, height: 34, borderRadius: 10, opacity: user.isActive ? 1 : 0.4 }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

export default function UserListPage() {
  const currentUser = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState('management')
  const [users, setUsers] = useState([])
  const [permissionUsers, setPermissionUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [organisations, setOrganisations] = useState([])
  const [permissionGroups, setPermissionGroups] = useState([])
  const [directPermissions, setDirectPermissions] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPermissionUsersLoading, setIsPermissionUsersLoading] = useState(false)
  const [isPermissionLoading, setIsPermissionLoading] = useState(false)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [error, setError] = useState('')
  const [modalState, setModalState] = useState({ open: false, mode: 'create', user: null })

  const orgId = currentUser?.orgId || DEFAULT_ORG_ID
  const canCreateUsers = userHasPermission(currentUser, PERMISSIONS.identity.userManage)
  const canManagePermissions = userHasPermission(currentUser, PERMISSIONS.identity.permissionManage)

  useEffect(() => {
    if (activeTab === 'permission' && !canManagePermissions) {
      setActiveTab('management')
    }
  }, [activeTab, canManagePermissions])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const usersPage = await usersService.listUsers({
        orgId,
        page,
        pageSize: usersPageSize,
        search: search.trim() || undefined,
        roleId: roleFilter === 'all' ? undefined : roleFilter,
        isActive: undefined,
      })

      setUsers(sortUsersByAddedOrder(usersPage.items || []))
      setTotalPages(usersPage.totalPages || 1)
      setTotalItems(usersPage.totalItems || 0)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load users.'))
    } finally {
      setIsLoading(false)
    }
  }, [orgId, page, roleFilter, search])

  const loadRoles = useCallback(async () => {
    try {
      const rolesList = await usersService.listRoles()
      setRoles(rolesList)
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load roles.'))
    }
  }, [])

  const loadOrganisations = useCallback(async () => {
    try {
      const orgList = await masterService.listOrganisations()
      setOrganisations(orgList.filter((o) => o.isActive))
    } catch {
      toast.error('Unable to load organisations.')
    }
  }, [])

  const loadPermissionUsers = useCallback(async () => {
    setIsPermissionUsersLoading(true)

    try {
      const firstPage = await usersService.listUsers({
        orgId,
        page: 1,
        pageSize: permissionUsersPageSize,
        isActive: undefined,
      })

      let allUsers = firstPage.items || []
      const pageCount = firstPage.totalPages || 1

      for (let nextPage = 2; nextPage <= pageCount; nextPage += 1) {
        const usersPage = await usersService.listUsers({
          orgId,
          page: nextPage,
          pageSize: permissionUsersPageSize,
          isActive: undefined,
        })

        allUsers = [...allUsers, ...(usersPage.items || [])]
      }

      setPermissionUsers(sortUsersByAddedOrder(allUsers))
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load users for permissions.'))
    } finally {
      setIsPermissionUsersLoading(false)
    }
  }, [orgId])

  async function loadPermissions() {
    try {
      const groups = await usersService.listPermissions()
      setPermissionGroups(groups)
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load permissions.'))
    }
  }

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  useEffect(() => {
    loadOrganisations()
  }, [loadOrganisations])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    if (!canManagePermissions) return

    if (activeTab === 'permission' && permissionGroups.length === 0) {
      loadPermissions()
    }
    if (activeTab === 'permission' && permissionUsers.length === 0) {
      loadPermissionUsers()
    }
  }, [
    activeTab,
    canManagePermissions,
    loadPermissionUsers,
    permissionGroups.length,
    permissionUsers.length,
  ])

  useEffect(() => {
    async function loadDirectPermissions() {
      if (!canManagePermissions) {
        setDirectPermissions([])
        setSelectedPermissionIds([])
        return
      }

      if (!selectedPermissionUserId) {
        setDirectPermissions([])
        setSelectedPermissionIds([])
        return
      }

      setIsPermissionLoading(true)
      try {
        const items = await usersService.getDirectPermissions(selectedPermissionUserId)
        const activePermissionIds = items
          .filter(isDirectPermissionActive)
          .map(getDirectPermissionId)

        setDirectPermissions(items)
        setSelectedPermissionIds(activePermissionIds)
      } catch (loadError) {
        toast.error(getErrorMessage(loadError, 'Unable to load direct permissions.'))
      } finally {
        setIsPermissionLoading(false)
      }
    }

    loadDirectPermissions()
  }, [canManagePermissions, selectedPermissionUserId])

  const flatPermissions = useMemo(
    () => permissionGroups.flatMap((group) => group.permissions),
    [permissionGroups]
  )

  const selectedPermissionUser = permissionUsers.find(
    (user) => user.id === selectedPermissionUserId
  )

  const directPermissionMap = useMemo(() => {
    const entries = directPermissions
      .filter(isDirectPermissionActive)
      .map((permission) => [getDirectPermissionId(permission), permission])

    return new Map(entries)
  }, [directPermissions])

  const selectedPermissionSet = useMemo(
    () => new Set(selectedPermissionIds),
    [selectedPermissionIds]
  )

  const savedPermissionSet = useMemo(
    () => new Set(directPermissionMap.keys()),
    [directPermissionMap]
  )

  const hasPermissionChanges = useMemo(
    () => !areSetsEqual(selectedPermissionSet, savedPermissionSet),
    [savedPermissionSet, selectedPermissionSet]
  )

  function handleSaved(savedUser) {
    const exists = users.some((user) => user.id === savedUser.id)

    if (exists) {
      setUsers((currentUsers) =>
        sortUsersByAddedOrder(
          currentUsers.map((user) => (user.id === savedUser.id ? savedUser : user))
        )
      )
      setPermissionUsers((currentUsers) =>
        sortUsersByAddedOrder(
          currentUsers.map((user) => (user.id === savedUser.id ? savedUser : user))
        )
      )
      return
    }

    setUsers((currentUsers) => sortUsersByAddedOrder([...currentUsers, savedUser]))
    setPermissionUsers((currentUsers) => sortUsersByAddedOrder([...currentUsers, savedUser]))
    setTotalItems((currentTotal) => currentTotal + 1)
  }

  function handlePermissionChange(permission, isChecked) {
    setSelectedPermissionIds((currentIds) => {
      if (isChecked) {
        return currentIds.includes(permission.id) ? currentIds : [...currentIds, permission.id]
      }

      return currentIds.filter((permissionId) => permissionId !== permission.id)
    })
  }

  async function handleDeactivate(user) {
    if (!window.confirm(`Deactivate "${user.username}"? They will no longer be able to log in.`)) return
    try {
      await usersService.deactivateUser(user.id)
      setUsers((current) =>
        current.map((u) => (u.id === user.id ? { ...u, isActive: false, status: 'INACTIVE' } : u))
      )
      toast.success(`${user.username} has been deactivated.`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to deactivate user.'))
    }
  }

  async function handleSavePermissions() {
    if (!canManagePermissions) return

    if (!selectedPermissionUserId || !hasPermissionChanges) return

    const permissionIdsToAdd = [...selectedPermissionSet].filter(
      (permissionId) => !savedPermissionSet.has(permissionId)
    )
    const permissionIdsToRemove = [...savedPermissionSet].filter(
      (permissionId) => !selectedPermissionSet.has(permissionId)
    )

    setIsSavingPermissions(true)
    try {
      const addedPermissions = []

      for (const permissionId of permissionIdsToAdd) {
        const assigned = await usersService.assignDirectPermission(selectedPermissionUserId, {
          permissionId,
          expiresAt: null,
          reason: 'Assigned from frontend user management',
        })
        addedPermissions.push(assigned)
      }

      for (const permissionId of permissionIdsToRemove) {
        const directPermission = directPermissionMap.get(permissionId)
        const directPermissionId = directPermission
          ? getDirectPermissionRecordId(directPermission)
          : ''

        if (directPermissionId) {
          await usersService.revokeDirectPermission(selectedPermissionUserId, directPermissionId)
        }
      }

      setDirectPermissions((currentPermissions) => [
        ...addedPermissions,
        ...currentPermissions.filter((permission) => {
          const permissionId = getDirectPermissionId(permission)
          return !permissionIdsToRemove.includes(permissionId)
        }),
      ])
      toast.success('User permissions saved.')
    } catch (permissionError) {
      toast.error(getErrorMessage(permissionError, 'Unable to save permissions.'))
    } finally {
      setIsSavingPermissions(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            User Management
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {totalItems} accounts - showing page {page} of {totalPages}
          </p>
        </div>

        {activeTab === 'management' && canCreateUsers ? (
          <button
            type="button"
            className="button-primary"
            onClick={() => setModalState({ open: true, mode: 'create', user: null })}
            style={{
              height: 40,
              padding: '0 24px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus className="h-4 w-4" />
            Create New Account
          </button>
        ) : null}
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <div
          style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28, marginTop: 8 }}
        >
          <Tabs.List style={{ display: 'flex', gap: 0 }} aria-label="User sections">
            {[
              ['management', 'User Management'],
              ...(canManagePermissions ? [['permission', 'User Permission']] : []),
            ].map(([value, label]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="settings-inner-tab"
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  borderBottom: '2px solid transparent',
                  color: 'var(--color-text-muted)',
                  transition: 'color 150ms, border-color 150ms',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                }}
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <Tabs.Content value="management">
          <div
            className="panel"
            style={{
              marginBottom: 16,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: 'var(--color-text-dim)',
                }}
              />
              <input
                className="form-input"
                placeholder="Search by name, email or employee code..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  paddingLeft: 36,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                }}
              />
            </div>
            <select
              className="form-input"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              style={{
                width: 220,
                height: 40,
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '0 16px',
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="panel overflow-hidden">
            <div>
              <table
                className="data-table"
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                }}
              >
                <colgroup>
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr>
                    {[
                      'User',
                      'Employee Code',
                      'Email',
                      'Role',
                      'Status',
                      'Last Login',
                      'Actions',
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: heading === 'Actions' ? '13px 18px 13px 10px' : '13px 14px',
                          textAlign: heading === 'Actions' ? 'right' : undefined,
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                        Loading users...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-danger">
                        {error}
                      </td>
                    </tr>
                  ) : users.length ? (
                    users.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        onEdit={(selectedUser) =>
                          setModalState({ open: true, mode: 'edit', user: selectedUser })
                        }
                        onDeactivate={handleDeactivate}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                        No users match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 16px',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
                Showing {users.length} of {totalItems} users
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="permission">
          <div className="panel" style={{ padding: '24px 28px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 24,
                paddingBottom: 22,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 650,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Shield style={{ width: 18, height: 18, color: 'var(--color-amber)' }} />
                  Direct User Permissions
                </h2>
                <p style={{ marginTop: 5, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Assign direct backend permissions to a selected user.
                </p>
              </div>

              <div style={{ width: 340 }}>
                <label className="form-label">USER</label>
                <select
                  className="form-input"
                  value={selectedPermissionUserId}
                  onChange={(event) => setSelectedPermissionUserId(event.target.value)}
                  disabled={isPermissionUsersLoading}
                  style={{
                    height: 40,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                >
                  <option value="">
                    {isPermissionUsersLoading ? 'Loading users...' : 'Select user'}
                  </option>
                  {permissionUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedPermissionUserId ? (
              <div
                style={{
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-dim)',
                  fontSize: 14,
                }}
              >
                Select a user to configure direct permissions.
              </div>
            ) : isPermissionLoading ? (
              <div
                style={{
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 14,
                }}
              >
                Loading permissions...
              </div>
            ) : (
              <div style={{ paddingTop: 0 }}>
                <div
                  style={{
                    position: 'sticky',
                    top: 'calc(var(--spacing-layout-topbar, 80px) + 24px)',
                    zIndex: 10,
                    background: 'var(--color-bg-surface)',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 0',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge
                      status={selectedPermissionUser?.isActive ? 'ACTIVE' : 'INACTIVE'}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text-primary)' }}
                    >
                      {selectedPermissionUser?.username}
                    </p>
                    <p style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {selectedPermissionSet.size} of {flatPermissions.length} direct permissions
                      selected
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={!hasPermissionChanges || isSavingPermissions}
                      onClick={handleSavePermissions}
                      style={{ height: 36, padding: '0 16px', fontSize: 13 }}
                    >
                      {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {permissionGroups.map((group) => (
                    <div
                      key={group.module}
                      style={{
                        padding: 16,
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 650,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {group.module}
                          </p>
                          <p
                            style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}
                          >
                            {group.permissions.length} permissions
                          </p>
                        </div>
                        <span
                          className="mono"
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            border: '1px solid rgba(102,181,250,0.25)',
                            background: 'rgba(102,181,250,0.10)',
                            color: 'var(--color-blue)',
                            fontSize: 11,
                          }}
                        >
                          {
                            group.permissions.filter((permission) =>
                              selectedPermissionSet.has(permission.id)
                            ).length
                          }
                          /{group.permissions.length}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {group.permissions.map((permission) => {
                          const isChecked = selectedPermissionSet.has(permission.id)

                          return (
                            <label
                              key={permission.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                padding: '9px 10px',
                                border: `1px solid ${
                                  isChecked
                                    ? 'color-mix(in srgb, var(--color-amber) 45%, transparent)'
                                    : 'var(--color-border)'
                                }`,
                                borderRadius: 6,
                                background: isChecked
                                  ? 'color-mix(in srgb, var(--color-amber) 8%, transparent)'
                                  : 'var(--color-bg-surface)',
                                cursor: isSavingPermissions ? 'default' : 'pointer',
                                opacity: isSavingPermissions ? 0.65 : 1,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSavingPermissions}
                                onChange={(event) =>
                                  handlePermissionChange(permission, event.target.checked)
                                }
                                style={{
                                  width: 16,
                                  height: 16,
                                  marginTop: 2,
                                  accentColor: 'var(--color-amber)',
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)',
                                  }}
                                >
                                  {permissionLabel(permission)}
                                </span>
                                <span
                                  className="mono"
                                  style={{
                                    display: 'block',
                                    marginTop: 2,
                                    fontSize: 11,
                                    color: 'var(--color-text-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={permission.key}
                                >
                                  {permission.key}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <UserFormModal
        open={modalState.open}
        mode={modalState.mode}
        user={modalState.user}
        roles={roles}
        organisations={organisations}
        onSaved={handleSaved}
        onClose={() => setModalState({ open: false, mode: 'create', user: null })}
      />
    </div>
  )
}
