/**
 * Participant Group Cart Modal
 *
 * Read-only view for group cart with warm, human-centered design
 * Shows all participants' items with beautiful participant badges
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/modal/Modal';
import { getGroup, type GroupDetail } from '@/lib/groupApi';
import { useGroupCart } from '@/lib/api/queries/useOrders';
import type { GroupCart } from '@/types/order.types';
import { Users, Copy, Check, ShoppingBag, Clock, User } from 'lucide-react';

interface ParticipantGroupCartModalProps {
  show: boolean;
  onClose: () => void;
  groupId: string;
}

// Transform backend image path to full URL
const getCartItemImage = (imagePath: string | null | undefined): string => {
  console.log('[ParticipantGroupCartModal] getCartItemImage - Input:', imagePath);
  if (!imagePath) {
    console.log('[ParticipantGroupCartModal] No imagePath, returning empty');
    return '';
  }
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
  const normalizedPath = imagePath.replace(/\\/g, '/');
  const fullUrl = `${apiBaseUrl}/${normalizedPath}`;
  console.log('[ParticipantGroupCartModal] API Base URL:', apiBaseUrl);
  console.log('[ParticipantGroupCartModal] Normalized path:', normalizedPath);
  console.log('[ParticipantGroupCartModal] Full URL:', fullUrl);
  return fullUrl;
};

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Generate consistent color from name
const getParticipantColor = (name: string) => {
  const colors = [
    { bg: 'bg-[#d4a574]/20', text: 'text-[#d4a574]', border: 'border-[#d4a574]/30' },
    { bg: 'bg-[#8b8680]/20', text: 'text-[#5c5752]', border: 'border-[#8b8680]/30' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

export default function ParticipantGroupCartModal({
  show,
  onClose,
  groupId,
}: ParticipantGroupCartModalProps) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const { data: groupCart, isLoading: cartLoading, refetch } = useGroupCart(groupId) as {
    data: GroupCart | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const groupData = await getGroup(groupId);
      setGroup(groupData);
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (show) {
      setLoading(true);
      fetchGroup();
      const interval = setInterval(() => {
        fetchGroup();
        refetch?.();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [show, fetchGroup, refetch]);

  const handleCopyCode = () => {
    if (group?.share_code) {
      navigator.clipboard.writeText(group.share_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate totals
  const itemCount = groupCart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <Modal
      show={show}
      onClose={onClose}
      maxWidth="lg"
      contentClassName="p-0"
      showCloseButton={false}
    >
      <div className="flex flex-col max-h-[85vh] bg-[#faf9f7]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e8e4df]/60 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#2d2a26] tracking-tight">Group Order</h2>
                <span className={`w-2 h-2 rounded-full ${group?.status === 'active' ? 'bg-green-500' : 'bg-[#8b8680]'}`} />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#8b8680] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {group?.member_count || 0}/{group?.max_members || 0} members
                </span>
                <span className="text-xs text-[#8b8680] flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {itemCount} items
                </span>
              </div>
            </div>

            {/* Share Code */}
            {group?.share_code && (
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-3 py-2 bg-[#faf9f7] hover:bg-[#f5f0eb] rounded-xl border border-[#e8e4df]/60 transition-colors"
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
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !group ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-[#2d2a26] font-medium mb-1">Group not found</h3>
            <button
              onClick={onClose}
              className="mt-4 text-sm font-medium text-[#d4a574] hover:text-[#c49a6b] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {cartLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groupCart && groupCart.items && groupCart.items.length > 0 ? (
              <div className="space-y-4">
                {/* Group Cart Items */}
                {groupCart.items.map((item) => {
                  // Debug logging for each cart item
                  console.log('[ParticipantGroupCartModal] Cart item:', {
                    id: item.id,
                    item_name: item.item_name,
                    item_image: item.item_image,
                    participant_name: item.participant_name,
                  });
                  const participantColor = item.participant_name
                    ? getParticipantColor(item.participant_name)
                    : { bg: 'bg-[#8b8680]/10', text: 'text-[#8b8680]', border: 'border-[#8b8680]/20' };

                  return (
                    <div 
                      key={item.id} 
                      className="bg-white rounded-xl p-3 border border-[#e8e4df]/60 shadow-sm relative overflow-hidden"
                    >
                      {/* Offset shadow */}
                      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                      
                      <div className="flex gap-3">
                        {/* Image */}
                        <div className="w-16 h-16 rounded-lg shrink-0 overflow-hidden relative bg-[#faf9f7]">
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
                              <ShoppingBag className="w-5 h-5 text-[#8b8680]" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Participant Badge */}
                          {item.participant_name && (
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${participantColor.bg} ${participantColor.text} border ${participantColor.border}`}>
                              <span className="w-4 h-4 rounded-full bg-white/50 flex items-center justify-center text-[10px]">
                                {getInitials(item.participant_name)}
                              </span>
                              {item.participant_name}
                            </div>
                          )}

                          <h4 className="font-medium text-[#2d2a26] text-sm truncate">
                            {item.item_name}
                          </h4>

                          {/* Customizations */}
                          {(item.size_label || item.temperature) && (
                            <p className="text-xs text-[#8b8680] mt-0.5">
                              {[item.size_label, item.temperature].filter(Boolean).join(' • ')}
                            </p>
                          )}

                          {/* Addons */}
                          {item.addons && item.addons.length > 0 && (
                            <p className="text-xs text-[#8b8680] mt-0.5">
                              {item.addons.map((a: { name: string }) => a.name).join(', ')}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-[#8b8680]">
                              {item.quantity} × ₱{item.base_price_in_pesos?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-sm font-semibold text-[#d4a574]">
                              ₱{item.item_total_in_pesos?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Cart Summary */}
                <div className="bg-[#faf9f7] rounded-xl p-4 border border-[#e8e4df]/60 mt-4">
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

                {/* Waiting Message */}
                <div className="bg-[#faf9f7] border border-[#e8e4df]/60 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#d4a574]/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-[#d4a574]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2d2a26]">Waiting for host to checkout</p>
                      <p className="text-xs text-[#8b8680] mt-0.5">
                        Only the host can complete the group order. Feel free to add more items!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 mx-auto flex items-center justify-center mb-4">
                  <ShoppingBag className="w-6 h-6 text-[#8b8680]" />
                </div>
                <h3 className="text-[#2d2a26] font-medium mb-1">Cart is empty</h3>
                <p className="text-sm text-[#8b8680]">Add items to see them here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
