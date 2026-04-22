'use client'

import { useState } from 'react'
import { useValidateAccessCode } from '@/features/tables'
import { useRouter } from 'next/navigation'
import { useCart } from '@/features/cart'
import { useSession } from '@/contexts/SessionContext'
import { getOrCreateDeviceId, getDeviceName } from '@/lib/utils'
import { KeyRound, X, AlertCircle, Info, Loader2 } from 'lucide-react'

interface AccessCodeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AccessCodeModal({ isOpen, onClose }: AccessCodeModalProps) {
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const validateMutation = useValidateAccessCode()
  const { setTableContext } = useCart()
  const { joinSession } = useSession()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!accessCode || accessCode.length !== 6) {
      setError('Please enter a valid 6-character access code')
      return
    }

    setLoading(true)

    try {
      const result = await validateMutation.mutateAsync(accessCode)

      if (result.valid && result.table) {
        const tableNumber = result.table.table_number
        const accessCodeUpper = accessCode.toUpperCase()

        setTableContext(accessCodeUpper, tableNumber)

        const deviceId = getOrCreateDeviceId()
        const deviceName = getDeviceName()

        await joinSession(accessCodeUpper, deviceId, deviceName, 1)

        const savedSession = localStorage.getItem('tableSession')

        if (!savedSession) {
          setError('Session creation failed. Please try again.')
          setLoading(false)
          return
        }

        onClose()
        router.push(`/table/${tableNumber}`)
      } else {
        setError('Invalid access code. Please try again.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to validate access code:', err)
      setError('Failed to validate access code. Please try again.')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 6)
    setAccessCode(value)
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2a26]/30 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#8b8680] hover:text-[#2d2a26] hover:bg-[#f5f0eb] rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#f5f0eb] flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-[#d4a574]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#2d2a26]">Enter Access Code</h2>
            <p className="text-sm text-[#8b8680] mt-1">
              Enter the 6-character code from your table
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accessCode" className="block text-xs font-medium text-[#8b8680] uppercase tracking-wide mb-2">
              Access Code
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={handleChange}
              placeholder="ABC123"
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest uppercase bg-[#faf9f7] border border-[#e8e4df] rounded-xl focus:border-[#d4a574] focus:outline-none transition-all"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-[#8b8680] mt-2 text-center">
              The code is displayed on your table card
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-[#e8e4df] text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || validateMutation.isPending || accessCode.length !== 6}
              className="flex-1 px-4 py-3 rounded-xl bg-[#2d2a26] text-white hover:bg-[#3d3a36] transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || validateMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </span>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="bg-[#f5f0eb] border border-[#e8e4df] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#d4a574] mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-[#2d2a26]">Can't find the code?</p>
              <p className="text-[#8b8680] mt-1">
                Ask your server for assistance, or scan the QR code on your table.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
