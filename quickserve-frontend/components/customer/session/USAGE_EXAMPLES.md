# Session Components Usage Guide

## Phase 5: UI/UX Polish - Smart Contextual End

This document shows how to use the new session components in your QuickServe application.

## Components Overview

### 1. SessionStatusIndicator

Displays the current session status with visual indicators.

```tsx
import { SessionStatusIndicator, FloatingSessionStatus } from '@/components/customer/session'

// Compact version (in header)
<SessionStatusIndicator compact showText />

// Full version
<SessionStatusIndicator showText />

// Floating in corner
<FloatingSessionStatus />

// Custom styling
<SessionStatusIndicator className="fixed top-4 right-4" />
```

### 2. GracePeriodToast / GracePeriodBanner

Shows countdown during grace period with "Keep Active" button.

```tsx
import { GracePeriodToast, GracePeriodBanner } from '@/components/customer/session'

// Toast notification (appears when < 2 minutes remaining)
<GracePeriodToast />

// Banner version (for page header)
<GracePeriodBanner />

// With custom handler
<GracePeriodToast
  onKeepAlive={async () => {
    await customKeepAliveHandler()
  }}
/>
```

### 3. ResumeSessionModal

Appears when returning with a paused session.

```tsx
import { ResumeSessionModal, ResumeSessionModalContainer } from '@/components/customer/session'

// Automatic container (checks for resumable sessions)
<ResumeSessionModalContainer />

// Manual usage with specific session
<ResumeSessionModal
  session={resumableSession}
  onClose={() => setShowModal(false)}
  onTransfer={async (newTableId) => {
    await transferToTable(newTableId)
  }}
  onStartFresh={() => {
    clearCartAndStartNew()
  }}
/>
```

### 4. TableTransferSelector

Table selection interface for session transfer.

```tsx
import { TableTransferModal, TableTransferSelector } from '@/components/customer/session'

// Full modal version
<TableTransferModal
  availableTables={tables}
  originalTableId={currentTableId}
  onTableSelect={async (tableId) => {
    await resumeAtTable(tableId)
  }}
  onCancel={() => setShowTransfer(false)}
  isLoading={isResuming}
/>

// Selector only (for embedding in other modals)
<TableTransferSelector
  availableTables={tables}
  originalTableId={currentTableId}
  onTableSelect={(tableId) => handleTableSelect(tableId)}
  onCancel={() => setShowTransfer(false)}
/>
```

## Integration Examples

### Example 1: Add to Customer Layout

```tsx
// app/(customer)/layout.tsx
import { GracePeriodBanner, FloatingSessionStatus } from '@/components/customer/session'
import { ResumeSessionModalContainer } from '@/components/customer/session'

export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen">
      {/* Grace period banner at top */}
      <GracePeriodBanner />

      {/* Floating status indicator */}
      <FloatingSessionStatus />

      {/* Resume modal */}
      <ResumeSessionModalContainer />

      {/* Page content */}
      <main>{children}</main>
    </div>
  )
}
```

### Example 2: Menu Page Integration

```tsx
// app/(customer)/menu/page.tsx
import { SessionStatusIndicator } from '@/components/customer/session'
import { GracePeriodToast } from '@/components/customer/session'
import { useCustomerSession } from '@/features/customer-session'

export default function MenuPage() {
  const { status, pauseSession } = useCustomerSession()

  return (
    <div>
      {/* Header with status */}
      <header className="flex items-center justify-between p-4">
        <h1>Menu</h1>
        <SessionStatusIndicator compact showText />
      </header>

      {/* Grace period toast */}
      <GracePeriodToast />

      {/* Menu content */}
      <MenuItems />
    </div>
  )
}
```

### Example 3: Custom Resume Flow

```tsx
// components/ResumeFlow.tsx
import { useState } from 'react'
import { ResumeSessionModal } from '@/components/customer/session'
import { TableTransferModal } from '@/components/customer/session'
import { useCustomerSession } from '@/features/customer-session'
import { getAvailableTables } from '@/lib/sessionApi'

export function ResumeFlow() {
  const { resumeSession } = useCustomerSession()
  const [showResumeModal, setShowResumeModal] = useState(true)
  const [showTransfer, setShowTransfer] = useState(false)
  const [availableTables, setAvailableTables] = useState([])

  const handleResume = async (sessionId: number) => {
    await resumeSession(sessionId)
    setShowResumeModal(false)
  }

  const handleTransferClick = async () => {
    // Fetch available tables
    const tables = await getAvailableTables()
    setAvailableTables(tables.tables)
    setShowTransfer(true)
    setShowResumeModal(false)
  }

  const handleTransfer = async (newTableId: number) => {
    await resumeSession(sessionId, { newTableId })
    setShowTransfer(false)
  }

  return (
    <>
      {showResumeModal && resumableSession && (
        <ResumeSessionModal
          session={resumableSession}
          onClose={() => setShowResumeModal(false)}
          onTransfer={handleTransferClick}
          onStartFresh={() => {
            clearCart()
            setShowResumeModal(false)
          }}
        />
      )}

      {showTransfer && (
        <TableTransferModal
          availableTables={availableTables}
          originalTableId={resumableSession.table_id}
          onTableSelect={handleTransfer}
          onCancel={() => {
            setShowTransfer(false)
            setShowResumeModal(true)
          }}
        />
      )}
    </>
  )
}
```

## Session Status Colors

| Status | Color | Icon | Description |
|--------|-------|------|-------------|
| `active` | Emerald | CheckCircle | Connected and active |
| `idle` | Amber | Clock | No heartbeat detected |
| `pausing` | Orange/Red | AlertTriangle | Grace period in progress |
| `paused` | Blue | Clock | Session paused, recoverable |
| `ended` | Gray | WifiOff | Session ended |

## Styling Customization

All components accept `className` prop for custom styling:

```tsx
<SessionStatusIndicator className="fixed top-4 right-4 shadow-lg" />
<GracePeriodToast className="max-w-md" />
<ResumeSessionModal className="rounded-3xl" />
```

## Props Reference

### SessionStatusIndicator
- `className?: string` - Additional CSS classes
- `showText?: boolean` - Show status text label (default: true)
- `compact?: boolean` - Use compact layout (default: false)

### GracePeriodToast / Banner
- `className?: string` - Additional CSS classes
- `onKeepAlive?: () => Promise<void>` - Custom keep-alive handler

### ResumeSessionModal
- `session: ResumableSession` - Session to resume
- `onClose: () => void` - Close callback
- `onTransfer?: (newTableId: number) => void` - Transfer callback
- `onStartFresh?: () => void` - Start fresh callback

### TableTransferSelector / Modal
- `availableTables: Table[]` - Available tables
- `originalTableId: number` - Current table ID
- `onTableSelect: (tableId: number) => void` - Selection callback
- `onCancel: () => void` - Cancel callback
- `isLoading?: boolean` - Loading state
