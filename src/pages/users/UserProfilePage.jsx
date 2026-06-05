import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Globe, KeyRound, Mail, Phone, Save, ShieldCheck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import RoleBadge from '@components/ui/RoleBadge'
import StatusBadge from '@components/ui/StatusBadge'
import UserAvatarIcon from '@components/ui/UserAvatarIcon'
import { authService } from '@services/api/authService'
import { usersService } from '@services/api/usersService'
import { useAuthStore } from '@stores/authStore'
import { clearAuthStorage } from '@/utils'

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

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function mergeUserDetails(sessionUser, fetchedUser) {
  if (!fetchedUser) return sessionUser

  return {
    ...sessionUser,
    ...fetchedUser,
    orgId: fetchedUser.orgId || sessionUser?.orgId || '',
    permissions: fetchedUser.permissions?.length
      ? fetchedUser.permissions
      : sessionUser?.permissions || [],
    roles: fetchedUser.roles?.length ? fetchedUser.roles : sessionUser?.roles || [],
  }
}

function InfoField({ label, value, mono = false }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        className={`form-input ${mono ? 'mono' : ''}`}
        value={value || '-'}
        readOnly
        tabIndex={-1}
        aria-readonly="true"
        style={{ height: 36, fontSize: 13 }}
      />
    </div>
  )
}

function PasswordInput({ label, error, show, onToggle, ...inputProps }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative', maxWidth: 460 }}>
        <input
          className={`form-input ${error ? 'error' : ''}`}
          type={show ? 'text' : 'password'}
          {...inputProps}
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={onToggle}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: 0,
            background: 'transparent',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error ? <p className="form-error">{error.message}</p> : null}
    </div>
  )
}

function ProfileDetailRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px minmax(0, 1fr)',
        gap: 10,
        alignItems: 'center',
        width: '100%',
        padding: '10px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--color-bg-elevated) 70%, transparent)',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--color-amber) 10%, transparent)',
          color: 'var(--color-amber)',
        }}
      >
        <Icon size={15} />
      </span>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="form-label" style={{ marginBottom: 0, fontSize: 9 }}>
          {label}
        </span>
        <span
          className={mono ? 'mono' : undefined}
          title={value || '-'}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--color-text-primary)',
            fontSize: 12,
          }}
        >
          {value || '-'}
        </span>
      </span>
    </div>
  )
}

export default function UserProfilePage() {
  const navigate = useNavigate()
  const sessionUser = useAuthStore((state) => state.user)
  const [profileUser, setProfileUser] = useState(sessionUser)
  const [activeTab, setActiveTab] = useState('general')
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const sessionUserId = sessionUser?.id

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch: watchPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  })

  const newPasswordValue = watchPassword('newPassword') ?? ''
  const currentUser = profileUser || sessionUser
  const displayName = currentUser?.username || currentUser?.email || 'User'
  const roles = currentUser?.roles || []
  const permissions = currentUser?.permissions || []

  useEffect(() => {
    if (!sessionUserId) {
      navigate('/login', { replace: true })
      return
    }

    let ignore = false

    async function loadProfile() {
      try {
        setIsLoadingProfile(true)
        setProfileNotice('')
        const fetchedUser = await usersService.getUser(sessionUserId)
        const mergedUser = mergeUserDetails(sessionUser, fetchedUser)

        if (!ignore) {
          setProfileUser(mergedUser)
          useAuthStore.setState({ user: mergedUser })
        }
      } catch (error) {
        if (!ignore) {
          setProfileUser(sessionUser)
          setProfileNotice(
            error?.message || 'Detailed profile is unavailable. Showing signed-in user details.'
          )
        }
      } finally {
        if (!ignore) setIsLoadingProfile(false)
      }
    }

    loadProfile()

    return () => {
      ignore = true
    }
  }, [navigate, sessionUserId, sessionUser])

  async function onPasswordSave(data) {
    try {
      await authService.changePassword({
        userId: currentUser.id,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmPassword,
      })

      resetPassword()
      setShowCurrentPw(false)
      setShowNewPw(false)
      setShowConfirmPw(false)
      clearAuthStorage()
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshTokenValue: null,
        isAuthenticated: false,
        isLoading: false,
      })
      toast.success('Password changed. Please sign in again with your new password.')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error?.message || 'Unable to change password. Please try again.')
    }
  }

  if (!currentUser) return null

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 750, color: 'var(--color-text-primary)' }}>
          My Profile
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          View your account details and update your password.
        </p>
      </div>

      {profileNotice ? (
        <div
          className="panel"
          style={{
            flexShrink: 0,
            padding: '8px 12px',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            borderRadius: 8,
          }}
        >
          {profileNotice}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 0.85fr) minmax(0, 1.15fr)',
          gap: 16,
          flex: 1,
          minHeight: 0,
          alignItems: 'stretch',
        }}
      >
        <aside
          className="panel"
          style={{
            minHeight: 0,
            height: '100%',
            padding: 0,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: '20px 18px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-amber) 12%, transparent), transparent)',
            }}
          >
            <div className="profile-avatar-static" aria-hidden="true">
              <UserAvatarIcon size={48} />
            </div>

            <h2 style={{ fontSize: 17, fontWeight: 750, color: 'var(--color-text-primary)' }}>
              {displayName}
            </h2>
            <p
              className="mono"
              style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}
            >
              {currentUser.email || '-'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              <StatusBadge
                status={
                  currentUser.isLocked
                    ? 'LOCKED'
                    : currentUser.isActive === false
                      ? 'INACTIVE'
                      : 'ACTIVE'
                }
              />
              {roles.slice(0, 2).map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </div>

          <div
            style={{
              width: '100%',
              padding: '14px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: 'left',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              overflow: 'hidden',
            }}
          >
            <ProfileDetailRow icon={Mail} label="Email" value={currentUser.email} />
            <ProfileDetailRow icon={Phone} label="Phone" value={currentUser.phone} mono />
            <ProfileDetailRow icon={Globe} label="Organization" value={currentUser.orgId} mono />
            <ProfileDetailRow
              icon={ShieldCheck}
              label="Access"
              value={`${permissions.length} permissions`}
            />
          </div>
        </aside>

        <main
          style={{
            minWidth: 0,
            minHeight: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { value: 'general', label: 'General Info', icon: User },
                { value: 'security', label: 'Security & Password', icon: KeyRound },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className="settings-inner-tab"
                  style={{
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 0,
                    borderBottom:
                      activeTab === value
                        ? '2px solid var(--color-amber)'
                        : '2px solid transparent',
                    background: 'transparent',
                    color: activeTab === value ? 'var(--color-amber)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    marginBottom: -1,
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'general' ? (
            <section
              className="panel"
              style={{
                minHeight: 0,
                flex: 1,
                padding: 18,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Account Identity
                  </h2>
                  <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {isLoadingProfile
                      ? 'Loading latest profile...'
                      : 'Account details for the signed-in user.'}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <InfoField label="User ID" value={currentUser.id} mono />
                <InfoField label="Username" value={currentUser.username} mono />
                <InfoField label="Email Address" value={currentUser.email} />
                <InfoField label="Phone Number" value={currentUser.phone} mono />
                <InfoField label="Employee Code" value={currentUser.employeeCode} mono />
                <InfoField label="Organization ID" value={currentUser.orgId} mono />
                <InfoField label="Last Login" value={formatDate(currentUser.lastLoginAt)} />
                <InfoField label="Created At" value={formatDate(currentUser.createdAt)} />
              </div>

              <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                <div>
                  <label className="form-label">Roles</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {roles.length ? (
                      roles.map((role) => <RoleBadge key={role} role={role} />)
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        No roles returned.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Permissions</label>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      maxHeight: 78,
                      overflowY: 'auto',
                      paddingRight: 4,
                    }}
                  >
                    {permissions.length ? (
                      permissions.map((permission) => (
                        <span
                          key={permission}
                          className="mono"
                          style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-muted)',
                            fontSize: 10,
                          }}
                        >
                          {permission}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        No permissions returned.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section
              className="panel"
              style={{
                minHeight: 0,
                flex: 1,
                padding: 18,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Change Account Password
              </h2>
              <p
                style={{
                  marginTop: 4,
                  marginBottom: 24,
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                }}
              >
                After changing your password, sign in again with the new password.
              </p>

              <form
                onSubmit={handlePasswordSubmit(onPasswordSave)}
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <PasswordInput
                  label="Current Password"
                  placeholder="Enter current password"
                  show={showCurrentPw}
                  onToggle={() => setShowCurrentPw((value) => !value)}
                  error={passwordErrors.currentPassword}
                  {...registerPassword('currentPassword')}
                />
                <PasswordInput
                  label="New Password"
                  placeholder="Enter new password"
                  show={showNewPw}
                  onToggle={() => setShowNewPw((value) => !value)}
                  error={passwordErrors.newPassword}
                  {...registerPassword('newPassword')}
                />
                {newPasswordValue ? (
                  <p style={{ marginTop: -10, color: 'var(--color-text-dim)', fontSize: 12 }}>
                    Password length: {newPasswordValue.length} characters
                  </p>
                ) : null}
                <PasswordInput
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  show={showConfirmPw}
                  onToggle={() => setShowConfirmPw((value) => !value)}
                  error={passwordErrors.confirmPassword}
                  {...registerPassword('confirmPassword')}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
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
                    <Save size={16} />
                    {isPasswordSubmitting ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
