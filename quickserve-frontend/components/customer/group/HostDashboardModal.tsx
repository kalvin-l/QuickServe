/**
 * Host Dashboard Modal
 *
 * Warm, human-centered design for group management
 * Offset shadows, caramel accents, editorial typography
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Modal from '@/components/ui/modal/Modal';
import { getGroup, type GroupDetail } from '@/lib/groupApi';
import {
  getPendingRequests,
  approveJoinRequest,
  declineJoinRequest,
  type JoinRequest,
} from '@/lib/joinRequestApi';
import { useGroupCart } from '@/lib/api/queries/useOrders';
import { groupCartService } from '@/lib/api/services/orderService';
import type { GroupCart } from '@/types/order.types';
import {
  X, Users, UserPlus, ShoppingBag, Copy, Check,
  User, Crown, CreditCard, Trash2, Inbox, ShoppingCart,
  CheckCircle2, XCircle, Sparkles
} from 'lucide-react';

interface HostDashboardModalProps {
  show: boolean;
  onClose: () => void;
  groupId: string;
}

// Transform backend image path to full URL
const getCartItemImage = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
  const normalizedPath = imagePath.replace(/\\/g, '/');
  return `${apiBaseUrl}/${normalizedPath}`;
};

export default function HostDashboardModal({
  show,
  onClose,
  groupId,
}: HostDashboardModalProps) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'members' | 'cart'>('requests');

  const { data: groupCart, isLoading: cartLoading, refetch } = useGroupCart(groupId) as {
    data: GroupCart | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [groupData, requestsData] = await Promise.all([
        getGroup(groupId),
        getPendingRequests(groupId),
      ]);
      setGroup(groupData);
      setPendingRequests(requestsData);
      refetch?.();
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, refetch]);

  useEffect(() => {
    if (show) {
      setLoading(true);
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [show, fetchData]);

  const handleCopyCode = () => {
    if (group?.share_code) {
      navigator.clipboard.writeText(group.share_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSessionId = () => {
    if (typeof window === 'undefined') return '';
    try {
      const tableSessionStr = localStorage.getItem('tableSession');
      const qrSessionStr = localStorage.getItem('qr_session');
      if (tableSessionStr) {
        const tableSession = JSON.parse(tableSessionStr);
        return tableSession.session_id || '';
      } else if (qrSessionStr) {
        const qrSession = JSON.parse(qrSessionStr);
        return qrSession.sessionId || '';
      }
    } catch (e) {
      console.error('Failed to get session_id:', e);
    }
    return '';
  };

  const handleApprove = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;
      await approveJoinRequest(requestId, sessionId);
      await fetchData();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;
      await declineJoinRequest(requestId, sessionId);
      await fetchData();
    } catch (err) {
      console.error('Failed to decline:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;
      await groupCartService.removeItem(groupId, itemId, sessionId);
      refetch?.();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // Get participant color
  const getMemberColor = (index: number) => {
    const colors = [
      'bg-[#d4a574] text-white',
      'bg-[#8b8680] text-white',
      'bg-amber-500 text-white',
      'bg-emerald-500 text-white',
      'bg-rose-500 text-white',
      'bg-sky-500 text-white',
    ];
    return colors[index % colors.length];
  };

  // Get display name for cart item participant
  const getParticipantDisplayName = (item: GroupCartItem): string => {
    console.log('[HostDashboard] getParticipantDisplayName called with item:', item);
    console.log('[HostDashboard] group.members:', group?.members);

    // Try to find matching member by participant_id
    if (item.participant_id && group?.members) {
      console.log('[HostDashboard] Searching for member with participant_id:', item.participant_id);
      console.log('[HostDashboard] Available members:', group.members.map(m => ({ id: m.id, participant_id: m.participant_id, name: m.name })));

      const member = group.members.find(m => m.participant_id === item.participant_id);
      console.log('[HostDashboard] Found member:', member);

      if (member) {
        const memberIndex = group.members.findIndex(m => m.participant_id === item.participant_id);
        // If it's the host (first member), show "Host"
        if (memberIndex === 0) {
          console.log('[HostDashboard] ✓ Returning "Host" for first member');
          return 'Host';
        }
        // Otherwise show the member's actual name
        const displayName = member.name || 'Guest';
        console.log('[HostDashboard] ✓ Returning member name:', displayName);
        return displayName;
      }
    }
    // Fallback to "Guest" instead of device names like "iPhone (Safari)"
    console.log('[HostDashboard] ✗ No matching member found, returning "Guest"');
    return 'Guest';
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      maxWidth="md"
      contentClassName="p-0"
      showCloseButton={false}
    >
      <div className="bg-[#faf9f7] max-h-[85vh] flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !group ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-[#d4a574]" />
            </div>
            <p className="text-[#5c5752]">Group not found</p>
            <button
              onClick={onClose}
              className="mt-4 text-sm font-medium text-[#d4a574] hover:text-[#c49a6b]"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-[#e8e4df]/60 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-[#faf9f7] text-[#5c5752] hover:bg-[#f5f0eb] hover:text-[#2d2a26] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-[#2d2a26] tracking-tight">Group Dashboard</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${group.status === 'active' ? 'bg-green-500' : 'bg-[#8b8680]'}`} />
                    <span className="text-xs text-[#8b8680]">
                      {group.member_count}/{group.max_members} members
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-3 py-2 bg-[#faf9f7] hover:bg-[#f5f0eb] border border-[#e8e4df]/60 rounded-xl transition-colors"
                >
                  <span className="font-mono font-bold text-[#d4a574] text-lg tracking-wider">
                    {group.share_code}
                  </span>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#8b8680]" />
                  )}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#e8e4df]/60 bg-white">
              {[
                { id: 'requests', label: 'Requests', icon: UserPlus, count: pendingRequests.length },
                { id: 'members', label: 'Members', icon: Users, count: group.members?.length || 0 },
                { id: 'cart', label: 'Cart', icon: ShoppingBag, count: groupCart?.items?.length || 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id ? 'text-[#d4a574]' : 'text-[#8b8680] hover:text-[#5c5752]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
                  {tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-[#d4a574] text-white' : 'bg-[#e8e4df]/60 text-[#5c5752]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4a574]" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'requests' ? (
                pendingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.request_id}
                        className="relative bg-white rounded-xl p-4 border border-[#e8e4df]/60 shadow-sm"
                      >
                        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-[#d4a574]" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#2d2a26] text-sm truncate">
                                {request.requester_name || 'Anonymous'}
                              </p>
                              {request.message && (
                                <p className="text-xs text-[#8b8680] truncate">
                                  "{request.message}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleDecline(request.request_id)}
                              disabled={processingRequest === request.request_id}
                              className="w-9 h-9 flex items-center justify-center bg-[#faf9f7] hover:bg-red-50 text-[#8b8680] hover:text-red-500 rounded-lg transition-colors border border-[#e8e4df]/60 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApprove(request.request_id)}
                              disabled={processingRequest === request.request_id}
                              className="w-9 h-9 flex items-center justify-center bg-[#d4a574] hover:bg-[#c49a6b] text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="w-6 h-6 text-[#8b8680]" />
                    </div>
                    <p className="text-[#5c5752] text-sm">No pending requests</p>
                    <p className="text-xs text-[#8b8680] mt-1">Share your code to invite others</p>
                  </div>
                )
              ) : activeTab === 'members' ? (
                group.members && group.members.length > 0 ? (
                  <div className="space-y-3">
                    {group.members.map((member, index) => (
                      <div
                        key={member.member_id}
                        className="relative bg-white rounded-xl p-4 border border-[#e8e4df]/60 shadow-sm"
                      >
                        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${getMemberColor(index)}`}>
                              {getInitials(member.name || 'Guest')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-[#2d2a26] text-sm">
                                  {member.name || `Guest ${index + 1}`}
                                </p>
                                {index === 0 && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-[#d4a574]/10 text-[#d4a574] text-[10px] font-bold uppercase tracking-wider rounded-full">
                                    <Crown className="w-3 h-3" />
                                    Host
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#8b8680]">
                                {member.has_paid ? 'Paid' : 'Not paid'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-[#8b8680]" />
                    </div>
                    <p className="text-[#5c5752] text-sm">No members yet</p>
                  </div>
                )
              ) : (
                cartLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : groupCart && groupCart.items && groupCart.items.length > 0 ? (
                  <div className="space-y-4">
                    {/* Cart Items */}
                    {groupCart.items.map((item) => (
                      <div key={item.id} className="relative bg-white rounded-xl p-3 border border-[#e8e4df]/60 shadow-sm">
                        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg bg-[#faf9f7] border border-[#e8e4df]/60 shrink-0 overflow-hidden relative">
                            {item.item_image ? (
                              <Image
                                src={getCartItemImage(item.item_image)}
                                alt={item.item_name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-[#8b8680]" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                {item.participant_id && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#d4a574]/10 text-[#d4a574] text-xs font-semibold rounded-lg mb-1.5">
                                    <span className="text-[10px] uppercase tracking-wider opacity-70">Ordered by</span>
                                    <span className="text-sm">{getParticipantDisplayName(item)}</span>
                                  </div>
                                )}

                                <h4 className="font-semibold text-[#2d2a26] text-sm truncate">
                                  {item.item_name}
                                </h4>

                                {(item.size_label || item.temperature) && (
                                  <p className="text-xs text-[#8b8680] mt-0.5">
                                    {[item.size_label, item.temperature].filter(Boolean).join(' • ')}
                                  </p>
                                )}

                                {item.addons && item.addons.length > 0 && (
                                  <p className="text-xs text-[#8b8680] mt-0.5">
                                    {item.addons.map((a: { name: string }) => a.name).join(', ')}
                                  </p>
                                )}

                                <p className="text-xs text-[#8b8680] mt-1">
                                  {item.quantity} × ₱{item.base_price_in_pesos?.toFixed(2) || '0.00'}
                                </p>

                                <p className="text-sm font-bold text-[#d4a574] mt-1">
                                  ₱{item.item_total_in_pesos?.toFixed(2) || '0.00'}
                                </p>
                              </div>

                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="w-8 h-8 flex items-center justify-center bg-[#faf9f7] hover:bg-red-50 text-[#8b8680] hover:text-red-500 rounded-lg transition-colors border border-[#e8e4df]/60 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Cart Summary */}
                    <div className="relative bg-[#faf9f7] rounded-xl p-4 border border-[#e8e4df]/60">
                      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#8b8680]">Subtotal</span>
                          <span className="font-medium text-[#5c5752]">₱{groupCart.subtotal_in_pesos?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b8680]">Tax</span>
                          <span className="font-medium text-[#5c5752]">₱{groupCart.tax_in_pesos?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#e8e4df]/60">
                          <span className="font-semibold text-[#2d2a26]">Total</span>
                          <span className="font-bold text-xl text-[#d4a574]">₱{groupCart.total_in_pesos?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-xs text-[#8b8680] pt-1">
                          <span>{groupCart.item_count || 0} items</span>
                          <span>{groupCart.participant_count || 0} participants</span>
                        </div>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <button
                      onClick={() => router.push('/checkout')}
                      className="w-full bg-[#2d2a26] hover:bg-[#3d3a36] text-white font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <CreditCard className="w-5 h-5" />
                      Proceed to Checkout
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="w-6 h-6 text-[#8b8680]" />
                    </div>
                    <p className="text-[#5c5752] text-sm">Cart is empty</p>
                    <p className="text-xs text-[#8b8680] mt-1">Add items to get started</p>
                  </div>
                )
              )}
            </div>

            {/* Footer Settings */}
            <div className="px-4 py-3 border-t border-[#e8e4df]/60 bg-white">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-[#8b8680]">
                    Auto-approve:
                    <span className={`ml-1 font-semibold ${group.auto_approve_joins ? 'text-green-600' : 'text-[#5c5752]'}`}>
                      {group.auto_approve_joins ? 'On' : 'Off'}
                    </span>
                  </span>
                  <span className="text-[#8b8680]">
                    Split:
                    <span className="ml-1 font-semibold text-[#d4a574] capitalize">
                      {group.payment_type.replace('_', ' ')}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
