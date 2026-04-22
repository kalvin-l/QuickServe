/**
 * Ordering Mode Selection Modal
 *
 * Warm, human-centered design for choosing ordering preference
 * Offset shadows, caramel accents, editorial typography
 */

'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal/Modal';
import GroupCreationModal from './GroupCreationModal';
import JoinGroupModal from './JoinGroupModal';
import { getActiveGroupByTable, type GroupDetail } from '@/lib/groupApi';
import { useGroupStore } from '@/features/groups/store/groupStore';
import { User, Users, UserPlus, ArrowRight, Sparkles, MapPin } from 'lucide-react';

interface OrderingModeSelectionProps {
  show: boolean;
  onClose: () => void;
  onModeSelected: (mode: 'individual' | 'group') => void;
  tableNumber: number;
  sessionId: string;
  tableId: number;
  participantId: number | null;
}

export default function OrderingModeSelection({
  show,
  onClose,
  onModeSelected,
  tableNumber,
  sessionId,
  tableId,
  participantId,
}: OrderingModeSelectionProps) {
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [existingGroup, setExistingGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { clearGroup } = useGroupStore();

  useEffect(() => {
    if (show) {
      checkForExistingGroup();
    }
  }, [show, tableId]);

  const checkForExistingGroup = async () => {
    setLoading(true);
    const group = await getActiveGroupByTable(tableId);
    setExistingGroup(group);
    setLoading(false);
  };

  const handleIndividualOrder = () => {
    localStorage.setItem(`order-mode-${sessionId}`, 'individual');
    clearGroup();
    localStorage.removeItem(`group-id-${sessionId}`);
    onModeSelected('individual');
    onClose();
  };

  const handleStartGroup = () => {
    setShowGroupCreation(true);
  };

  const handleJoinGroup = () => {
    setShowJoinGroup(true);
  };

  const handleGroupCreated = (groupId: string) => {
    localStorage.setItem(`order-mode-${sessionId}`, 'group');
    localStorage.setItem(`group-id-${sessionId}`, groupId);
    if (participantId) {
      localStorage.setItem(`group-host-${sessionId}`, String(participantId));
    } else {
      const tableParticipantStr = localStorage.getItem('tableParticipant');
      if (tableParticipantStr) {
        try {
          const participant = JSON.parse(tableParticipantStr);
          if (participant.id) {
            localStorage.setItem(`group-host-${sessionId}`, String(participant.id));
          }
        } catch (e) {
          console.error('Error reading tableParticipant:', e);
        }
      }
    }
    onModeSelected('group');
    setShowGroupCreation(false);
    onClose();
  };

  const handleGroupModalClose = () => {
    setShowGroupCreation(false);
  };

  const handleJoinModalClose = () => {
    setShowJoinGroup(false);
  };

  const handleJoined = () => {
    localStorage.setItem(`order-mode-${sessionId}`, 'group');
    if (existingGroup) {
      localStorage.setItem(`group-id-${sessionId}`, existingGroup.group_id);
    }
    onModeSelected('group');
    setShowJoinGroup(false);
    onClose();
  };

  const isHost = participantId !== null && existingGroup?.host_participant_id === participantId;

  return (
    <>
      <Modal
        show={show && !showGroupCreation && !showJoinGroup}
        onClose={onClose}
        maxWidth="md"
        closeOnBackdropClick={false}
        closeOnEscape={false}
        showCloseButton={false}
      >
        <div className="bg-[#faf9f7]">
          {/* Header */}
          <div className="px-6 py-6 border-b border-[#e8e4df]/60 bg-white">
            <div className="text-center">
              <p className="text-[10px] font-bold text-[#d4a574] tracking-[0.2em] uppercase mb-2">
                Table {tableNumber}
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#2d2a26] tracking-tight">
                How would you like to order?
              </h2>
              <p className="text-sm text-[#8b8680] mt-2">
                Choose your ordering preference
              </p>
            </div>
          </div>

          <div className="px-6 py-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Existing Group Banner */}
                {existingGroup && !isHost && (
                  <div className="relative mb-6">
                    <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-xl -z-10" />
                    <div className="relative bg-white rounded-xl p-4 border border-[#e8e4df]/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-[#d4a574]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#2d2a26] text-sm truncate">
                            Active group at this table
                          </p>
                          <p className="text-xs text-[#8b8680]">
                            Hosted by <span className="text-[#d4a574]">{existingGroup.host_name || 'Someone'}</span> • {existingGroup.member_count} member{existingGroup.member_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Options */}
                <div className="space-y-4">
                  {/* Individual Order Option */}
                  <button
                    onClick={handleIndividualOrder}
                    className="group relative w-full"
                  >
                    {/* Offset shadow */}
                    <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl transition-all group-hover:translate-x-1 group-hover:translate-y-1" />
                    
                    <div className="relative bg-white rounded-2xl p-5 border-2 border-[#e8e4df]/60 transition-all group-hover:border-[#d4a574]/50 text-left">
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#d4a574]/10 group-hover:border-[#d4a574]/30">
                          <User className="w-6 h-6 text-[#d4a574]" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#2d2a26] text-lg tracking-tight">
                            Just Me
                          </h3>
                          <p className="text-sm text-[#8b8680] mt-0.5">
                            Order independently with separate payment
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="w-8 h-8 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0 transition-all group-hover:bg-[#2d2a26] group-hover:border-[#2d2a26]">
                          <ArrowRight className="w-4 h-4 text-[#8b8680] transition-colors group-hover:text-white" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Join Group Option - only show if group exists and user is not host */}
                  {existingGroup && !isHost && (
                    <button
                      onClick={handleJoinGroup}
                      className="group relative w-full"
                    >
                      {/* Offset shadow */}
                      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl transition-all group-hover:translate-x-1 group-hover:translate-y-1" />
                      
                      <div className="relative bg-white rounded-2xl p-5 border-2 border-[#d4a574]/30 transition-all group-hover:border-[#d4a574] text-left">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="w-12 h-12 rounded-xl bg-[#d4a574]/10 border border-[#d4a574]/30 flex items-center justify-center shrink-0">
                            <UserPlus className="w-6 h-6 text-[#d4a574]" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#2d2a26] text-lg tracking-tight">
                              Join Group
                            </h3>
                            <p className="text-sm text-[#8b8680] mt-0.5">
                              Request to join the existing group order
                            </p>
                          </div>

                          {/* Arrow */}
                          <div className="w-8 h-8 rounded-full bg-[#d4a574]/10 border border-[#d4a574]/30 flex items-center justify-center shrink-0 transition-all group-hover:bg-[#d4a574]">
                            <ArrowRight className="w-4 h-4 text-[#d4a574] transition-colors group-hover:text-white" />
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Start Group Option - only show if no group exists */}
                  {!existingGroup && (
                    <button
                      onClick={handleStartGroup}
                      className="group relative w-full"
                    >
                      {/* Offset shadow */}
                      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl transition-all group-hover:translate-x-1 group-hover:translate-y-1" />
                      
                      <div className="relative bg-white rounded-2xl p-5 border-2 border-[#e8e4df]/60 transition-all group-hover:border-[#d4a574]/50 text-left">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="w-12 h-12 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#d4a574]/10 group-hover:border-[#d4a574]/30">
                            <Users className="w-6 h-6 text-[#d4a574]" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#2d2a26] text-lg tracking-tight">
                              Start Group Order
                            </h3>
                            <p className="text-sm text-[#8b8680] mt-0.5">
                              Order together with others at this table
                            </p>
                          </div>

                          {/* Arrow */}
                          <div className="w-8 h-8 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0 transition-all group-hover:bg-[#2d2a26] group-hover:border-[#2d2a26]">
                            <ArrowRight className="w-4 h-4 text-[#8b8680] transition-colors group-hover:text-white" />
                          </div>
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Help Text */}
                <div className="relative mt-6">
                  <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                  <div className="relative bg-[#faf9f7] border border-[#e8e4df]/60 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#e8e4df]/60 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-[#d4a574]" />
                      </div>
                      <p className="text-sm text-[#5c5752] leading-relaxed">
                        {existingGroup
                          ? 'Join the group to order together and split the bill, or order individually with separate payment.'
                          : 'Start a group to invite others at your table. Everyone can add items to a shared cart.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Group Creation Modal */}
      <GroupCreationModal
        show={showGroupCreation}
        onClose={handleGroupModalClose}
        onSuccess={handleGroupCreated}
        sessionId={sessionId}
        tableId={tableId}
        participantId={participantId}
      />

      {/* Join Group Modal */}
      {existingGroup && (
        <JoinGroupModal
          show={showJoinGroup}
          onClose={handleJoinModalClose}
          onJoined={handleJoined}
          group={existingGroup}
          sessionId={sessionId}
          participantId={participantId}
        />
      )}
    </>
  );
}
