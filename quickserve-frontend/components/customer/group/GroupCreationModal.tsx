/**
 * Group Creation Modal
 *
 * Mobile-first, fully responsive design
 * Warm, human-centered with offset shadows
 */

'use client';

import React, { useState, useCallback } from 'react';
import Modal from '@/components/ui/modal/Modal';
import { useGroupStore } from '@/features/groups/store/groupStore';
import type { PaymentType } from '@/lib/groupApi';
import { 
  Check, ArrowLeft, Loader2, Sparkles, User, 
  Copy, CheckCircle2, Crown, Users, Wallet
} from 'lucide-react';

interface GroupCreationModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
  sessionId: string;
  tableId: number;
  participantId?: number | null;
}

const STEPS = {
  SELECT_MODE: 'select-mode',
  ENTER_NAME: 'enter-name',
  CREATING: 'creating',
  SUCCESS: 'success',
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

const PAYMENT_OPTIONS: Array<{
  type: PaymentType;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'host_pays_all',
    title: 'I will pay for everyone',
    desc: 'All orders on one bill',
    icon: <Crown className="w-5 h-5" />,
  },
  {
    type: 'individual',
    title: 'Everyone pays separately',
    desc: 'Each person pays their own',
    icon: <Users className="w-5 h-5" />,
  },
  {
    type: 'hybrid',
    title: 'Mixed payment',
    desc: 'Flexible payment options',
    icon: <Wallet className="w-5 h-5" />,
  },
];

export default function GroupCreationModal({
  show,
  onClose,
  onSuccess,
  sessionId,
  tableId,
  participantId,
}: GroupCreationModalProps) {
  const [step, setStep] = useState<Step>(STEPS.SELECT_MODE);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [hostName, setHostName] = useState('');
  const [autoApproveJoins, setAutoApproveJoins] = useState(false);
  const [copied, setCopied] = useState(false);

  const createGroup = useGroupStore((state) => state.createGroup);
  const isLoading = useGroupStore((state) => state.isLoading);
  const error = useGroupStore((state) => state.error);
  const currentGroup = useGroupStore((state) => state.currentGroup);

  const handleOpen = useCallback(() => {
    setStep(STEPS.SELECT_MODE);
    setPaymentType(null);
    setHostName('');
    setAutoApproveJoins(false);
    setCopied(false);
    const clearError = useGroupStore.getState().setError;
    if (clearError) clearError(null);
  }, []);

  React.useEffect(() => {
    if (show) handleOpen();
  }, [show, handleOpen]);

  const handleSelect = useCallback((type: PaymentType) => {
    setPaymentType(type);
    setStep(STEPS.ENTER_NAME);
  }, []);

  const handleBack = useCallback(() => {
    if (step === STEPS.ENTER_NAME) setStep(STEPS.SELECT_MODE);
  }, [step]);

  const handleCreate = useCallback(async () => {
    if (!paymentType || !sessionId || !tableId) return;
    setStep(STEPS.CREATING);
    try {
      const group = await createGroup({
        table_id: tableId,
        session_id: sessionId,
        participant_id: participantId || undefined,
        host_name: hostName || undefined,
        payment_type: paymentType,
        auto_approve_joins: autoApproveJoins,
        max_members: 6,
      });
      setStep(STEPS.SUCCESS);
      onSuccess?.(group.group_id);
    } catch (err) {
      setStep(STEPS.ENTER_NAME);
    }
  }, [paymentType, sessionId, tableId, hostName, autoApproveJoins, createGroup, onSuccess, participantId]);

  const handleClose = useCallback(() => {
    if (step === STEPS.CREATING) return;
    onClose();
  }, [step, onClose]);

  const handleCopy = () => {
    if (currentGroup?.share_code) {
      navigator.clipboard.writeText(currentGroup.share_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal show={show} onClose={handleClose} maxWidth="sm">
      <div className="bg-[#faf9f7]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[#e8e4df]/60 bg-white">
          <div className="text-center">
            <p className="text-[10px] font-bold text-[#d4a574] tracking-[0.2em] uppercase mb-1">
              {step === STEPS.SELECT_MODE && 'Step 1 of 2'}
              {step === STEPS.ENTER_NAME && 'Step 2 of 2'}
              {(step === STEPS.CREATING || step === STEPS.SUCCESS) && 'Group Order'}
            </p>
            <h2 className="text-xl font-semibold text-[#2d2a26] tracking-tight">
              {step === STEPS.SELECT_MODE && 'Payment Mode'}
              {step === STEPS.ENTER_NAME && 'Your Name'}
              {step === STEPS.CREATING && 'Creating...'}
              {step === STEPS.SUCCESS && 'Group Created!'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Select Payment */}
          {step === STEPS.SELECT_MODE && (
            <div className="space-y-3">
              {PAYMENT_OPTIONS.map((opt) => (
                <button key={opt.type} onClick={() => handleSelect(opt.type)} className="group relative w-full">
                  <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-xl -z-10" />
                  <div className="relative bg-white rounded-xl p-4 border-2 border-[#e8e4df]/60 active:border-[#d4a574] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center text-[#d4a574]">
                        {opt.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-[#2d2a26] text-sm">{opt.title}</h3>
                        <p className="text-xs text-[#8b8680]">{opt.desc}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {/* Auto-approve */}
              <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#e8e4df]/60 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={autoApproveJoins}
                  onChange={(e) => setAutoApproveJoins(e.target.checked)}
                  className="w-4 h-4 rounded border-[#e8e4df] text-[#d4a574] mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-[#2d2a26]">Auto-approve joins</span>
                  <p className="text-xs text-[#8b8680]">Skip approval for new members</p>
                </div>
              </label>
            </div>
          )}

          {/* Step 2: Enter Name */}
          {step === STEPS.ENTER_NAME && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2d2a26] tracking-wider uppercase mb-2">
                  Your Name <span className="text-[#8b8680] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b8680]" />
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g., Ana"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] text-sm focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Selected */}
              <div className="p-3 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60">
                <p className="text-[10px] font-bold text-[#2d2a26] tracking-wider uppercase mb-2">Selected</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#d4a574]/10 flex items-center justify-center text-[#d4a574]">
                    {PAYMENT_OPTIONS.find((o) => o.type === paymentType)?.icon}
                  </div>
                  <p className="text-sm font-medium text-[#2d2a26]">
                    {PAYMENT_OPTIONS.find((o) => o.type === paymentType)?.title}
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Creating */}
          {step === STEPS.CREATING && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-[#d4a574] animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#5c5752]">Setting up your group...</p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === STEPS.SUCCESS && currentGroup && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#d4a574] rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Share Code */}
              <div className="bg-white rounded-xl p-4 border-2 border-[#d4a574]/30 text-center">
                <p className="text-[10px] font-bold text-[#2d2a26] tracking-wider uppercase mb-1">Share Code</p>
                <p className="text-3xl font-bold text-[#d4a574] tracking-widest font-mono">
                  {currentGroup.share_code}
                </p>
                <button
                  onClick={handleCopy}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf9f7] rounded-lg text-xs font-medium"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>

              {/* Share Link */}
              <div className="bg-white rounded-xl p-3 border border-[#e8e4df]/60">
                <p className="text-[10px] font-bold text-[#2d2a26] tracking-wider uppercase mb-1">Share Link</p>
                <p className="text-xs font-mono text-[#5c5752] break-all">
                  {typeof window !== 'undefined' && window.location.origin}/group/{currentGroup.share_code}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== STEPS.CREATING && step !== STEPS.SUCCESS && (
          <div className="px-4 py-3 border-t border-[#e8e4df]/60 bg-white flex items-center gap-2">
            {step === STEPS.ENTER_NAME && (
              <button onClick={handleBack} className="p-2 text-[#5c5752]">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1" />
            <button onClick={handleClose} className="px-4 py-2 text-sm text-[#5c5752]">Cancel</button>
            {step === STEPS.ENTER_NAME && (
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="bg-[#2d2a26] text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Create</>}
              </button>
            )}
          </div>
        )}

        {step === STEPS.SUCCESS && (
          <div className="px-4 py-3 border-t border-[#e8e4df]/60 bg-white">
            <button onClick={handleClose} className="w-full bg-[#2d2a26] text-white font-semibold py-3 rounded-lg">
              Start Ordering
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
