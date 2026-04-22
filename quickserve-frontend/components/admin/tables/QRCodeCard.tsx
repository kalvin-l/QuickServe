'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer, RefreshCw, Copy, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Table } from '@/features/tables'
import { useTableQR } from '@/features/tables/hooks/useTableQR'
import { useQRCode } from '@/features/qr/hooks/useQRCode'
import { formatDateTime } from '@/lib/utils'

interface QRCodeCardProps {
  table: Table
  onRegenerate?: () => void
  showAnalytics?: boolean
}

/**
 * QRCodeCard Component
 *
 * Displays QR code information and provides actions for downloading,
 * regenerating, and managing QR codes for a table.
 */
export default function QRCodeCard({ table, onRegenerate, showAnalytics = false }: QRCodeCardProps) {
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [copied, setCopied] = useState(false)

  // Use the custom hook for table QR operations
  const { actions, qrImageUrl } = useTableQR(table)

  // Use QR utilities
  const { copyToClipboard, getSizeDescription } = useQRCode()

  /**
   * Handle QR code regeneration
   */
  const handleRegenerate = async () => {
    try {
      await actions.regenerateQR()
      onRegenerate?.()
    } catch (error) {
      console.error('Failed to regenerate QR code:', error)
      // Could show a toast notification here
    }
  }

  /**
   * Handle QR code download
   */
  const handleDownloadQR = async () => {
    try {
      await actions.downloadQR({ size: selectedSize, format: 'png' })
    } catch (error) {
      console.error('Failed to download QR code:', error)
      // Could show a toast notification here
    }
  }

  /**
   * Handle print template download
   */
  const handleDownloadPrint = async () => {
    try {
      await actions.downloadPrintTemplate()
    } catch (error) {
      console.error('Failed to download print template:', error)
      // Could show a toast notification here
    }
  }

  /**
   * Handle copying QR code to clipboard
   */
  const handleCopyQR = async () => {
    const success = await copyToClipboard(table.qr_code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isExpired = table.qr_expires_at && new Date(table.qr_expires_at) < new Date()

  return (
    <div className="relative bg-white rounded-xl border border-[#e8e4df]/60 shadow-sm">
      {/* Offset shadow */}
      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
              <span className="font-bold text-[#d4a574]">#{table.table_number}</span>
            </div>
            <div>
              <h3 className="font-semibold text-[#2d2a26] text-sm">QR Code</h3>
              <p className="text-xs text-[#8b8680]">{table.location}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isExpired
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : 'bg-green-500'}`} />
            {isExpired ? 'Expired' : 'Active'}
          </span>
        </div>

        {/* QR Code Preview */}
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl border-2 border-[#e8e4df]/60">
            <img
              src={qrImageUrl}
              alt={`QR Code for Table ${table.table_number}`}
              className="w-40 h-40"
              onError={(e) => {
                // Fallback to showing the public QR code if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLDivElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden w-40 h-40 items-center justify-center">
              <QRCodeSVG
                value={table.qr_code}
                size={160}
                level="M"
                fgColor="#d4a574"
                bgColor="#FFFFFF"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-center text-[#8b8680]">
          Live preview with secure token • Download for high-resolution print version
        </p>

        {/* Table Info */}
        <div className="bg-[#faf9f7] rounded-xl p-3 space-y-2 border border-[#e8e4df]/60">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#8b8680] uppercase tracking-wider">QR Code</span>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-[#2d2a26]">{table.qr_code}</code>
              <button
                onClick={handleCopyQR}
                className="p-1 rounded-lg hover:bg-white text-[#8b8680] hover:text-[#d4a574] transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#8b8680] uppercase tracking-wider">Access Code</span>
            <code className="text-sm font-mono text-[#d4a574] font-semibold">{table.access_code}</code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#8b8680] uppercase tracking-wider">Capacity</span>
            <span className="text-sm text-[#2d2a26]">{table.capacity} seats</span>
          </div>
          {showAnalytics && (
            <>
              <div className="flex justify-between items-center pt-2 border-t border-[#e8e4df]/40">
                <span className="text-xs text-[#8b8680] uppercase tracking-wider">Total Scans</span>
                <span className="text-sm font-medium text-[#2d2a26]">{table.qr_scan_count || 0}</span>
              </div>
              {table.qr_last_scanned && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#8b8680] uppercase tracking-wider">Last Scanned</span>
                  <span className="text-xs text-[#2d2a26]">
                    {formatDateTime(table.qr_last_scanned)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Download Options */}
        <div className="space-y-3">
          {/* Size Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#2d2a26] uppercase tracking-wider mb-2">
              Image Size
            </label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedSize === size
                      ? 'bg-[#d4a574] text-white'
                      : 'bg-[#faf9f7] border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb]'
                  }`}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#8b8680] mt-1.5">
              {getSizeDescription(selectedSize)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadQR}
              disabled={actions.isDownloading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2d2a26] text-white font-medium hover:bg-[#3d3a36] transition-all disabled:opacity-50 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            <button
              onClick={handleDownloadPrint}
              disabled={actions.isDownloading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 text-[#5c5752] font-medium hover:bg-[#f5f0eb] transition-all disabled:opacity-50 text-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={actions.isRegenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[#d4a574] font-medium hover:bg-[#faf9f7] transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${actions.isRegenerating ? 'animate-spin' : ''}`} />
            <span>{actions.isRegenerating ? 'Regenerating...' : 'Regenerate QR Code'}</span>
          </button>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">Regenerating QR Codes:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>New QR token and access code will be generated</li>
                <li>Old QR codes will stop working immediately</li>
                <li>Customers must scan the NEW QR code</li>
                <li>Download the updated QR code after regeneration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
