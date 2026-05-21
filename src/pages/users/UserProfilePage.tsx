import { zodResolver } from '@hookform/resolvers/zod'
import { Building, Eye, EyeOff, Globe, KeyRound, Mail, Phone, Save, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import StatusBadge from '@components/ui/StatusBadge'
import { useAuthStore } from '@stores/authStore'
import { Role } from '@/types/auth.types'

const ROLE_LABELS: Record<Role, string> = {
  [Role.Admin]: 'Admin',
  [Role.PurchasingManager]: 'Purchasing Manager',
  [Role.InventoryController]: 'Inventory Controller',
  [Role.SalesRepresentative]: 'Sales Representative',
  [Role.CollectionsOfficer]: 'Collections Officer',
  [Role.FleetCoordinator]: 'Fleet Coordinator',
  [Role.Analyst]: 'Analyst',
  [Role.UserAdministrator]: 'User Administrator',
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function UserProfilePage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const currentUser = user ?? {
    id: 'usr-001',
    username: 'admin',
    email: 'admin@cblfoods.lk',
    employeeCode: 'CBL-ADM-001',
    phone: '+94 77 000 0000',
    roles: [Role.Admin],
    permissions: ['*'],
    orgId: 'cbl-lk',
  }

  const fullName = 'Anura Perera'
  const department = 'Distribution Operations'
  const userInitials = getInitials(fullName)
  const roleLabel = ROLE_LABELS[currentUser.roles[0]] ?? currentUser.roles[0]

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch: watchPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  })

  const newPasswordVal = watchPassword('newPassword') ?? ''

  const onPasswordSave = async (_data: PasswordFormValues) => {
    await new Promise((resolve) => window.setTimeout(resolve, 800))
    toast.success('Your password has been changed successfully.')
    resetPassword()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: '8px 8px 24px',
      }}
    >
      <div style={{ paddingInline: 4, paddingTop: 2, paddingBottom: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 3vw, 2.75rem)',
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: 'var(--color-text-primary)',
            }}
          >
            My Profile
          </h1>
          <p
            style={{
              maxWidth: 720,
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--color-text-muted)',
            }}
          >
            Manage your personal credentials, workspace security, and preferences.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 332px) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            height: '100%',
          }}
        >
          <div
            className="panel"
            style={{
              padding: '28px 24px 30px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              height: '100%',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-20%',
                left: '-20%',
                width: 140,
                height: 140,
                background: 'radial-gradient(circle, rgba(244,166,35,0.08), transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'rgba(244,166,35,0.12)',
                border: '2px solid rgba(244,166,35,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                fontWeight: 700,
                color: 'var(--color-amber)',
                marginBottom: 18,
                boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
              }}
            >
              {userInitials}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {fullName}
            </h3>
            <p
              className="mono"
              style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}
            >
              @{currentUser.username}
            </p>

            <div
              style={{
                marginTop: 14,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <span
                className="text-chip"
                style={{
                  background: 'rgba(102,181,250,0.12)',
                  color: 'var(--color-blue)',
                  border: '1px solid rgba(102,181,250,0.25)',
                  padding: '2px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {roleLabel}
              </span>
              <StatusBadge status="ACTIVE" />
            </div>

            <div
              style={{
                width: '100%',
                borderTop: '1px solid var(--color-border)',
                marginTop: 24,
                paddingTop: 22,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                textAlign: 'left',
                marginTop: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }} />
                <span
                  style={{ fontSize: 13, color: 'var(--color-text-muted)', wordBreak: 'break-all' }}
                >
                  {currentUser.email}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }} />
                <span className="mono" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {currentUser.phone}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }} />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{department}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }} />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Org ID:{' '}
                  <span className="mono" style={{ color: 'var(--color-amber)' }}>
                    {currentUser.orgId}
                  </span>
                </span>
              </div>
            </div>

            <div
              className="mono"
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.15)',
                borderRadius: 6,
                padding: '10px 12px',
                marginTop: 'auto',
                fontSize: 11,
                color: 'var(--color-text-dim)',
                display: 'flex',
                justifyContent: 'space-between',
                letterSpacing: '0.04em',
              }}
            >
              <span>EMP CODE:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {currentUser.employeeCode}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 0, paddingBottom: 0, alignItems: 'flex-end' }}>
              {[
                ['general', 'General Info', User],
                ['security', 'Security & Password', KeyRound],
              ].map(([value, label, Icon]) => (
                <button
                  key={value as string}
                  type="button"
                  onClick={() => setActiveTab(value as 'general' | 'security')}
                  className="settings-inner-tab"
                  style={{
                    padding: '12px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    borderBottom:
                      activeTab === value
                        ? '2px solid var(--color-amber)'
                        : '2px solid transparent',
                    color: activeTab === value ? 'var(--color-amber)' : 'var(--color-text-muted)',
                    transition: 'color 150ms, border-color 150ms',
                    whiteSpace: 'nowrap',
                    marginBottom: -1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon style={{ width: 15, height: 15 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'general' ? (
            <div className="panel" style={{ padding: '28px 30px 30px', flex: 1, minHeight: 620 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 6,
                }}
              >
                Account Identity &amp; Contact
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                Keep your details updated to ensure colleagues can reach you and notifications are
                delivered correctly.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 22,
                  }}
                >
                  <div>
                    <label className="form-label">FULL NAME</label>
                    <input
                      className="form-input"
                      value={fullName}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <label className="form-label">USERNAME</label>
                    <input
                      className="form-input mono"
                      value={currentUser.username}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <label className="form-label">EMAIL ADDRESS</label>
                    <input
                      className="form-input"
                      value={currentUser.email}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <label className="form-label">PHONE NUMBER</label>
                    <input
                      className="form-input mono"
                      value={currentUser.phone}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <label className="form-label">DEPARTMENT / DIVISION</label>
                    <input
                      className="form-input"
                      value={department}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <label className="form-label">EMPLOYEE CODE (READ-ONLY)</label>
                    <input className="form-input mono" value={currentUser.employeeCode} disabled />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ padding: '28px 30px 30px', flex: 1, minHeight: 620 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 6,
                }}
              >
                Change Account Password
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                Ensure you use a strong, unique password to prevent unauthorized logins to your
                distribution terminal.
              </p>

              <form
                onSubmit={handlePasswordSubmit(onPasswordSave)}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div>
                  <label className="form-label">CURRENT PASSWORD</label>
                  <div style={{ position: 'relative', maxWidth: 440 }}>
                    <input
                      className={`form-input ${passwordErrors.currentPassword ? 'error' : ''}`}
                      type={showCurrentPw ? 'text' : 'password'}
                      placeholder="Enter current password"
                      {...registerPassword('currentPassword')}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-dim)',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      onClick={() => setShowCurrentPw((v) => !v)}
                      tabIndex={-1}
                    >
                      {showCurrentPw ? (
                        <EyeOff style={{ width: 15, height: 15 }} />
                      ) : (
                        <Eye style={{ width: 15, height: 15 }} />
                      )}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="form-error">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">NEW PASSWORD</label>
                  <div style={{ position: 'relative', maxWidth: 440 }}>
                    <input
                      className={`form-input ${passwordErrors.newPassword ? 'error' : ''}`}
                      type={showNewPw ? 'text' : 'password'}
                      placeholder="Enter new password"
                      {...registerPassword('newPassword')}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-dim)',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      onClick={() => setShowNewPw((v) => !v)}
                      tabIndex={-1}
                    >
                      {showNewPw ? (
                        <EyeOff style={{ width: 15, height: 15 }} />
                      ) : (
                        <Eye style={{ width: 15, height: 15 }} />
                      )}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="form-error">{passwordErrors.newPassword.message}</p>
                  )}
                  {newPasswordVal ? (
                    <p className="mt-2 text-xs text-[var(--color-text-dim)]">
                      Password length: {newPasswordVal.length} characters
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="form-label">CONFIRM NEW PASSWORD</label>
                  <div style={{ position: 'relative', maxWidth: 440 }}>
                    <input
                      className={`form-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
                      type={showConfirmPw ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      {...registerPassword('confirmPassword')}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-dim)',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                      onClick={() => setShowConfirmPw((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirmPw ? (
                        <EyeOff style={{ width: 15, height: 15 }} />
                      ) : (
                        <Eye style={{ width: 15, height: 15 }} />
                      )}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="form-error">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 12,
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 20,
                  }}
                >
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={isPasswordSubmitting}
                    style={{ height: 40, padding: '0 24px' }}
                  >
                    <Save style={{ width: 16, height: 16 }} />
                    {isPasswordSubmitting ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
