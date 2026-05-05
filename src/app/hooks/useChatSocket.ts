import { useEffect, useState, useRef, useCallback } from 'react';
import {
    initSocket,
    joinChat,
    leaveChat,
    sendChatMessage,
    markChatSeen,
    onChatMessage,
    ChatMessagePayload,
    JoinChatPayload,
} from '../services/socketService';
import { toNumericId } from '../utils/socketUtils';

export interface UseChatSocketOptions {
    courseId: string | number | undefined;
    otherUserId: string | number | undefined;
    role: 'lecturer' | 'student';
    autoJoin?: boolean;
}

export interface UseChatSocketReturn {
    messages: ChatMessagePayload[];
    setMessages: (messages: ChatMessagePayload[]) => void;
    sendMessage: (text: string) => void;
    markAsRead: () => void;
    loading: boolean;
    error: string | null;
    isConnected: boolean;
}

/**
 * Custom hook để quản lý Socket.IO chat
 * Tự động khởi tạo socket, join room, lắng nghe message, và xử lý cleanup
 */
export const useChatSocket = ({
    courseId,
    otherUserId,
    role,
    autoJoin = true,
}: UseChatSocketOptions): UseChatSocketReturn => {
    const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const socketRef = useRef<ReturnType<typeof initSocket> | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const joinedRef = useRef(false);
    const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevConversationRef = useRef<{ courseId: number | null; otherUserId: number | null }>({
        courseId: null,
        otherUserId: null,
    });
    // Store event handlers to clean them up later
    const eventHandlersRef = useRef<{
        onConnect: (() => void) | null;
        onDisconnect: ((reason: string) => void) | null;
        onConnectError: ((error: Error) => void) | null;
    }>({
        onConnect: null,
        onDisconnect: null,
        onConnectError: null,
    });

    // Validate parameters
    const numCourseId = toNumericId(courseId);
    const numOtherUserId = toNumericId(otherUserId);

    // ✅ FIX 1: Handle conversation change - leave old room and clear messages
    useEffect(() => {
        const prevCourseId = prevConversationRef.current.courseId;
        const prevOtherUserId = prevConversationRef.current.otherUserId;

        // If conversation changed from a valid one to another
        if (prevCourseId !== null && prevOtherUserId !== null) {
            if (
                prevCourseId !== numCourseId ||
                prevOtherUserId !== numOtherUserId
            ) {
                console.log(
                    'Conversation changed, leaving old room:',
                    prevCourseId,
                    prevOtherUserId
                );

                // Clear send timeout if pending
                if (sendTimeoutRef.current) {
                    clearTimeout(sendTimeoutRef.current);
                    sendTimeoutRef.current = null;
                }

                // Leave old room - emit immediately without waiting for callback
                if (socketRef.current?.connected) {
                    console.log('Emitting leave for old room immediately');
                    leaveChat({
                        course_id: prevCourseId,
                        other_user_id: prevOtherUserId,
                    });
                }

                // Reset joined state immediately so init effect can join new room
                joinedRef.current = false;

                // Clear messages and state from old conversation
                setMessages([]);
                setError(null);
                setLoading(false);
            }
        }

        // Update previous conversation
        prevConversationRef.current = {
            courseId: numCourseId,
            otherUserId: numOtherUserId,
        };
    }, [numCourseId, numOtherUserId]);

    // Initialize socket and join chat
    useEffect(() => {
        if (!numCourseId || !numOtherUserId) {
            setError('Invalid course or user ID');
            return;
        }

        const initializeChat = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Initialize socket
                socketRef.current = initSocket(role);

                // Setup connection listeners
                const onConnect = () => {
                    console.log('Socket connected:', socketRef.current?.id);
                    console.log('Current room:', numCourseId, numOtherUserId, 'joinedRef:', joinedRef.current);
                    setIsConnected(true);

                    // Only join if we have valid IDs and haven't joined yet
                    if (numCourseId && numOtherUserId && autoJoin && !joinedRef.current) {
                        console.log('Attempting to join chat room:', numCourseId, numOtherUserId);
                        // 2. Join chat room
                        joinChat(
                            {
                                course_id: numCourseId,
                                other_user_id: numOtherUserId,
                            },
                            (response: unknown) => {
                                const typedResponse = response as {
                                    ok?: boolean;
                                    data?: { room?: string };
                                    error?: string;
                                };
                                console.log('Join chat response:', typedResponse);
                                if (typedResponse?.ok) {
                                    console.log('Joined chat room:', typedResponse?.data?.room);
                                    joinedRef.current = true;
                                    setLoading(false);
                                    setError(null);
                                } else {
                                    const errorMsg = typedResponse?.error || 'Failed to join chat';
                                    console.error('Join chat error:', errorMsg);
                                    setError(errorMsg);
                                    setLoading(false);
                                }
                            }
                        );
                    } else if (!autoJoin) {
                        setLoading(false);
                    }
                };

                const onDisconnect = (reason: string) => {
                    console.log('Socket disconnected:', reason);
                    setIsConnected(false);
                    joinedRef.current = false;
                };

                const onConnectError = (connectError: Error) => {
                    console.error('Socket connection error:', connectError);
                    setError('Connection error: ' + connectError.message);
                    setLoading(false);
                };

                // Store handlers for cleanup
                eventHandlersRef.current = {
                    onConnect,
                    onDisconnect,
                    onConnectError,
                };

                socketRef.current.on('connect', onConnect);
                socketRef.current.on('disconnect', onDisconnect);
                socketRef.current.on('connect_error', onConnectError);

                // 3. Listen for new messages
                unsubscribeRef.current = onChatMessage((newMessage: ChatMessagePayload) => {
                    console.log('Received new message:', newMessage);
                    setMessages((prev) => [...prev, newMessage]);
                });

            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to initialize chat';
                console.error('Chat initialization error:', errorMsg);
                setError(errorMsg);
                setLoading(false);
            }
        };

        initializeChat();

        // Cleanup: Leave current room when effect unmounts
        return () => {
            console.log('Cleanup: Leaving chat room');
            // Clear send timeout if pending
            if (sendTimeoutRef.current) {
                clearTimeout(sendTimeoutRef.current);
                sendTimeoutRef.current = null;
                console.log('Cleared send timeout');
            }

            // Unsubscribe from message listener FIRST to prevent new messages during cleanup
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
                console.log('Unsubscribed from chat messages');
            }

            // Remove socket event listeners to prevent memory leaks
            if (socketRef.current) {
                const handlers = eventHandlersRef.current;
                if (handlers.onConnect) {
                    socketRef.current.off('connect', handlers.onConnect);
                    console.log('Removed connect listener');
                }
                if (handlers.onDisconnect) {
                    socketRef.current.off('disconnect', handlers.onDisconnect);
                    console.log('Removed disconnect listener');
                }
                if (handlers.onConnectError) {
                    socketRef.current.off('connect_error', handlers.onConnectError);
                    console.log('Removed connect_error listener');
                }
            }

            // Leave chat room when effect unmounts
            if (socketRef.current && socketRef.current.connected && joinedRef.current) {
                console.log('Emitting chat:leave event');
                leaveChat(
                    {
                        course_id: numCourseId,
                        other_user_id: numOtherUserId,
                    },
                    (response: unknown) => {
                        console.log('Left chat room response:', response);
                    }
                );
                joinedRef.current = false;
            }

            // Note: We do NOT disconnect socket here because it may be used by other components
            console.log('Chat cleanup complete');
        };
    }, [numCourseId, numOtherUserId, role, autoJoin]);

    // ✅ FIX 6: Separate effect to join room after socket connects and conversation is ready
    useEffect(() => {
        if (!numCourseId || !numOtherUserId || !autoJoin) {
            return;
        }

        // Small delay to ensure conversation change effect has completed
        const timeout = setTimeout(() => {
            console.log('Join effect: Checking if should join room');
            console.log('Socket connected:', socketRef.current?.connected);
            console.log('Already joined:', joinedRef.current);
            console.log('Room:', numCourseId, numOtherUserId);

            // If socket exists, is connected, but not joined yet, join now
            if (
                socketRef.current?.connected &&
                !joinedRef.current
            ) {
                console.log('Join effect: Joining room now');
                joinChat(
                    {
                        course_id: numCourseId,
                        other_user_id: numOtherUserId,
                    },
                    (response: unknown) => {
                        const typedResponse = response as {
                            ok?: boolean;
                            data?: { room?: string };
                            error?: string;
                        };
                        console.log('Join effect: Join response:', typedResponse);
                        if (typedResponse?.ok) {
                            joinedRef.current = true;
                            setError(null);
                        } else {
                            const errorMsg = typedResponse?.error || 'Failed to join chat';
                            console.error('Join effect: Join error:', errorMsg);
                            setError(errorMsg);
                        }
                        setLoading(false);
                    }
                );
            }
        }, 100);

        return () => clearTimeout(timeout);
    }, [numCourseId, numOtherUserId, autoJoin]);

    // Send message function
    const sendMessage = useCallback(
        (text: string) => {
            if (!text.trim() || !numCourseId || !numOtherUserId) {
                return;
            }

            if (!socketRef.current?.connected) {
                console.error('Socket not connected. Status:', socketRef.current?.connected);
                setError('Socket connection lost. Please try again.');
                return;
            }

            if (!joinedRef.current) {
                console.error('Not joined to chat room yet. joinedRef:', joinedRef.current);
                setError('Not connected to chat room. Please wait...');
                return;
            }

            // Set loading state
            setLoading(true);
            setError(null);

            // Clear any existing timeout
            if (sendTimeoutRef.current) {
                clearTimeout(sendTimeoutRef.current);
            }

            console.log('Sending message with course_id:', numCourseId, 'other_user_id:', numOtherUserId);

            // Set timeout to clear loading state if no response within 20 seconds
            sendTimeoutRef.current = setTimeout(() => {
                console.warn('Message send timeout - clearing loading state');
                setError('Message send timeout. Please try again.');
                setLoading(false);
                sendTimeoutRef.current = null;
            }, 20000);

            sendChatMessage(
                {
                    course_id: numCourseId,
                    other_user_id: numOtherUserId,
                    message: text,
                },
                (response: unknown) => {
                    // Clear the timeout since we got a response
                    if (sendTimeoutRef.current) {
                        clearTimeout(sendTimeoutRef.current);
                        sendTimeoutRef.current = null;
                    }

                    const typedResponse = response as {
                        ok?: boolean;
                        data?: ChatMessagePayload;
                        error?: string;
                    };
                    if (!typedResponse?.ok) {
                        console.error('Error sending message:', typedResponse?.error);
                        setError(typedResponse?.error || 'Failed to send message');
                    } else {
                        console.log('Message sent successfully:', typedResponse?.data);
                    }
                    // Always clear loading state when response is received
                    setLoading(false);
                }
            );
        },
        [numCourseId, numOtherUserId]
    );

    // Mark messages as read
    const markAsRead = useCallback(() => {
        if (!numCourseId || !numOtherUserId) {
            return;
        }

        markChatSeen(
            {
                course_id: numCourseId,
                other_user_id: numOtherUserId,
            },
            (response: unknown) => {
                const typedResponse = response as {
                    ok?: boolean;
                    data?: { updated_count?: number };
                    error?: string;
                };
                if (typedResponse?.ok) {
                    console.log(
                        `Marked ${typedResponse?.data?.updated_count || 0} messages as read`
                    );
                } else {
                    console.error('Error marking as read:', typedResponse?.error);
                }
            }
        );
    }, [numCourseId, numOtherUserId]);

    return {
        messages,
        setMessages,
        sendMessage,
        markAsRead,
        loading,
        error,
        isConnected,
    };
};
