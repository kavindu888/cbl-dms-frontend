import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { Bell, Eye, EyeOff, Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import RoleBadge from '@components/ui/RoleBadge'
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

const AVAILABLE_MODULES = [
  { id: 'dashboard',   label: 'Dashboard Overview', desc: 'View high-level KPIs and metrics' },
  { id: 'sales',       label: 'Sales Management',   desc: 'Create and manage sales orders and invoicing' },
  { id: 'inventory',   label: 'Inventory Control',  desc: 'View stock levels and process adjustments' },
  { id: 'purchasing',  label: 'Purchasing',         desc: 'Manage vendor POs and goods receipts' },
  { id: 'collections', label: 'Collections',        desc: 'Handle payments and credit tracking' },
  { id: 'fleet',       label: 'Fleet & Logistics',  desc: 'Monitor dispatch, vehicles, and routes' },
  { id: 'reports',     label: 'Analytics & Reports',desc: 'Generate and export system-wide reports' },
  { id: 'settings',    label: 'System Settings',    desc: 'Configure application behavior and defaults' }
]

const userFormSchema = z
  .object({
    username:        z.string().min(3, 'Username must be at least 3 characters'),
    email:           z.string().email('Valid email required'),
    employeeCode:    z.string().min(1, 'Employee code is required'),
    phone:           z.string().min(7, 'Phone number is required'),
    role:            z.nativeEnum(Role),
    password:        z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password) {
      if (data.password.length < 8) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Password must be at least 8 characters', path: ['password'] })
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] })
      }
    }
  })

type UserFormValues = z.infer<typeof userFormSchema>

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

function UserFormModal({ open, user, onClose, onSaved }: {
  open: boolean
  user: UserListItemDto | null
  onClose: () => void
  onSaved: (user: UserListItemDto) => void
}) {
  const [showPw, setShowPw] = useState(false)
  const [showConfPw, setShowConfPw] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { role: Role.SalesRepresentative },
  })

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          username: user.username,
          email: user.email,
          employeeCode: user.employeeCode,
          phone: user.phone.replace('+94', '').trim(),
          role: user.roles[0],
          password: '',
          confirmPassword: '',
        })
      } else {
        reset({
          username: '',
          email: '',
          employeeCode: '',
          phone: '',
          role: Role.SalesRepresentative,
          password: '',
          confirmPassword: '',
        })
      }
    }
  }, [open, user, reset])

  const password = watch('password') ?? ''

  const strength = passwordStrength(password)

  async function onSubmit(values: UserFormValues) {
    if (!user && !values.password) {
      setError('password', { type: 'manual', message: 'Password is required to create an account' })
      return
    }

    await new Promise((r) => setTimeout(r, 600))
    
    if (user) {
      const updatedUser: UserListItemDto = {
        ...user,
        username: values.username,
        email: values.email,
        employeeCode: values.employeeCode,
        phone: `+94 ${values.phone}`,
        roles: [values.role],
      }
      onSaved(updatedUser)
      toast.success(`User ${values.username} updated successfully.`)
    } else {
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
      onSaved(newUser)
      toast.success(`User ${values.username} created. Login credentials sent by email.`)
    }
    
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
          className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 shadow-2xl"
          style={{
            maxWidth: 580,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            maxHeight: '92vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ padding: '32px 32px 24px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <Dialog.Title style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {user ? 'Edit Account' : 'Create New Account'}
              </Dialog.Title>
              <Dialog.Description style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                {user ? 'Update user details and permissions' : 'Admin access required to create users'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Employee Code */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>EMPLOYEE CODE</label>
              <input
                className={`form-input ${errors.employeeCode ? 'error' : ''}`}
                style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                placeholder="EMP-042"
                {...register('employeeCode')}
              />
              {errors.employeeCode && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.employeeCode.message}</p>}
            </div>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>USERNAME</label>
              <input
                className={`form-input ${errors.username ? 'error' : ''}`}
                style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14 }}
                placeholder="john.perera"
                {...register('username')}
              />
              {errors.username && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.username.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>EMAIL</label>
              <input
                className={`form-input ${errors.email ? 'error' : ''}`}
                type="email"
                style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14 }}
                placeholder="john.perera@cblfoods.lk"
                {...register('email')}
              />
              {errors.email && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>PHONE</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 44, padding: '0 14px', fontSize: 14, color: 'var(--color-text-muted)',
                    background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRight: 'none',
                    borderRadius: '6px 0 0 6px',
                  }}
                >
                  +94
                </span>
                <input
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  style={{ flex: 1, height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: '0 6px 6px 0', padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}
                  placeholder="77 234 5678"
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.phone.message}</p>}
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>ROLE</label>
              <select
                className={`form-input ${errors.role ? 'error' : ''}`}
                style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14, cursor: 'pointer', appearance: 'none' }}
                {...register('role')}
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Password + Confirm */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  {user ? 'NEW PASSWORD' : 'PASSWORD'}
                  {user && <span style={{ textTransform: 'none', fontWeight: 400, marginLeft: 8, color: 'var(--color-text-dim)' }}>(Leave blank to keep unchanged)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 40px 0 16px', color: 'var(--color-text-primary)', fontSize: 14, letterSpacing: showPw ? 'normal' : '2px' }}
                    placeholder="••••••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', padding: 4 }}
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {errors.password && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.password.message}</p>}
                {/* Password strength indicator - kept functional but visually minimized to match design focus */}
                {password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          style={{ height: 4, flex: 1, borderRadius: 2, transition: 'background 200ms', background: i <= strength.level ? strength.color : 'rgba(255,255,255,0.1)' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>CONFIRM PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                    type={showConfPw ? 'text' : 'password'}
                    style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 40px 0 16px', color: 'var(--color-text-primary)', fontSize: 14, letterSpacing: showConfPw ? 'normal' : '2px' }}
                    placeholder="••••••••••••"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', padding: 4 }}
                    onClick={() => setShowConfPw((v) => !v)}
                    tabIndex={-1}
                  >
                    {showConfPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginTop: 8 }}>
              <Dialog.Close asChild>
                <button type="button" style={{ height: 40, padding: '0 24px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" disabled={isSubmitting} style={{ height: 40, padding: '0 32px', background: '#F5A623', border: 'none', borderRadius: 6, color: '#111827', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Saving...' : user ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </form>

          {/* Footer note */}
          {!user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <Bell style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                The new user will receive login credentials by email.
              </span>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── Relative time formatter ─────────────────────────────────── */
function formatLastLogin(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Yesterday, ${time}`
  if (diffDays < 7)  return `${diffDays}d ago, ${time}`
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Avatar color palette (cycles through users) ─────────────── */
const AVATAR_PALETTE = [
  { bg: 'rgba(244,166,35,0.15)',  text: '#F4A623' },  // amber
  { bg: 'rgba(102,181,250,0.15)', text: '#66B5FA' },  // blue
  { bg: 'rgba(244,63,94,0.15)',   text: '#F43F5E' },  // red
  { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA' },  // purple
  { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF' },  // teal
  { bg: 'rgba(250,204,21,0.15)',  text: '#FACC15' },  // yellow
  { bg: 'rgba(244,63,94,0.15)',   text: '#F43F5E' },  // red
  { bg: 'rgba(244,166,35,0.15)',  text: '#F4A623' },  // amber
]

function UserRow({ user, isLast, index, onEdit }: { user: UserListItemDto; isLast: boolean; index: number; onEdit: (user: UserListItemDto) => void }) {
  const avatar = AVATAR_PALETTE[index % AVATAR_PALETTE.length]
  return (
    <tr
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(27,48,80,0.5)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* USER */}
      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, background: avatar.bg, color: avatar.text,
          }}>
            {getInitials(user.username)}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {user.username}
          </span>
        </div>
      </td>

      {/* EMPLOYEE CODE */}
      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.3px' }}>
          {user.employeeCode}
        </span>
      </td>

      {/* EMAIL */}
      <td style={{ padding: '12px 10px' }}>
        <span style={{ fontSize: 12, color: user.isActive ? 'var(--color-text-muted)' : 'var(--color-text-dim)', wordBreak: 'break-all' }}>
          {user.email}
        </span>
      </td>

      {/* PHONE */}
      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.3px' }}>
          {user.phone}
        </span>
      </td>

      {/* ROLE */}
      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
        <RoleBadge role={user.roles[0]} />
      </td>

      {/* STATUS */}
      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
        <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
      </td>

      {/* LAST LOGIN */}
      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
        {user.lastLoginAt ? (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {formatLastLogin(user.lastLoginAt)}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>—</span>
        )}
      </td>

      {/* ACTIONS */}
      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
        <button
          className="icon-button"
          title="Edit user"
          style={{ width: 28, height: 28 }}
          onClick={() => onEdit(user)}
        >
          <Pencil style={{ width: 13, height: 13 }} />
        </button>
      </td>
    </tr>
  )
}

export default function UserListPage() {
  const [activeTab, setActiveTab] = useState('management')
  const [users, setUsers] = useState<UserListItemDto[]>(mockUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserListItemDto | null>(null)
  
  const [selectedPermissionUser, setSelectedPermissionUser] = useState<string>('')
  const [stagedPermissions, setStagedPermissions] = useState<string[]>([])

  useEffect(() => {
    if (selectedPermissionUser) {
      const u = users.find((x) => x.id === selectedPermissionUser)
      setStagedPermissions(u?.permissions || [])
    } else {
      setStagedPermissions([])
    }
  }, [selectedPermissionUser, users])

  const handleTogglePermission = (modId: string) => {
    setStagedPermissions((prev) =>
      prev.includes(modId) ? prev.filter((p) => p !== modId) : [...prev, modId]
    )
  }

  const handleSavePermissions = () => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedPermissionUser ? { ...u, permissions: stagedPermissions } : u
      )
    )
    toast.success('User permissions updated successfully.')
  }

  const handleCreate = () => {
    setEditingUser(null)
    setIsModalOpen(true)
  }

  const handleEdit = (user: UserListItemDto) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const handleSaved = (user: UserListItemDto) => {
    if (editingUser) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)))
    } else {
      setUsers((prev) => [user, ...prev])
    }
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
            User Management
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {users.length} accounts · {users.filter((u) => u.isActive).length} active
          </p>
        </div>
        {activeTab === 'management' && (
          <button
            className="button-primary"
            onClick={handleCreate}
            style={{ height: 40, padding: '0 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Create New Account
          </button>
        )}
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        {/* Inner underline tab bar */}
        <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28, marginTop: 8 }}>
          <Tabs.List style={{ display: 'flex', gap: 0 }} aria-label="User sections">
            {[
              ['management', 'User Management'],
              ['permission', 'User Permission'],
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
          {/* ── Filter Bar ── */}
          <div
            className="panel"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 20 }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 16, height: 16, color: 'var(--color-text-dim)', pointerEvents: 'none',
                }}
              />
              <input
                className="form-input"
                style={{ paddingLeft: 38 }}
                placeholder="Search by name, email or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="form-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ cursor: 'pointer', width: 200, flexShrink: 0 }}
            >
              <option value="all" style={{ background: 'var(--color-bg-elevated)' }}>All Roles</option>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>{l}</option>
              ))}
            </select>
          </div>

          {/* ── Data Table ── */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                    {['USER', 'EMPLOYEE CODE', 'EMAIL', 'PHONE', 'ROLE', 'STATUS', 'LAST LOGIN', 'ACTIONS'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '10px 10px',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.6px',
                          color: 'var(--color-text-muted)',
                          textAlign: col === 'ACTIONS' ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                          textTransform: 'uppercase',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                        No users match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user, idx) => (
                      <UserRow key={user.id} user={user} isLast={idx === filtered.length - 1} index={idx} onEdit={handleEdit} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="permission">
          <div className="panel" style={{ padding: '24px 32px' }}>
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Configure User Permissions</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Select a user from the combo box below to view and update their module access permissions.
              </p>
              
              <div style={{ marginTop: 24, maxWidth: 400 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  SELECT USER ACCOUNT
                </label>
                <select
                  className="form-input"
                  value={selectedPermissionUser}
                  onChange={(e) => setSelectedPermissionUser(e.target.value)}
                  style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14, cursor: 'pointer' }}
                >
                  <option value="" disabled style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-dim)' }}>
                    -- Click to select user --
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ minHeight: 200 }}>
              {selectedPermissionUser ? (
                <div style={{ marginTop: 24, animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {AVAILABLE_MODULES.map((mod) => {
                      const isChecked = stagedPermissions.includes(mod.id)
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleTogglePermission(mod.id)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 14,
                            padding: 16, cursor: 'pointer',
                            background: isChecked ? 'rgba(244,166,35,0.05)' : 'rgba(0,0,0,0.15)',
                            border: `1px solid ${isChecked ? 'rgba(244,166,35,0.3)' : 'var(--color-border)'}`,
                            borderRadius: 8, transition: 'all 0.2s',
                          }}
                        >
                          <div style={{
                            width: 20, height: 20, borderRadius: 4,
                            border: `1px solid ${isChecked ? '#F4A623' : 'var(--color-text-dim)'}`,
                            background: isChecked ? '#F4A623' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: 2, transition: 'all 0.2s'
                          }}>
                            {isChecked && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: isChecked ? '#F4A623' : 'var(--color-text-primary)', transition: 'color 0.2s' }}>
                              {mod.label}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                              {mod.desc}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="button-primary"
                      onClick={handleSavePermissions}
                      style={{ height: 40, padding: '0 24px', fontSize: 14 }}
                    >
                      Save Permissions
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--color-text-dim)', fontSize: 14 }}>
                    Please select a user above to begin.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <UserFormModal
        open={isModalOpen}
        user={editingUser}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        onSaved={handleSaved}
      />
    </div>
  )
}