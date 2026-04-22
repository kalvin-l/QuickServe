import { LucideIcon } from 'lucide-react'
import { List, Flame, User, Users } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  icon: LucideIcon
}

/**
 * Tab definitions for Orders page
 */
export const tabs: Tab[] = [
  { id: 'all', label: 'All Orders', icon: List },
  { id: 'kitchen', label: 'Kitchen', icon: Flame },
  { id: 'individual', label: 'Individual', icon: User },
  { id: 'group', label: 'One Bill', icon: Users }
]
