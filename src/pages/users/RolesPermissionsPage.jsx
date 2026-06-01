import * as Tabs from '@radix-ui/react-tabs'
import { Pencil, Plus, Search, Shield } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import RoleBadge from '@components/ui/RoleBadge'
import StatusBadge from '@components/ui/StatusBadge'
import { usersService } from '@services/api/usersService'

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function permissionLabel(permission) {
  return `${permission.resource} ${permission.action}`.trim()
}

export default function RolesPermissionsPage() {
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [activeTab, setActiveTab] = useState('management')
  const [rolesList, setRolesList] = useState([])
  const [permissionGroups, setPermissionGroups] = useState([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRolesAndPermissions() {
      setIsLoading(true)
      setError('')

      try {
        const [roles, permissions] = await Promise.all([
          usersService.listRoles(),
          usersService.listPermissions(),
        ])

        setRolesList(roles)
        setPermissionGroups(permissions)
        setSelectedRoleId(roles[0]?.id || '')
      } catch (loadError) {
        const message = getErrorMessage(loadError, 'Unable to load roles and permissions.')
        setError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadRolesAndPermissions()
  }, [])

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rolesList.filter((role) => {
      if (!query) return true

      return (
        role.name.toLowerCase().includes(query) || role.description.toLowerCase().includes(query)
      )
    })
  }, [rolesList, search])

  const selectedRole = rolesList.find((role) => role.id === selectedRoleId)
  const permissionCount = permissionGroups.reduce(
    (total, group) => total + group.permissions.length,
    0
  )

  function showUnsupportedMessage() {
    toast('This backend does not expose a role create/update API yet.')
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
            Roles & Permissions
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Configure default module access matrices and system roles.
          </p>
        </div>

        {activeTab === 'management' ? (
          <button
            type="button"
            className="button-primary"
            onClick={showUnsupportedMessage}
            style={{
              height: 40,
              padding: '0 24px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            New Role
          </button>
        ) : null}
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <div
          style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28, marginTop: 8 }}
        >
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

        <Tabs.Content value="management">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              className="panel"
              style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}
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
                  placeholder="Search roles or descriptions..."
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
            </div>

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
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-sm text-[var(--color-text-muted)]"
                        >
                          Loading roles...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-sm text-[var(--color-danger)]"
                        >
                          {error}
                        </td>
                      </tr>
                    ) : filteredRoles.length ? (
                      filteredRoles.map((role) => (
                        <tr key={role.id}>
                          <td className="text-sm font-semibold">
                            <RoleBadge role={role.name} />
                          </td>
                          <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            {role.description || '-'}
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
                              {role.permissionCount} rules
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={role.isSystemRole ? 'SYSTEM' : 'CUSTOM'} />
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="icon-button"
                              title="Edit role"
                              style={{ width: 28, height: 28 }}
                              onClick={showUnsupportedMessage}
                            >
                              <Pencil style={{ width: 13, height: 13 }} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-sm text-[var(--color-text-muted)]"
                        >
                          No roles found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredRoles.length > 0 ? (
              <p className="text-xs text-right" style={{ color: 'var(--color-text-dim)' }}>
                Showing {filteredRoles.length} of {rolesList.length} roles
              </p>
            ) : null}
          </div>
        </Tabs.Content>

        <Tabs.Content value="permission">
          <div className="panel" style={{ padding: '24px 32px' }}>
            <div
              style={{
                marginBottom: 24,
                paddingBottom: 24,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Shield style={{ width: 18, height: 18, color: 'var(--color-amber)' }} />
                Configure Role Defaults
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Select a role from the combo box below to view the backend permission catalog.
              </p>

              <div style={{ marginTop: 24, maxWidth: 400 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.8px',
                    color: 'var(--color-text-muted)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  SELECT ROLE
                </label>
                <select
                  className="form-input"
                  value={selectedRoleId}
                  onChange={(event) => setSelectedRoleId(event.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '0 16px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- Click to select role --</option>
                  {rolesList.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ minHeight: 200 }}>
              {isLoading ? (
                <div
                  style={{
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <p style={{ color: 'var(--color-text-dim)', fontSize: 14 }}>
                    Loading permissions...
                  </p>
                </div>
              ) : selectedRole ? (
                <div style={{ marginTop: 24, animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ marginBottom: 16 }}>
                    <RoleBadge role={selectedRole.name} />
                    <span
                      style={{
                        marginLeft: 10,
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {permissionCount} backend permissions available
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {permissionGroups.map((group) => (
                      <div
                        key={group.module}
                        style={{
                          padding: 16,
                          background: 'rgba(0,0,0,0.15)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {group.module}
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                            marginTop: 4,
                            marginBottom: 12,
                          }}
                        >
                          {group.permissions.length} permissions from backend
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {group.permissions.slice(0, 5).map((permission) => (
                            <div
                              key={permission.id}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                            >
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 4,
                                  border: '1px solid #F4A623',
                                  background: 'rgba(244,166,35,0.10)',
                                  flexShrink: 0,
                                  marginTop: 1,
                                }}
                              />
                              <div>
                                <p
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)',
                                  }}
                                >
                                  {permissionLabel(permission)}
                                </p>
                                <p
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--color-text-muted)',
                                    marginTop: 2,
                                  }}
                                >
                                  {permission.key}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={showUnsupportedMessage}
                      style={{ height: 40, padding: '0 24px', fontSize: 14 }}
                    >
                      Save Role Permissions
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <p style={{ color: 'var(--color-text-dim)', fontSize: 14 }}>
                    Please select a role above to begin configuring its default permissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
