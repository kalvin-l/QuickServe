/**
 * WebSocket Hook
 * Manages WebSocket connection for real-time updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export type WebSocketMessage =
  | { type: 'connected'; message: string; table_id?: number; session_id?: string }
  | { type: 'new_order'; table_id: number; order: any; timestamp: string }
  | { type: 'order_ready'; table_id: number; order_id: number; timestamp: string }
  | { type: 'order_status_changed'; table_id: number; order_id: number; order_number?: string; old_status?: string; new_status: string; order?: any; session_id?: string; timestamp: string }
  | { type: 'session_started'; table_id: number; session: any; timestamp: string }
  | { type: 'session_ended'; table_id: number; session: any; timestamp: string }
  | { type: 'capacity_update'; capacity: any; timestamp: string }
  | { type: 'staff_call'; table_id: number; reason?: string; timestamp: string }
  | { type: 'staff_call_acknowledged'; message: string }
  | { type: 'group_cart_item_added'; table_id: number; group_id: string; item: any; participant_name?: string; timestamp: string }
  | { type: 'group_cart_item_updated'; table_id: number; group_id: string; item: any; timestamp: string }
  | { type: 'group_cart_item_removed'; table_id: number; group_id: string; item_id: number; timestamp: string }
  | { type: 'group_cart_cleared'; table_id: number; group_id: string; items_removed: number; timestamp: string }
  | { type: 'pong' }
  | { type: 'error'; message: string };

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  enabled?: boolean;
  maxReconnectAttempts?: number; // Max reconnect attempts before giving up
}

export function useWebSocket(
  endpoint: string,
  options: UseWebSocketOptions = {}
) {
  const {
    onMessage,
    onConnected,
    onDisconnected,
    onError,
    reconnectInterval = 3000,
    enabled = true,
    maxReconnectAttempts = 5, // Default max 5 attempts
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef<number>(0); // Track reconnect attempts

  const connect = useCallback(() => {
    if (!enabled) return;

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionError(true);
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}${endpoint}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(false);
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection
        onConnected?.();

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          // Silent fail - parse errors are not critical
        }
      };

      ws.onerror = (error) => {
        setConnectionError(true);
        onError?.(error);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        onDisconnected?.();

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Attempt to reconnect (with max attempts limit)
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      setConnectionError(true);
    }
  }, [endpoint, enabled, reconnectInterval, maxReconnectAttempts, onConnected, onDisconnected, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    // Reset reconnect attempts when endpoint or enabled changes
    reconnectAttemptsRef.current = 0;

    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, endpoint]); // Only reconnect when enabled or endpoint changes, NOT on every connect/disconnect change

  return {
    isConnected,
    connectionError,
    sendMessage,
    connect,
    disconnect,
  };
}

/**
 * Hook for customer table WebSocket
 */
export function useTableWebSocket(
  tableId: number,
  options: Omit<UseWebSocketOptions, 'onMessage'> & {
    sessionId?: string;  // Session ID for multi-device support
    onNewOrder?: (order: any) => void;
    onOrderReady?: (orderId: number) => void;
    onOrderStatusChanged?: (orderId: number, newStatus: string, order?: any, sessionId?: string) => void;
    onStaffCallAcknowledged?: () => void;
    onSessionEnded?: (session: any) => void;
    onGroupCartUpdated?: (groupId: string) => void;
  } = {}
) {
  const {
    sessionId,
    onNewOrder,
    onOrderReady,
    onOrderStatusChanged,
    onStaffCallAcknowledged,
    onSessionEnded,
    onGroupCartUpdated,
    ...restOptions
  } = options;

  // Build WebSocket URL with optional session_id
  const wsEndpoint = sessionId
    ? `/ws/table/${tableId}?session_id=${sessionId}`
    : `/ws/table/${tableId}`;

  return useWebSocket(wsEndpoint, {
    ...restOptions,
    onMessage: (message) => {
      switch (message.type) {
        case 'new_order':
          onNewOrder?.(message.order);
          break;
        case 'order_ready':
          onOrderReady?.(message.order_id);
          break;
        case 'order_status_changed':
          onOrderStatusChanged?.(message.order_id, message.new_status, message.order, message.session_id);
          break;
        case 'staff_call_acknowledged':
          onStaffCallAcknowledged?.();
          break;
        case 'session_ended':
          onSessionEnded?.(message.session);
          break;
        case 'group_cart_item_added':
        case 'group_cart_item_updated':
        case 'group_cart_item_removed':
        case 'group_cart_cleared':
          onGroupCartUpdated?.(message.group_id);
          break;
      }
    },
  });
}

/**
 * Hook for admin dashboard WebSocket
 */
export function useAdminWebSocket(options: Omit<UseWebSocketOptions, 'onMessage'> & {
  onNewOrder?: (tableId: number, order: any) => void;
  onOrderReady?: (tableId: number, orderId: number) => void;
  onSessionStarted?: (tableId: number, session: any) => void;
  onSessionEnded?: (tableId: number, session: any) => void;
  onCapacityUpdate?: (capacity: any) => void;
  onStaffCall?: (tableId: number, reason?: string) => void;
} = {}) {
  const {
    onNewOrder,
    onOrderReady,
    onSessionStarted,
    onSessionEnded,
    onCapacityUpdate,
    onStaffCall,
    ...restOptions
  } = options;

  return useWebSocket('/ws/admin', {
    ...restOptions,
    onMessage: (message) => {
      switch (message.type) {
        case 'new_order':
          onNewOrder?.(message.table_id, message.order);
          break;
        case 'order_ready':
          onOrderReady?.(message.table_id, message.order_id);
          break;
        case 'session_started':
          onSessionStarted?.(message.table_id, message.session);
          break;
        case 'session_ended':
          onSessionEnded?.(message.table_id, message.session);
          break;
        case 'capacity_update':
          onCapacityUpdate?.(message.capacity);
          break;
        case 'staff_call':
          onStaffCall?.(message.table_id, message.reason);
          break;
      }
    },
  });
}

/**
 * Hook for kitchen display WebSocket
 */
export function useKitchenWebSocket(options: UseWebSocketOptions & {
  onNewOrder?: (tableId: number, order: any) => void;
  onOrderStatusChanged?: (tableId: number, orderId: number, oldStatus: string, newStatus: string) => void;
} = {}) {
  const {
    onNewOrder,
    onOrderStatusChanged,
    ...restOptions
  } = options;

  return useWebSocket('/ws/kitchen', {
    ...restOptions,
    onMessage: (message) => {
      switch (message.type) {
        case 'new_order':
          onNewOrder?.(message.table_id, message.order);
          break;
        case 'order_status_changed':
          onOrderStatusChanged?.(message.table_id, message.order_id, message.old_status, message.new_status);
          break;
      }
    },
  });
}
