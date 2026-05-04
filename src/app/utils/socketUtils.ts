/**
 * Convert string/number/null to numeric ID
 * Backend expects numeric IDs for socket operations
 */
export const toNumericId = (value: string | number | undefined | null): number | null => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

/**
 * Generate unique client message ID for optimistic UI updates
 */
export const generateClientMessageId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate socket payload before sending
 */
export interface SocketMessagePayload {
    assignment_id: number | string;
    other_user_id: number | string;
    message: string;
    client_message_id?: string;
}

export const validateMessagePayload = (payload: SocketMessagePayload): { valid: boolean; error?: string } => {
    if (!payload.message?.trim()) {
        return { valid: false, error: 'Message cannot be empty' };
    }

    const assignmentId = toNumericId(payload.assignment_id);
    const userId = toNumericId(payload.other_user_id);

    if (!assignmentId) {
        return { valid: false, error: 'Invalid assignment ID' };
    }

    if (!userId) {
        return { valid: false, error: 'Invalid user ID' };
    }

    return { valid: true };
};
