import { useState, useCallback, useRef } from 'react';
import { initSocket, sendChatMessage } from '../services/socketService';
import { toNumericId, generateClientMessageId } from '../utils/socketUtils';

interface ComposeMessageOptions {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

interface SendComposedMessagePayload {
    assignmentId: number;
    recipientIds: number[]; // Có thể là 1 hoặc nhiều
    message: string;
    messageType: 'one-to-one' | 'group';
    courseId?: number;
}

/**
 * Custom hook để xử lý Compose Message qua Socket
 * Tương thích với backend guide
 */
export const useComposeMessage = (role: 'lecturer' | 'student', options?: ComposeMessageOptions) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketInitializedRef = useRef(false);
    const sendTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    /**
     * Khởi tạo socket nếu chưa
     */
    const ensureSocketInitialized = useCallback(() => {
        if (!socketInitializedRef.current) {
            try {
                initSocket(role);
                socketInitializedRef.current = true;
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to initialize socket';
                setError(errorMsg);
                if (options?.onError) {
                    options.onError(errorMsg);
                }
                throw err;
            }
        }
    }, [role, options]);

    /**
     * Gửi tin nhắn đơn (one-to-one hoặc group)
     * Implement retry logic cho rate limiting
     */
    const sendMessage = useCallback(
        async (payload: SendComposedMessagePayload, retryCount = 0): Promise<boolean> => {
            const MAX_RETRIES = 2;
            const RETRY_DELAY = 350; // 300ms + buffer

            return new Promise((resolve) => {
                try {
                    ensureSocketInitialized();
                    setIsLoading(true);
                    setError(null);

                    const recipientIds = payload.recipientIds;
                    let completedCount = 0;
                    let errorCount = 0;

                    const onSendComplete = (recipientId: number, success: boolean) => {
                        if (success) {
                            completedCount++;
                        } else {
                            errorCount++;
                        }

                        // Nếu đã gửi tất cả
                        if (completedCount + errorCount === recipientIds.length) {
                            setIsLoading(false);

                            if (errorCount === 0) {
                                // Tất cả gửi thành công
                                setError(null);
                                if (options?.onSuccess) {
                                    options.onSuccess();
                                }
                                resolve(true);
                            } else if (completedCount > 0) {
                                // Một số thành công, một số thất bại
                                const errorMsg = `Sent to ${completedCount}/${recipientIds.length} recipients`;
                                setError(errorMsg);
                                if (options?.onError) {
                                    options.onError(errorMsg);
                                }
                                resolve(true); // Vẫn coi là thành công (partial)
                            } else {
                                // Tất cả thất bại
                                const errorMsg = 'Failed to send message to any recipient';
                                setError(errorMsg);
                                if (options?.onError) {
                                    options.onError(errorMsg);
                                }
                                resolve(false);
                            }
                        }
                    };

                    // Gửi tin nhắn tới từng recipient
                    recipientIds.forEach((recipientId, index) => {
                        // Delay để tránh rate limiting (300ms)
                        const delayMs = index * 350;

                        // Tự động xác định course_id dựa vào role nếu không được truyền trực tiếp
                        const courseId = payload.courseId ?? (role === 'lecturer' ? payload.assignmentId : recipientId);

                        const timeoutId = setTimeout(() => {
                            sendChatMessage(
                                {
                                    course_id: courseId,
                                    assignment_id: payload.assignmentId,
                                    other_user_id: recipientId,
                                    message: payload.message,
                                    client_message_id: generateClientMessageId(),
                                },
                                (response) => {
                                    if (response?.ok) {
                                        onSendComplete(recipientId, true);
                                    } else {
                                        // Xử lý rate limit error
                                        if (
                                            response?.error?.includes('Too many requests') ||
                                            response?.error?.includes('300ms')
                                        ) {
                                            // Retry nếu chưa vượt max retries
                                            if (retryCount < MAX_RETRIES) {
                                                console.warn(
                                                    `Rate limited for recipient ${recipientId}, retrying...`,
                                                );
                                                setTimeout(() => {
                                                    sendMessage(
                                                        {
                                                            ...payload,
                                                            recipientIds: [recipientId],
                                                        },
                                                        retryCount + 1,
                                                    ).then(resolve);
                                                }, RETRY_DELAY);
                                            } else {
                                                onSendComplete(recipientId, false);
                                            }
                                        } else {
                                            console.error(`Error sending to ${recipientId}:`, response?.error);
                                            onSendComplete(recipientId, false);
                                        }
                                    }
                                },
                            );

                            sendTimeoutsRef.current?.set(recipientId, timeoutId);
                        }, delayMs);
                    });
                } catch (err) {
                    setIsLoading(false);
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                    setError(errorMsg);
                    if (options?.onError) {
                        options.onError(errorMsg);
                    }
                    resolve(false);
                }
            });
        },
        [ensureSocketInitialized, options],
    );

    /**
     * Helper để gửi tin nhắn one-to-one
     */
    const sendOneToOne = useCallback(
        (assignmentId: number | string, recipientId: number | string, message: string) => {
            const numAssignmentId = typeof assignmentId === 'string' ? Number(assignmentId) : assignmentId;
            const numRecipientId =
                typeof recipientId === 'string' ? Number(recipientId) : recipientId;

            if (!numAssignmentId || !numRecipientId) {
                const errorMsg = 'Invalid assignment or recipient ID';
                setError(errorMsg);
                if (options?.onError) {
                    options.onError(errorMsg);
                }
                return Promise.resolve(false);
            }

            // Đối với student, recipientId chính là courseId.
            // Đối với lecturer, assignmentId chính là courseId.
            const courseId = role === 'lecturer' ? numAssignmentId : numRecipientId;

            return sendMessage({
                courseId,
                assignmentId: numAssignmentId,
                recipientIds: [numRecipientId],
                message,
                messageType: 'one-to-one',
            });
        },
        [sendMessage, role, options],
    );

    /**
     * Helper để gửi tin nhắn group
     */
    const sendGroup = useCallback(
        (assignmentId: number | string, recipientIds: (number | string)[], message: string) => {
            const numAssignmentId = typeof assignmentId === 'string' ? Number(assignmentId) : assignmentId;
            const numRecipientIds = recipientIds.map((id) => (typeof id === 'string' ? Number(id) : id));

            if (!numAssignmentId || numRecipientIds.length === 0) {
                const errorMsg = 'Invalid assignment or recipients';
                setError(errorMsg);
                if (options?.onError) {
                    options.onError(errorMsg);
                }
                return Promise.resolve(false);
            }

            // Đối với lecturer gửi tin nhắn nhóm, assignmentId chính là courseId.
            const courseId = role === 'lecturer' ? numAssignmentId : undefined;

            return sendMessage({
                courseId,
                assignmentId: numAssignmentId,
                recipientIds: numRecipientIds,
                message,
                messageType: 'group',
            });
        },
        [sendMessage, role, options],
    );

    /**
     * Dọn dẹp (cancel) các send pending
     */
    const cancelPendingRequests = useCallback(() => {
        sendTimeoutsRef.current?.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        sendTimeoutsRef.current?.clear();
        setIsLoading(false);
    }, []);

    return {
        isLoading,
        error,
        sendMessage,
        sendOneToOne,
        sendGroup,
        cancelPendingRequests,
    };
};
