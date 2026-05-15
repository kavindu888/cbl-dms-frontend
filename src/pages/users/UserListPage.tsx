import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Bell, Eye, EyeOff, Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import StatusBadge from '@components/ui/StatusBadge'
import { mockUsers } from '@data/mockUsers'
import { Role } from '@/types/auth.types'
import type { UserListItemDto } from '@/types/users.types'

const ROLE_LABELS: Record<Role, string> = {
  [Role.Admin]:               'Admin',
  [Role.PurchasingManager]:   'Purchasing Manager',
  [Role.InventoryController]: 'Inventory Controller',
  [Role.SalesRepresentative]: 'Sales Representative',
  [Role.CollectionsOfficer]:  'Collections Officer',
  [Role.FleetCoordinator]:    'Fleet Coordinator',
  [Role.Analyst]:             'Analyst',
  [Role.UserAdministrator]:   'User Administrator',
}

const VEHICLES = [
  'WP-KH-3421 · Lorry 3T',
  'WP-GA-7823 · Lorry 1.5T',
  'WP-MB-4521 · Van',
  'WP-AB-1234 · Lorry 5T',
]

const createUserSchema = z
  .object({
    firstName:       z.string().min(1, 'First name is required'),
    lastName:        z.string().min(1, 'Last name is required'),
    username:        z.string().min(3, 'Username must be at least 3 characters'),
    email:           z.string().email('Valid email required'),
    employeeCode:    z.string().min(1, 'Employee code is required'),
    phone:           z.string().min(7, 'Phone number is required'),
    role:            z.nativeEnum(Role),
    assignedVehicle: z.string().optional(),
    password:        z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type CreateUserFormValues = z.infer<typeof createUserSchema>

function getInitials(username: string) {
  return username
    .split('.')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

function passwordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak',   color: '#F43F5E' },
    2: { label: 'Fair',   color: '#FACC15' },
    3: { label: 'Good',   color: '#FACC15' },
    4: { label: 'Strong', color: '#20D4BF' },
  }
  return { level: score, ...(map[score] ?? map[1]) }
}

function CreateUserModal({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: (user: UserListItemDto) => void
}) {
  const [showPw, setShowPw] = useState(false)
  const [showConfPw, setShowConfPw] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: Role.SalesRepresentative },
  })

  const firstName = watch('firstName') ?? ''
  const lastName  = watch('lastName')  ?? ''
  const password  = watch('password')  ?? ''

  useEffect(() => {
    if (firstName || lastName) {
      const generated = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`.replace(/\s+/g, '')
      setValue('username', generated)
    }
  }, [firstName, lastName, setValue])

  const strength = passwordStrength(password)

  async function onSubmit(values: CreateUserFormValues) {
    await new Promise((r) => setTimeout(r, 600))
    const newUser: UserListItemDto = {
      id: `usr-${Date.now()}`,
      username: values.username,
      email: values.email,
      employeeCode: values.employeeCode,
      phone: `+94 ${values.phone}`,
      roles: [values.role],
      isActive: true,
      orgId: 'cbl-lk',
    }
    onCreated(newUser)
    toast.success(`User ${values.username} created. Login credentials sent by email.`)
    reset()
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,4,12,0.75)', backdropFilter: 'blur(2px)' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            maxHeight: '92vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between p-6 pb-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <Dialog.Title
                className="text-xl font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Create New Account
              </Dialog.Title>
              <Dialog.Description
                className="mt-1 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Admin access required to create users
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">FIRST NAME</label>
                <input
                  className={`form-input ${errors.firstName ? 'error' : ''}`}
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && <p className="form-error">⚠ {errors.firstName.message}</p>}
              </div>
              <div>
                <label className="form-label">LAST NAME</label>
                <input
                  className={`form-input ${errors.lastName ? 'error' : ''}`}
                  placeholder="Perera"
                  {...register('lastName')}
                />
                {errors.lastName && <p className="form-error">⚠ {errors.lastName.message}</p>}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="form-label">USERNAME</label>
              <input
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="john.perera"
                {...register('username')}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                Auto-generated from first + last name
              </p>
              {errors.username && <p className="form-error">⚠ {errors.username.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="form-label">EMAIL</label>
              <input
                className={`form-input ${errors.email ? 'error' : ''}`}
                type="email"
                placeholder="john.perera@cblfoods.lk"
                {...register('email')}
              />
              {errors.email && <p className="form-error">⚠ {errors.email.message}</p>}
            </div>

            {/* Employee Code + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">EMPLOYEE CODE</label>
                <input
                  className={`form-input ${errors.employeeCode ? 'error' : ''}`}
                  placeholder="EMP-042"
                  {...register('employeeCode')}
                />
                {errors.employeeCode && <p className="form-error">⚠ {errors.employeeCode.message}</p>}
              </div>
              <div>
                <label className="form-label">PHONE</label>
                <div className="flex">
                  <span
                    className="flex items-center px-3 text-sm"
                    style={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRight: 'none',
                      borderRadius: 'var(--radius-input) 0 0 var(--radius-input)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    +94
                  </span>
                  <input
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                    style={{ borderRadius: '0 var(--radius-input) var(--radius-input) 0' }}
                    placeholder="77 234 5678"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p className="form-error">⚠ {errors.phone.message}</p>}
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="form-label">ROLE</label>
              <select
                className={`form-input ${errors.role ? 'error' : ''}`}
                style={{ cursor: 'pointer' }}
                {...register('role')}
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value} style={{ background: 'var(--color-bg-elevated)' }}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Vehicle */}
            <div>
              <label className="form-label">ASSIGNED VEHICLE</label>
              <select
                className="form-input"
                style={{ cursor: 'pointer' }}
                {...register('assignedVehicle')}
              >
                <option value="" style={{ background: 'var(--color-bg-elevated)' }}>— None —</option>
                {VEHICLES.map((v) => (
                  <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>{v}</option>
                ))}
              </select>
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">PASSWORD</label>
                <div className="relative">
                  <input
                    className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center"
                    style={{ color: 'var(--color-text-dim)' }}
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error">⚠ {errors.password.message}</p>}
              </div>
              <div>
                <label className="form-label">CONFIRM PASSWORD</label>
                <div className="relative">
                  <input
                    className={`form-input pr-10 ${errors.confirmPassword ? 'error' : ''}`}
                    type={showConfPw ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center"
                    style={{ color: 'var(--color-text-dim)' }}
                    onClick={() => setShowConfPw((v) => !v)}
                    tabIndex={-1}
                  >
                    {showConfPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="form-error">⚠ {errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div>
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-colors duration-200"
                      style={{ background: i <= strength.level ? strength.color : 'var(--color-border)' }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium" style={{ color: strength.color }}>
                  {strength.label}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div
              className="flex items-center justify-end gap-3 pt-2"
              style={{ borderTop: '1px solid var(--color-border)', marginTop: 8 }}
            >
              <Dialog.Close asChild>
                <button type="button" className="button-secondary">Cancel</button>
              </Dialog.Close>
              <button type="submit" className="button-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div
            className="flex items-center gap-2 px-6 py-3 text-xs"
            style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            <Bell className="h-3.5 w-3.5 shrink-0" />
            The new user will receive login credentials by email.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function UserListPage() {
  const [users, setUsers] = useState<UserListItemDto[]>(mockUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.employeeCode.toLowerCase().includes(search.toLowerCase())
      const matchRole = roleFilter === 'all' || u.roles.includes(roleFilter as Role)
      return matchSearch && matchRole
    })
  }, [users, search, roleFilter])

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            User Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {users.length} accounts · {users.filter((u) => u.isActive).length} active
          </p>
        </div>
        <button
          className="button-primary flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          Create New Account
        </button>
      </div>

      {/* Filters */}
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-55">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--color-text-dim)' }}
          />
          <input
            className="form-input pl-9"
            placeholder="Search by name, email or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input w-auto"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ cursor: 'pointer', minWidth: 180 }}
        >
          <option value="all" style={{ background: 'var(--color-bg-elevated)' }}>All Roles</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Employee Code</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      No users match your filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shrink-0"
                          style={{ background: 'rgba(244,166,35,0.12)', color: 'var(--color-amber)' }}
                        >
                          {getInitials(user.username)}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {user.employeeCode}
                      </span>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {user.email}
                    </td>
                    <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {user.phone}
                    </td>
                    <td>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          background: 'rgba(102,181,250,0.1)',
                          color: 'var(--color-blue)',
                          border: '1px solid rgba(102,181,250,0.2)',
                        }}
                      >
                        {ROLE_LABELS[user.roles[0]] ?? user.roles[0]}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td>
                      <button className="icon-button" title="Edit user">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(user) => setUsers((prev) => [user, ...prev])}
      />
    </div>
  )
}
