/**
 * Join Group Modal
 *
 * Warm, human-centered design for requesting to join a group
 * Offset shadows, caramel accents, editorial typography
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/modal/Modal';
import Button from '@/components/ui/button/Button';
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner';
import { createJoinRequest, getJoinRequest, type JoinRequest } from '@/lib/joinRequestApi';
import { getGroup, type GroupDetail } from '@/lib/groupApi';
import {
  UserPlus, Users, Clock, MessageSquare, User,
  CheckCircle2, XCircle, Hourglass, ArrowRight
} from 'lucide-react';

interface JoinGroupModalProps {
  show: boolean;
  onClose: () => void;
  onJoined: () => void;
  group: GroupDetail;
  sessionId: string;
  participantId?: number | null;
}

type Step = 'form' | 'waiting' | 'approved' | 'declined';

export default function JoinGroupModal({
  show,
  onClose,
  onJoined,
  group,
  sessionId,
  participantId,
}: JoinGroupModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setStep('form');
      setName('');
      setMessage('');
      setError('');
      setRequest(null);
      setDeclineReason('');
    }
  }, [show]);

  // Submit join request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const req = await createJoinRequest({
        group_id: group.group_id,
        session_id: sessionId,
        participant_id: participantId || undefined,
        name: name.trim(),
        message: message.trim() || undefined,
      });

      setRequest(req);

      // If auto-approved, go directly to approved state
      if (req.status === 'approved') {
        setStep('approved');
      } else {
        setStep('waiting');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  // Poll for approval status
  useEffect(() => {
    if (step !== 'waiting' || !request) return;

    const pollInterval = setInterval(async () => {
      try {
        const updated = await getJoinRequest(request.request_id);
        if (!updated) return;

        if (updated.status === 'approved') {
          setStep('approved');
          clearInterval(pollInterval);
        } else if (updated.status === 'declined') {
          setDeclineReason(updated.response_reason || '');
          setStep('declined');
          clearInterval(pollInterval);
        } else if (updated.status === 'timeout') {
          setDeclineReason('Request timed out');
          setStep('declined');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [step, request]);

  // Handle approved - proceed to menu
  const handleJoined = () => {
    localStorage.setItem(`order-mode-${sessionId}`, 'group');
    localStorage.setItem(`group-id-${sessionId}`, group.group_id);
    onJoined();
  };

  return (
    <Modal
      show={show}
      onClose={step === 'waiting' ? () => {} : onClose}
      maxWidth="sm"
      closeOnBackdropClick={step !== 'waiting'}
      closeOnEscape={step !== 'waiting'}
      showCloseButton={step !== 'waiting'}
      contentClassName="p-0"
    >
      <div className="bg-[#faf9f7]">
        {/* Form Step */}
        {step === 'form' && (
          <>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-[#e8e4df]/60 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-[#d4a574]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-[#2d2a26] tracking-tight">
                    Join Group Order
                  </h2>
                  <p className="text-xs text-[#8b8680] mt-0.5">
                    Request to join {group.host_name ? `${group.host_name}'s group` : 'this group'}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* Group Info Card */}
              <div className="relative bg-white rounded-xl p-3 border border-[#e8e4df]/60 shadow-sm">
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#2d2a26] text-sm">
                      {group.member_count} / {group.max_members} members
                    </p>
                    <p className="text-xs text-[#8b8680] capitalize">
                      {group.payment_type.replace('_', ' ')} payment
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>

              {/* Name Input */}
              <div className="relative bg-white rounded-xl p-3 border border-[#e8e4df]/60 shadow-sm">
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                <label className="block text-xs font-semibold text-[#2d2a26] uppercase tracking-wider mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8680]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2 bg-[#faf9f7] border border-[#e8e4df]/60 rounded-lg focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574] transition-all duration-200 text-[#2d2a26] placeholder:text-[#8b8680] text-sm"
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Message Input */}
              <div className="relative bg-white rounded-xl p-3 border border-[#e8e4df]/60 shadow-sm">
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                <label className="block text-xs font-semibold text-[#2d2a26] uppercase tracking-wider mb-2">
                  Message <span className="text-[#8b8680] font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-[#8b8680]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Say something nice..."
                    className="w-full pl-9 pr-3 py-2 bg-[#faf9f7] border border-[#e8e4df]/60 rounded-lg focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574] transition-all duration-200 text-[#2d2a26] placeholder:text-[#8b8680] text-sm resize-none"
                    rows={2}
                    maxLength={200}
                  />
                </div>
                <p className="text-xs text-[#8b8680] mt-1.5 text-right">
                  {message.length}/200
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-[#faf9f7] hover:bg-[#f5f0eb] text-[#5c5752] font-semibold py-2.5 px-4 rounded-xl border border-[#e8e4df]/60 transition-all active:scale-[0.98] text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#d4a574] hover:bg-[#c49a6b] text-white font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Request to Join
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Waiting Step */}
        {step === 'waiting' && (
          <div className="px-5 py-10 text-center">
            {/* Branded Loading Animation */}
            <div className="mb-5">
              <LoadingSpinner type="branded" size="xl" />
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf9f7] border border-[#e8e4df]/60 rounded-full mb-3">
              <Hourglass className="w-3.5 h-3.5 text-[#d4a574]" />
              <span className="text-xs font-semibold text-[#d4a574] uppercase tracking-wider">Pending</span>
            </div>

            <h2 className="text-lg font-semibold text-[#2d2a26] tracking-tight mb-1">
              Waiting for Host
            </h2>
            <p className="text-sm text-[#8b8680] mb-5 max-w-xs mx-auto">
              {group.host_name || 'The host'} will review your request shortly
            </p>

            {/* Requester Info Card */}
            <div className="relative bg-white rounded-xl p-4 border border-[#e8e4df]/60 shadow-sm max-w-xs mx-auto">
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#d4a574]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-[#2d2a26] text-sm truncate">{name}</p>
                  <p className="text-xs text-[#8b8680]">Requesting to join</p>
                </div>
                {message && (
                  <div className="text-[#8b8680]" title={message}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <p className="text-xs text-[#8b8680] mt-5 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Expires in 5 minutes
            </p>
          </div>
        )}

        {/* Approved Step */}
        {step === 'approved' && (
          <div className="px-5 py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full mb-3">
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Approved</span>
            </div>
            <h2 className="text-lg font-semibold text-[#2d2a26] tracking-tight mb-1">
              You're In!
            </h2>
            <p className="text-sm text-[#8b8680] mb-5 max-w-xs mx-auto">
              You've been added to the group. Start adding items!
            </p>
            <button
              onClick={handleJoined}
              className="w-full bg-[#2d2a26] hover:bg-[#3d3a36] text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Continue to Menu
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Declined Step */}
        {step === 'declined' && (
          <div className="px-5 py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 rounded-full mb-3">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Declined</span>
            </div>
            <h2 className="text-lg font-semibold text-[#2d2a26] tracking-tight mb-1">
              Request Declined
            </h2>
            <p className="text-sm text-[#8b8680] mb-1 max-w-xs mx-auto">
              {declineReason || 'The host declined your request.'}
            </p>
            <p className="text-xs text-[#8b8680] mb-5">
              You can still order individually
            </p>
            <button
              onClick={onClose}
              className="w-full bg-[#faf9f7] hover:bg-[#f5f0eb] text-[#5c5752] font-semibold py-3 px-4 rounded-xl border border-[#e8e4df]/60 transition-all active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
