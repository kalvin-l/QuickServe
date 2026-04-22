/**
 * Unified Customer Session Hook
 *
 * Consolidates QR validation and session management into a single source of truth.
 * Eliminates race conditions by properly sequencing validation operations.
 *
 * This replaces the dual-session approach (qr_session + SessionContext) with a unified
 * customer_session that is stored in localStorage and managed through this hook.
 *
 * Phase 4: Added pause/resume support, heartbeat tracking, and new session states
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useValidateQR } from '@/features/tables'
import { getOrCreateDeviceId, persistCart, restoreCart as restoreCartBackup, clearCartBackup } from '@/lib/utils'
import { sendHeartbeat } from '@/lib/sessionApi'

const STORAGE_KEY = 'customer_session'

/**
 * Session status types (Phase 4: Smart Session End)
 */
export type SessionStatus = 'active' | 'idle' | 'pausing' | 'paused' | 'ended' | 'abandoned'

/**
 * Resumable session info (Phase 4)
 */
export interface ResumableSession {
  session_id: number
  session_uuid: string
  table_id: number
  table_number?: number
  paused_at: string
  can_resume_until: string
  has_cart: boolean
  cart_item_count: number
  cart_total: number
  participant_id: string
}

/**
 * Resume options (Phase 4)
 */
export interface ResumeOptions {
  newTableId?: number
}

/**
 * Customer session state interface
 */
export interface CustomerSessionState {
  // Session data
  tableNumber: number | null
  tableId: number | null
  qrCode: string | null
  sessionId: string | null  // UUID string (for WebSocket connection)
  sessionDbId: number | null  // Database integer ID (for order filtering)
  location: string | null

  // Phase 4: Session status tracking
  status: SessionStatus
  gracePeriodEnd?: Date
  canResumeUntil?: Date
  isReconnecting: boolean
  resumableSessions: ResumableSession[]

  // Validation state
  isValid: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

/**
 * Customer session actions interface
 */
export interface CustomerSessionActions {
  validateQRCode: (qrCode: string) => Promise<void>
  clearSession: () => void
  redirectToWelcome: () => void
  reconnectSession: () => Promise<boolean>

  // Phase 4: Pause/Resume/Heartbeat actions
  sendHeartbeat: () => Promise<void>
  pauseSession: (reason?: string) => Promise<void>
  resumeSession: (sessionId: number, options?: ResumeOptions) => Promise<void>
  keepAlive: () => Promise<void>
  checkResumableSessions: () => Promise<void>
  transferToTable: (newTableId: number) => Promise<void>
}

/**
 * Storage session structure
 */
interface StoredCustomerSession {
  tableNumber: number | null
  tableId: number | null
  qrCode: string | null
  sessionId: string | null  // UUID string
  sessionDbId: number | null  // Database integer ID
  location: string | null
  isValid: boolean
  isInitialized: boolean
  error: string | null
  validatedAt: string

  // Phase 4: Session status
  status?: SessionStatus
  gracePeriodEnd?: string
  canResumeUntil?: string
}

/**
 * Read customer session from localStorage
 * Also migrates from old qr_session and tableSession keys for backward compatibility
 */
function readSession(): StoredCustomerSession | null {
  if (typeof window === 'undefined') return null
  try {
    // First, try the new customer_session key
    let stored = localStorage.getItem(STORAGE_KEY)

    console.log('[readSession] STORAGE_KEY:', STORAGE_KEY, 'stored:', !!stored)

    // If not found, try migrating from old session keys
    if (!stored) {
      // Priority 1: Try tableSession (from SessionContext - used by /table/{tableNumber} page)
      const tableSession = localStorage.getItem('tableSession')
      if (tableSession) {
        console.log('[readSession] Found tableSession, attempting migration')
        try {
          const session = JSON.parse(tableSession)
          // Check if session is active
          if (session.status === 'active') {
            const migratedSession: StoredCustomerSession = {
              tableNumber: session.table_number,
              tableId: session.table_id,
              qrCode: null, // tableSession doesn't have qr_code
              sessionId: session.session_id?.toString() || null,  // UUID for WebSocket
              sessionDbId: session.id || null,  // Database ID for order filtering
              location: null, // tableSession doesn't have location
              isValid: true,
              isInitialized: true,
              error: null,
              validatedAt: new Date().toISOString(),
              // Phase 4: Session status
              status: session.status || 'active',
            }
            // Store in new format
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSession))
            console.log('[readSession] Migrated from tableSession:', migratedSession)
            return migratedSession
          } else {
            console.log('[readSession] tableSession exists but status is not active:', session.status)
          }
        } catch (e) {
          console.log('[readSession] Failed to parse tableSession:', e)
        }
      }

      // Priority 2: Try qr_session (old QR-based session)
      const oldQrSession = localStorage.getItem('qr_session')
      if (oldQrSession) {
        console.log('[readSession] No customer_session found, checking qr_session:', !!oldQrSession)
        try {
          const oldSession = JSON.parse(oldQrSession)
          // Migrate to new format
          const migratedSession: StoredCustomerSession = {
            tableNumber: oldSession.tableNumber || null,
            tableId: oldSession.tableId || null,
            qrCode: oldSession.qrCode || null,
            sessionId: oldSession.sessionId || null,
            sessionDbId: oldSession.tableId || null,  // Fallback to tableId for old sessions
            location: null, // Old session didn't have location
            isValid: true,
            isInitialized: true,
            error: null,
            validatedAt: new Date().toISOString(),
            // Phase 4: Session status
            status: 'active',
          }
          // Store in new format
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSession))
          // Optionally remove old key (we'll keep it for now for safety)
          console.log('[readSession] Migrated from qr_session:', migratedSession)
          return migratedSession
        } catch {
          return null
        }
      }

      // No session found
      console.log('[readSession] No customer_session, tableSession, or qr_session found')
      return null
    }

    const session = JSON.parse(stored) as StoredCustomerSession
    console.log('[readSession] Found customer_session:', session)

    // Check if session is stale (older than 24 hours)
    const validatedAt = session.validatedAt ? new Date(session.validatedAt) : null
    const now = new Date()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (validatedAt && (now.getTime() - validatedAt.getTime()) > maxAge) {
      // Session is stale, remove it
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return session
  } catch {
    return null
  }
}

/**
 * Write customer session to localStorage
 */
function writeSession(state: StoredCustomerSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Clear customer session from localStorage
 */
function clearSessionStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  // Also clear old session keys for migration
  localStorage.removeItem('qr_session')
}

/**
 * Initial state for the session
 */
const initialState: CustomerSessionState = {
  tableNumber: null,
  tableId: null,
  qrCode: null,
  sessionId: null,
  sessionDbId: null,
  location: null,

  // Phase 4: Session status
  status: 'active',
  gracePeriodEnd: undefined,
  canResumeUntil: undefined,
  isReconnecting: false,
  resumableSessions: [],

  // Validation state
  isValid: false,
  isLoading: false,
  isInitialized: false,
  error: null,
}

/**
 * Unified Customer Session Hook
 *
 * This hook manages the customer's table session throughout their journey:
 * - QR code scanning and validation
 * - Session persistence across page navigation
 * - Auto-reconnection using device_id
 * - Loading states during validation
 * - Proper error handling
 *
 * Usage:
 * ```tsx
 * const { tableNumber, location, isValid, isLoading } = useCustomerSession()
 * ```
 */
export function useCustomerSession(): CustomerSessionState & CustomerSessionActions {
  const router = useRouter()
  const searchParams = useSearchParams()
  const validateQRMutation = useValidateQR()

  // Initialize with default state to avoid hydration mismatch
  // Server and client must have same initial state
  const [sessionState, setSessionState] = useState<CustomerSessionState>(() => {
    return { ...initialState, isLoading: true }
  })

  /**
   * Try to reconnect to existing session using device_id
   */
  const reconnectSession = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false

    const deviceId = getOrCreateDeviceId()
    if (!deviceId) return false

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      console.log('[useCustomerSession] No API URL configured, skipping reconnect')
      return false
    }

    try {
      console.log('[useCustomerSession] Attempting to reconnect with device_id:', deviceId)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(
        `${apiUrl}/sessions/participant/device/${deviceId}`,
        { signal: controller.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.log('[useCustomerSession] Reconnect failed: status', response.status)
        return false
      }

      const data = await response.json()

      if (data.participant && data.session) {
        console.log('[useCustomerSession] Found existing session:', data.session.id)

        // Restore session state
        const restoredState: CustomerSessionState = {
          tableNumber: data.session.table_number,
          tableId: data.session.table_id,
          qrCode: null, // We don't have qr_code from this endpoint
          sessionId: data.session.session_id?.toString() || null,
          sessionDbId: data.session.id || null,
          location: null,
          // Phase 4: Session status
          status: data.session.status || 'active',
          gracePeriodEnd: data.session.session_end_scheduled_at ? new Date(data.session.session_end_scheduled_at) : undefined,
          canResumeUntil: undefined, // Will be calculated based on paused_at
          isReconnecting: false,
          resumableSessions: [],
          // Validation state
          isValid: true,
          isLoading: false,
          isInitialized: true,
          error: null,
        }

        // Update localStorage
        const storedSession: StoredCustomerSession = {
          tableNumber: data.session.table_number,
          tableId: data.session.table_id,
          qrCode: null,
          sessionId: data.session.session_id?.toString() || null,
          sessionDbId: data.session.id || null,
          location: null,
          isValid: true,
          isInitialized: true,
          error: null,
          validatedAt: new Date().toISOString(),
          // Phase 4: Session status
          status: data.session.status || 'active',
          gracePeriodEnd: data.session.session_end_scheduled_at,
        }
        writeSession(storedSession)

        // Update React state
        setSessionState(restoredState)

        console.log('[useCustomerSession] Session restored successfully')
        return true
      }

      console.log('[useCustomerSession] No active session found for device')
      return false
    } catch (error: any) {
      // Silent fail - this is expected when backend is not running
      // or network is unavailable
      if (error?.name === 'AbortError') {
        console.log('[useCustomerSession] Reconnect timed out')
      } else {
        console.log('[useCustomerSession] Reconnect failed (network error)')
      }
      return false
    }
  }, [])

  // Load session from localStorage on client side only (after mount)
  // Also try to reconnect using device_id
  useEffect(() => {
    const initSession = async () => {
      // First, try to load from localStorage
      const stored = readSession()

      if (stored && stored.isValid) {
        // We have a stored session - use it immediately
        console.log('[useCustomerSession] Found stored session, using it...')

        // Set the session state from localStorage first
        setSessionState({
          tableNumber: stored.tableNumber,
          tableId: stored.tableId,
          qrCode: stored.qrCode,
          sessionId: stored.sessionId,
          sessionDbId: stored.sessionDbId,
          location: stored.location,
          // Phase 4: Session status
          status: stored.status || 'active',
          gracePeriodEnd: stored.gracePeriodEnd ? new Date(stored.gracePeriodEnd) : undefined,
          canResumeUntil: stored.canResumeUntil ? new Date(stored.canResumeUntil) : undefined,
          isReconnecting: false,
          resumableSessions: [],
          // Validation state
          isValid: true,
          isLoading: false,
          isInitialized: true,
          error: null,
        })

        // Try to verify with server in background (don't block on this)
        reconnectSession().then((reconnected) => {
          if (reconnected) {
            console.log('[useCustomerSession] Session verified with server')
          } else {
            // Server verification failed, but we still have the local session
            // This is fine for offline-first behavior
            console.log('[useCustomerSession] Server verification failed, using local session')
          }
        })

        return
      }

      // No valid stored session, try to reconnect using device_id
      const reconnected = await reconnectSession()

      if (!reconnected) {
        // No session to restore
        setSessionState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initSession()
  }, [reconnectSession])

  /**
   * Validate QR code and establish session
   * This replaces the dual useEffect approach in menu page
   */
  const validateQRCode = useCallback(async (qrCode: string) => {
    setSessionState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Step 1: Validate QR code with backend
      const result = await validateQRMutation.mutateAsync(qrCode)

      if (!result.valid || !result.table) {
        throw new Error(result.message || 'Invalid or expired QR code')
      }

      // Step 2: Create unified session state
      const newSessionState: CustomerSessionState = {
        tableNumber: result.table.table_number,
        tableId: result.table.id,
        qrCode: result.table.qr_code,
        sessionId: result.session?.session_id?.toString() || null,  // UUID for WebSocket
        sessionDbId: result.session?.id || null,  // Database ID for order filtering
        location: result.table.location,
        // Phase 4: Session status
        status: result.session?.status || 'active',
        gracePeriodEnd: undefined,
        canResumeUntil: undefined,
        isReconnecting: false,
        resumableSessions: [],
        // Validation state
        isValid: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      }

      // Step 3: Update localStorage with validatedAt timestamp
      const storedSession: StoredCustomerSession = {
        tableNumber: result.table.table_number,
        tableId: result.table.id,
        qrCode: result.table.qr_code,
        sessionId: result.session?.session_id?.toString() || null,
        sessionDbId: result.session?.id || null,
        location: result.table.location,
        isValid: true,
        isInitialized: true,
        error: null,
        validatedAt: new Date().toISOString(),
        // Phase 4: Session status
        status: result.session?.status || 'active',
      }
      writeSession(storedSession)

      // Step 4: Update React state
      setSessionState(newSessionState)

      console.log('[useCustomerSession] QR validated successfully:', {
        tableNumber: result.table.table_number,
        qrCode: result.table.qr_code,
        sessionId: result.session?.id,
      })

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to validate QR code'
      console.error('[useCustomerSession] QR validation failed:', errorMessage)

      setSessionState(prev => ({
        ...prev,
        isValid: false,
        isLoading: false,
        isInitialized: true,
        error: errorMessage,
      }))
    }
  }, [validateQRMutation])

  /**
   * Clear session
   */
  const clearSession = useCallback(() => {
    clearSessionStorage()
    shouldStopHeartbeatRef.current = false
    setSessionState({
      ...initialState,
      isInitialized: true,
    })
  }, [])

  /**
   * Redirect to join page (access code entry)
   */
  const redirectToWelcome = useCallback(() => {
    router.replace('/join')
  }, [router])

  /**
   * Auto-validate on mount if ?table parameter is present
   * This is the KEY FIX - it sequences validation properly
   */
  useEffect(() => {
    // Wait for localStorage to be loaded first
    if (sessionState.isLoading) return

    const tableParam = searchParams.get('table')

    console.log('[useCustomerSession] Initializing - tableParam:', tableParam, 'isValid:', sessionState.isValid, 'isInitialized:', sessionState.isInitialized)

    // Priority 1: If we have a valid session already loaded, mark as initialized
    if (sessionState.isValid && !sessionState.isInitialized) {
      console.log('[useCustomerSession] Session valid, marking as initialized')
      setSessionState(prev => ({ ...prev, isInitialized: true }))
      return
    }

    // Only run if not yet initialized
    if (sessionState.isInitialized) return

    // Priority 2: If we have a table parameter, validate it
    if (tableParam) {
      console.log('[useCustomerSession] Validating table parameter:', tableParam)
      validateQRCode(tableParam)
      return
    }

    // Priority 3: No session and no table parameter - mark as initialized but invalid
    console.log('[useCustomerSession] No session or table parameter found')
    setSessionState(prev => ({ ...prev, isInitialized: true }))
  }, [searchParams, sessionState.isLoading, sessionState.isValid, sessionState.isInitialized, validateQRCode])

  // ============================================================
  // Phase 4: Heartbeat Implementation
  // ============================================================

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const shouldStopHeartbeatRef = useRef<boolean>(false)

  /**
   * Send heartbeat ping to server (every 30 seconds when session is active)
   */
  const sendHeartbeatAction = useCallback(async () => {
    if (!sessionState.isValid || !sessionState.sessionDbId) return

    // Stop heartbeat if previously marked to stop
    if (shouldStopHeartbeatRef.current) return

    const deviceId = getOrCreateDeviceId()
    if (!deviceId) return

    try {
      // Dynamic import to avoid circular dependencies
      const { sendHeartbeat: sendHeartbeatApi } = await import('@/lib/sessionApi')

      const result = await sendHeartbeatApi(sessionState.sessionDbId, {
        device_id: deviceId,
        timestamp: new Date().toISOString(),
      })

      // Update session status based on heartbeat response
      if (result.session_status === 'active') {
        setSessionState(prev => ({ ...prev, status: 'active', isReconnecting: false }))
      } else if (result.session_status === 'idle') {
        setSessionState(prev => ({ ...prev, status: 'idle', isReconnecting: true }))
      }

      // Handle warnings
      if (result.warnings && result.warnings.length > 0) {
        console.warn('[useCustomerSession] Heartbeat warnings:', result.warnings)
      }
    } catch (error: any) {
      // Check if this is a "Participant not found" error
      if (
        error?.message === 'Participant not found' ||
        error?.statusCode === 404
      ) {
        // Participant not found means the session is no longer valid for this device
        // Mark to stop future heartbeats and clear the invalid session
        shouldStopHeartbeatRef.current = true
        console.log('[useCustomerSession] Participant not found, clearing invalid session')
        clearSession()
        return
      }

      console.error('[useCustomerSession] Heartbeat failed:', error)
      setSessionState(prev => ({ ...prev, status: 'idle', isReconnecting: true }))
    }
  }, [sessionState.isValid, sessionState.sessionDbId, clearSession])

  // Start heartbeat when session is valid and active
  useEffect(() => {
    if (!sessionState.isValid || sessionState.status !== 'active' || shouldStopHeartbeatRef.current) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      return
    }

    const HEARTBEAT_INTERVAL = 30000 // 30 seconds

    // Send first heartbeat immediately
    sendHeartbeatAction()

    // Then send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeatAction()
    }, HEARTBEAT_INTERVAL)

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [sessionState.isValid, sessionState.status, sendHeartbeatAction])

  /**
   * Send heartbeat (can be called manually)
   */
  const sendHeartbeat = useCallback(async () => {
    await sendHeartbeatAction()
  }, [sendHeartbeatAction])

  /**
   * Pause session (Phase 4)
   */
  const pauseSession = useCallback(async (reason: string = 'manual') => {
    if (!sessionState.sessionDbId) return

    try {
      // Dynamic import to avoid circular dependencies
      const { pauseSession: pauseSessionApi } = await import('@/lib/sessionApi')

      const result = await pauseSessionApi(sessionState.sessionDbId, {
        reason,
        preserve_cart: true,
        grace_period_minutes: 5,
      })

      // Update session state
      setSessionState(prev => ({
        ...prev,
        status: 'pausing',
        gracePeriodEnd: result.grace_period_end ? new Date(result.grace_period_end) : undefined,
        canResumeUntil: result.can_resume_until ? new Date(result.can_resume_until) : undefined,
      }))

      console.log('[useCustomerSession] Session paused:', result)
    } catch (error: any) {
      console.error('[useCustomerSession] Failed to pause session:', error)
      throw error
    }
  }, [sessionState.sessionDbId])

  /**
   * Resume paused session (Phase 4)
   */
  const resumeSession = useCallback(async (sessionId: number, options?: ResumeOptions) => {
    try {
      // Dynamic import to avoid circular dependencies
      const { resumeSession: resumeSessionApi } = await import('@/lib/sessionApi')

      const result = await resumeSessionApi(sessionId, {
        device_id: getOrCreateDeviceId(),
        new_table_id: options?.newTableId,
      })

      // Update session state
      setSessionState(prev => ({
        ...prev,
        status: 'active',
        tableId: result.session.table_id,
        tableNumber: result.session.table_number ?? null,
        sessionId: result.session.session_id ?? null,
        sessionDbId: result.session.id,
      }))

      // Restore cart if available
      if (result.cart_restored) {
        // Cart restoration would be handled by the cart context
        console.log('[useCustomerSession] Cart restored:', result.cart_items_count, 'items')
      }

      console.log('[useCustomerSession] Session resumed:', result)
    } catch (error: any) {
      console.error('[useCustomerSession] Failed to resume session:', error)
      throw error
    }
  }, [])

  /**
   * Extend grace period (Phase 4)
   */
  const keepAlive = useCallback(async () => {
    if (!sessionState.sessionDbId || sessionState.status !== 'pausing') return

    try {
      // Dynamic import to avoid circular dependencies
      const { keepSessionAlive } = await import('@/lib/sessionApi')

      const result = await keepSessionAlive(sessionState.sessionDbId)

      // Update grace period end
      setSessionState(prev => ({
        ...prev,
        gracePeriodEnd: result.extended_until ? new Date(result.extended_until) : undefined,
      }))

      console.log('[useCustomerSession] Grace period extended:', result)
    } catch (error: any) {
      console.error('[useCustomerSession] Failed to extend grace period:', error)
      throw error
    }
  }, [sessionState.sessionDbId, sessionState.status])

  /**
   * Check for resumable sessions (Phase 4)
   */
  const checkResumableSessions = useCallback(async () => {
    try {
      // Dynamic import to avoid circular dependencies
      const { getResumableSessions } = await import('@/lib/sessionApi')
      const deviceId = getOrCreateDeviceId()

      if (!deviceId) return

      const result = await getResumableSessions(deviceId)

      setSessionState(prev => ({
        ...prev,
        resumableSessions: result.sessions,
      }))

      console.log('[useCustomerSession] Found resumable sessions:', result.sessions.length)
    } catch (error: any) {
      console.error('[useCustomerSession] Failed to get resumable sessions:', error)
    }
  }, [])

  /**
   * Transfer session to a different table (Phase 4)
   */
  const transferToTable = useCallback(async (newTableId: number) => {
    if (!sessionState.sessionDbId) return

    // Resume session at new table
    await resumeSession(sessionState.sessionDbId, { newTableId })
  }, [sessionState.sessionDbId, resumeSession])

  return {
    ...sessionState,
    validateQRCode,
    clearSession,
    redirectToWelcome,
    reconnectSession,

    // Phase 4: Pause/Resume/Heartbeat actions
    sendHeartbeat,
    pauseSession,
    resumeSession,
    keepAlive,
    checkResumableSessions,
    transferToTable,
  }
}
