import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../constants';
import { LECTURER_STORAGE_KEYS, STUDENT_STORAGE_KEYS } from '../../constants';

let socket: Socket | null = null;

// Socket event types
export const SOCKET_EVENTS = {
    GRADING_STATUS: 'grading:status',
    GRADING_RESULT: 'grading:result',
    GRADING_ERROR: 'grading:error',
    JOIN_COURSE: 'join:course',
    LEAVE_COURSE: 'leave:course',
    RECEIVE_CHAT_MESSAGE: 'chat:message',
};

export interface GradingStatusPayload {
    total: number;
    completed: number;
    failed: number;
    inProgress: boolean;
    currentSubmissionId?: string;
}

export interface GradingResultPayload {
    submission_id: string;
    score: number;
    feedback: string;
    status: string;
}

export interface GradingErrorPayload {
    submission_id: string;
    error: string;
}

// Get the backend URL from API_BASE_URL
// API_BASE_URL format: 'https://smartgrade-be.onrender.com/api/v1'
// We need: 'https://smartgrade-be.onrender.com'
const getSocketServerUrl = (): string => {
    if (API_BASE_URL.includes('/api/')) {
        return API_BASE_URL.split('/api/')[0];
    }
    return API_BASE_URL;
};

export const initSocket = (role: 'lecturer' | 'student' = 'lecturer'): Socket => {
    if (socket && socket.connected) {
        return socket;
    }

    // Get token from session storage
    const storageKeys = role === 'lecturer' ? LECTURER_STORAGE_KEYS : STUDENT_STORAGE_KEYS;
    const token = sessionStorage.getItem(storageKeys.TOKEN);

    const serverUrl = getSocketServerUrl();

    socket = io(serverUrl, {
        auth: {
            token: token || '',
        },
        // Force WebSocket transport to avoid CORS issues with HTTP polling
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket?.id);
    });

    socket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason: string) => {
        console.log('Socket disconnected:', reason);
    });

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const joinCourse = (courseId: string): void => {
    if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.JOIN_COURSE, courseId);
    }
};

export const leaveCourse = (courseId: string): void => {
    if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.LEAVE_COURSE, courseId);
    }
};

export const onGradingStatus = (callback: (payload: GradingStatusPayload) => void): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on(SOCKET_EVENTS.GRADING_STATUS, callback);

    // Return unsubscribe function
    return () => {
        if (socket) {
            socket.off(SOCKET_EVENTS.GRADING_STATUS, callback);
        }
    };
};

export const onGradingResult = (callback: (payload: GradingResultPayload) => void): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on(SOCKET_EVENTS.GRADING_RESULT, callback);

    // Return unsubscribe function
    return () => {
        if (socket) {
            socket.off(SOCKET_EVENTS.GRADING_RESULT, callback);
        }
    };
};

export const onGradingError = (callback: (payload: GradingErrorPayload) => void): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on(SOCKET_EVENTS.GRADING_ERROR, callback);

    // Return unsubscribe function
    return () => {
        if (socket) {
            socket.off(SOCKET_EVENTS.GRADING_ERROR, callback);
        }
    };
};

export default {
    initSocket,
    getSocket,
    disconnectSocket,
    joinCourse,
    leaveCourse,
    onGradingStatus,
    onGradingResult,
    onGradingError,
    SOCKET_EVENTS,
};
