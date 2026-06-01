import { cn } from '@utils/cn'
import { Role } from '@/types/auth.types'
const ROLE_LABELS = {
  [Role.Admin]: 'Admin',
  [Role.PurchasingManager]: 'Purchasing Manager',
  [Role.InventoryController]: 'Inventory Controller',
  [Role.SalesRepresentative]: 'Sales Representative',
  [Role.CollectionsOfficer]: 'Collections Officer',
  [Role.FleetCoordinator]: 'Fleet Coordinator',
  [Role.Analyst]: 'Analyst',
  [Role.UserAdministrator]: 'User Administrator',
}
export default function RoleBadge({ role, className }) {
  const label = ROLE_LABELS[role] ?? role
  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        background: 'rgba(102,181,250,0.10)',
        color: 'var(--color-blue)',
        border: '1px solid rgba(102,181,250,0.25)',
        borderRadius: 6,
      }}
    >
      {label}
    </span>
  )
}
