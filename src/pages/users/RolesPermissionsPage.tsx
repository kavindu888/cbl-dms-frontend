import { useState, useEffect, useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Dialog from '@radix-ui/react-dialog'
import { Shield, Plus, Pencil, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Role } from '@/types/auth.types'

/* ── Mock Data & Constants ───────────────────────────────────────── */

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

const initialRolesData = [
  { id: 'role_01', name: 'Admin', description: 'Full system access', isSystemRole: true, permissionCount: 45 },
  { id: 'role_02', name: 'Sales Representative', description: 'Field sales operations', isSystemRole: true, permissionCount: 18 },
  { id: 'role_03', name: 'Purchasing Manager', description: 'Manage vendor POs and receipts', isSystemRole: false, permissionCount: 22 },
  { id: 'role_04', name: 'Inventory Controller', description: 'Manage and adjust stock levels', isSystemRole: true, permissionCount: 25 },
]

/* ── Form Modal ─────────────────────────────────────────────────── */

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().min(1, 'Description is required'),
  isSystemRole: z.boolean().default(false),
})

type RoleFormValues = z.infer<typeof roleSchema>

function RoleFormModal({
  open,
  role,
  onClose,
  onSaved,
}: {
  open: boolean
  role?: any
  onClose: () => void
  onSaved: (role: any) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      isSystemRole: false,
    },
  })

  useEffect(() => {
    if (open) {
      if (role) {
        reset({
          name: role.name,
          description: role.description,
          isSystemRole: role.isSystemRole,
        })
      } else {
        reset({
          name: '',
          description: '',
          isSystemRole: false,
        })
      }
    }
  }, [open, role, reset])

  async function onSubmit(values: RoleFormValues) {
    await new Promise((r) => setTimeout(r, 400)) // Fake delay
    
    if (role) {
      const updatedRole = {
        ...role,
        name: values.name,
        description: values.description,
        isSystemRole: values.isSystemRole,
      }
      onSaved(updatedRole)
      toast.success(`Role ${updatedRole.name} updated successfully.`)
    } else {
      const newRole = {
        id: `role_${Date.now()}`,
        name: values.name,
        description: values.description,
        isSystemRole: values.isSystemRole,
        permissionCount: 0,
      }
      onSaved(newRole)
      toast.success(`Role ${newRole.name} created successfully.`)
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
            maxWidth: 500,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
          }}
        >
          <div style={{ padding: '32px 32px 24px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <Dialog.Title style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {role ? 'Edit Role' : 'Create New Role'}
              </Dialog.Title>
              <Dialog.Description style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                {role ? 'Update role properties and description.' : 'Define a new role and its operational properties.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>ROLE NAME</label>
              <input
                className={`form-input ${errors.name ? 'error' : ''}`}
                style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14 }}
                placeholder="E.g. Branch Manager"
                {...register('name')}
              />
              {errors.name && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.name.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>DESCRIPTION</label>
              <textarea
                className={`form-input ${errors.description ? 'error' : ''}`}
                style={{ width: '100%', minHeight: 80, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '12px 16px', color: 'var(--color-text-primary)', fontSize: 14, resize: 'vertical' }}
                placeholder="Briefly describe the purpose of this role..."
                {...register('description')}
              />
              {errors.description && <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>{errors.description.message}</p>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                id="isSystemRole"
                {...register('isSystemRole')}
                style={{ width: 16, height: 16, accentColor: '#F4A623', cursor: 'pointer' }}
              />
              <div>
                <label htmlFor="isSystemRole" style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  System Role
                </label>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  System roles are protected and cannot be deleted.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={onClose}
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                {role ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── Page Component ─────────────────────────────────────────────── */

export default function RolesPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<Role | ''>('')
  const [activeTab, setActiveTab] = useState('management')
  
  // Roles list state
  const [rolesList, setRolesList] = useState(initialRolesData)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)

  // Permissions Mock state
  const [roleMatrix, setRoleMatrix] = useState<Record<string, string[]>>({
    [Role.Admin]: ['dashboard', 'sales', 'inventory', 'purchasing', 'collections', 'fleet', 'reports', 'settings'],
    [Role.SalesRepresentative]: ['dashboard', 'sales', 'reports'],
  })
  const [stagedPermissions, setStagedPermissions] = useState<string[]>([])

  useEffect(() => {
    if (selectedRole) {
      setStagedPermissions(roleMatrix[selectedRole] || [])
    } else {
      setStagedPermissions([])
    }
  }, [selectedRole, roleMatrix])

  const handleTogglePermission = (modId: string) => {
    setStagedPermissions((prev) =>
      prev.includes(modId) ? prev.filter((p) => p !== modId) : [...prev, modId]
    )
  }

  const handleSavePermissions = () => {
    if (!selectedRole) return
    setRoleMatrix((prev) => ({
      ...prev,
      [selectedRole]: stagedPermissions,
    }))
    toast.success(`${ROLE_LABELS[selectedRole]} role permissions updated.`)
  }

  // List Management functions
  const filteredRoles = useMemo(() => {
    return rolesList.filter(
      (r) =>
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    )
  }, [search, rolesList])

  const handleRoleSaved = (savedRole: any) => {
    const isExisting = rolesList.some((r) => r.id === savedRole.id)
    if (isExisting) {
      setRolesList(rolesList.map((r) => (r.id === savedRole.id ? savedRole : r)))
    } else {
      setRolesList([...rolesList, savedRole])
    }
  }

  const openNewRoleModal = () => {
    setEditingRole(null)
    setIsModalOpen(true)
  }

  const openEditRoleModal = (role: any) => {
    setEditingRole(role)
    setIsModalOpen(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
            Roles & Permissions
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Configure default module access matrices and system roles.
          </p>
        </div>
        {activeTab === 'management' && (
          <button
            className="button-primary"
            onClick={openNewRoleModal}
            style={{ height: 40, padding: '0 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            New Role
          </button>
        )}
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28, marginTop: 8 }}>
          <Tabs.List style={{ display: 'flex', gap: 0 }} aria-label="Role sections">
            {[
              ['management', 'Role Management'],
              ['permission', 'Role Permission Defaults'],
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

        {/* ── Role Management Tab ── */}
        <Tabs.Content value="management">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter Bar */}
            <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-dim)' }}
                />
                <input
                  className="form-input"
                  placeholder="Search roles or descriptions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', height: 40, paddingLeft: 36, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14 }}
                />
              </div>
            </div>

            {/* Table */}
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Role Name</th>
                      <th>Description</th>
                      <th>Permissions</th>
                      <th>System Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map((r) => (
                      <tr key={r.id}>
                        <td className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {r.name}
                        </td>
                        <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {r.description}
                        </td>
                        <td>
                          <span
                            className="text-xs font-mono"
                            style={{
                              padding: '2px 8px',
                              background: 'rgba(102,181,250,0.10)',
                              color: 'var(--color-blue)',
                              border: '1px solid rgba(102,181,250,0.25)',
                              borderRadius: 12,
                            }}
                          >
                            {r.permissionCount} rules
                          </span>
                        </td>
                        <td>
                          {r.isSystemRole ? (
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '2px 8px', fontSize: 11, fontWeight: 600,
                                borderRadius: 12,
                                background: 'rgba(32,212,191,0.12)',
                                color: 'var(--color-teal)',
                                border: '1px solid rgba(32,212,191,0.30)',
                                letterSpacing: '0.4px',
                              }}
                            >
                              SYSTEM
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '2px 8px', fontSize: 11, fontWeight: 600,
                                borderRadius: 12,
                                background: 'rgba(148,163,184,0.10)',
                                color: 'var(--color-text-muted)',
                                border: '1px solid rgba(148,163,184,0.20)',
                                letterSpacing: '0.4px',
                              }}
                            >
                              CUSTOM
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button
                            className="icon-button"
                            title="Edit role"
                            style={{ width: 28, height: 28 }}
                            onClick={() => openEditRoleModal(r)}
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {filteredRoles.length > 0 && (
              <p className="text-xs text-right" style={{ color: 'var(--color-text-dim)' }}>
                Showing {filteredRoles.length} of {rolesList.length} roles
              </p>
            )}
          </div>
        </Tabs.Content>

        {/* ── Permissions Defaults Tab ── */}
        <Tabs.Content value="permission">
          <div className="panel" style={{ padding: '24px 32px' }}>
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield style={{ width: 18, height: 18, color: 'var(--color-amber)' }} />
                Configure Role Defaults
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Select a role from the combo box below to view and update its default module access permissions.
              </p>
              
              <div style={{ marginTop: 24, maxWidth: 400 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  SELECT ROLE
                </label>
                <select
                  className="form-input"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0 16px', color: 'var(--color-text-primary)', fontSize: 14, cursor: 'pointer' }}
                >
                  <option value="" disabled style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-dim)' }}>
                    -- Click to select role --
                  </option>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ minHeight: 200 }}>
              {selectedRole ? (
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
                      Save Role Permissions
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--color-text-dim)', fontSize: 14 }}>
                    Please select a role above to begin configuring its default permissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <RoleFormModal
        open={isModalOpen}
        role={editingRole}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleRoleSaved}
      />
    </div>
  )
}
