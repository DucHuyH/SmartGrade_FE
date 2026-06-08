import { io, Socket } from 'socket.io-client'
import { API_BASE_URL } from '../../constants'
import { LECTURER_STORAGE_KEYS, STUDENT_STORAGE_KEYS } from '../../constants'

let socket: Socket | null = null

// Socket event types
export const SOCKET_EVENTS = {
  GRADING_STATUS: 'grading:status',
  GRADING_RESULT: 'grading:result',
  GRADING_ERROR: 'grading:error',
  JOIN_COURSE: 'join:course',
  LEAVE_COURSE: 'leave:course',
  JOIN_CHAT: 'chat:join',
  CHAT_JOINED: 'chat:joined',
  LEAVE_CHAT: 'chat:leave',
  SEND_CHAT_MESSAGE: 'chat:send',
  RECEIVE_CHAT_MESSAGE: 'chat:message',
  MARK_CHAT_SEEN: 'chat:seen',
  CHAT_SEEN_UPDATED: 'chat:seen:updated',
  CONVERSATION_UPDATED: 'chat:conversation:updated'
}

export interface GradingStatusPayload {
  total: number
  completed: number
  failed: number
  inProgress: boolean
  currentSubmissionId?: string
}

export interface GradingResultPayload {
  submission_id: string
  score: number
  feedback: string
  status: string
}

export interface GradingErrorPayload {
  submission_id: string
  error: string
}

export interface ChatParticipantPayload {
  user_id?: number | string
  name?: string
  email?: string
  role?: string
}

export interface JoinChatPayload {
  course_id: number | string
  other_user_id: number | string
}

export interface SendChatMessagePayload extends JoinChatPayload {
  message: string
  client_message_id?: string
  assignment_id?: number | string
}

export interface ChatMessagePayload {
  chat_id: number | string
  assignment_id: number | string
  sender_id: number | string
  receiver_id: number | string
  message: string
  is_read: boolean
  created_at: string
  client_message_id?: string | null
  sender?: ChatParticipantPayload
  receiver?: ChatParticipantPayload
}

export interface ChatSeenPayload {
  assignment_id: number | string
  reader_id: number | string
  other_user_id: number | string
  updated_count: number
}

export interface ConversationUpdatedPayload {
  other_user_id: number | string
  last_message?: string
  last_message_time?: string
  last_message_is_read?: boolean
  unread_count?: number
  // Optional: User info for lazy-loaded conversations
  other_user_name?: string
  other_user_email?: string
  other_user_code?: string
  other_user_role?: string
}

// Get the backend URL from API_BASE_URL
// API_BASE_URL format: 'https://smartgrade-be.onrender.com/api/v1'
// We need: 'https://smartgrade-be.onrender.com'
const getSocketServerUrl = (): string => {
  if (API_BASE_URL.includes('/api/')) {
    return API_BASE_URL.split('/api/')[0]
  }
  return API_BASE_URL
}

export const initSocket = (role: 'lecturer' | 'student' = 'lecturer'): Socket => {
  if (socket && socket.connected) {
    return socket
  }

  // Get token from session storage
  const storageKeys = role === 'lecturer' ? LECTURER_STORAGE_KEYS : STUDENT_STORAGE_KEYS
  const token = sessionStorage.getItem(storageKeys.TOKEN)

  const serverUrl = getSocketServerUrl()

  socket = io(serverUrl, {
    auth: {
      token: token || ''
    },
    // Ensure credentials (cookies) are sent for servers using cookie-based auth
    withCredentials: true,
    // Force WebSocket transport to avoid CORS issues with HTTP polling
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id)
  })

  socket.on('connect_error', (error: Error) => {
    console.error('Socket connection error:', error)
  })

  socket.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', reason)
  })

  return socket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const joinCourse = (courseId: string): void => {
  if (socket && socket.connected) {
    socket.emit(SOCKET_EVENTS.JOIN_COURSE, courseId)
  }
}

export const leaveCourse = (courseId: string): void => {
  if (socket && socket.connected) {
    socket.emit(SOCKET_EVENTS.LEAVE_COURSE, courseId)
  }
}

export const joinChat = (payload: JoinChatPayload, ack?: (response: unknown) => void): void => {
  if (socket && socket.connected) {
    socket.emit(SOCKET_EVENTS.JOIN_CHAT, payload, ack)
  }
}

export const leaveChat = (payload: JoinChatPayload, ack?: (response: unknown) => void): void => {
  if (socket && socket.connected) {
    console.log('Emitting leaveChat with payload:', payload)
    socket.emit(SOCKET_EVENTS.LEAVE_CHAT, payload, ack)
  }
}

export const sendChatMessage = (
  payload: SendChatMessagePayload,
  ack?: (response: { ok?: boolean; data?: ChatMessagePayload; error?: string }) => void
): void => {
  console.log('Emitting sendChatMessage with payload:', payload)
  if (socket && socket.connected) {
    socket.emit(SOCKET_EVENTS.SEND_CHAT_MESSAGE, payload, ack)
  }
}

export const markChatSeen = (
  payload: JoinChatPayload,
  ack?: (response: { ok?: boolean; data?: ChatSeenPayload; error?: string }) => void
): void => {
  if (socket && socket.connected) {
    socket.emit(SOCKET_EVENTS.MARK_CHAT_SEEN, payload, ack)
  }
}

export const onGradingStatus = (callback: (payload: GradingStatusPayload) => void): (() => void) => {
  if (!socket) {
    return () => {}
  }

  socket.on(SOCKET_EVENTS.GRADING_STATUS, callback)

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off(SOCKET_EVENTS.GRADING_STATUS, callback)
    }
  }
}

export const onGradingResult = (callback: (payload: GradingResultPayload) => void): (() => void) => {
  if (!socket) {
    return () => {}
  }

  socket.on(SOCKET_EVENTS.GRADING_RESULT, callback)

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off(SOCKET_EVENTS.GRADING_RESULT, callback)
    }
  }
}

export const onGradingError = (callback: (payload: GradingErrorPayload) => void): (() => void) => {
  if (!socket) {
    return () => {}
  }

  socket.on(SOCKET_EVENTS.GRADING_ERROR, callback)

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off(SOCKET_EVENTS.GRADING_ERROR, callback)
    }
  }
}

export const onChatMessage = (callback: (payload: ChatMessagePayload) => void): (() => void) => {
  if (!socket) {
    return () => {}
  }

  socket.on(SOCKET_EVENTS.RECEIVE_CHAT_MESSAGE, callback)

  return () => {
    if (socket) {
      socket.off(SOCKET_EVENTS.RECEIVE_CHAT_MESSAGE, callback)
    }
  }
}

export const onChatJoined = (
  callback: (payload: { room: string; assignment_id: number | string; other_user_id: number | string }) => void
): (() => void) => {
  if (!socket) {
    return () => {}
  }

  socket.on(SOCKET_EVENTS.CHAT_JOINED, callback)

  return () => {
    if (socket) {
      socket.off(SOCKET_EVENTS.CHAT_JOINED, callback)
    }
  }
}

export const onChatSeenUpdated = (callback: (payload: ChatSeenPayload) => void): (() => void) => {
  if (!socket) {
    return () => {}
  }

  socket.on(SOCKET_EVENTS.CHAT_SEEN_UPDATED, callback)

  return () => {
    if (socket) {
      socket.off(SOCKET_EVENTS.CHAT_SEEN_UPDATED, callback)
    }
  }
}

export const onConversationUpdated = (callback: (payload: ConversationUpdatedPayload) => void): (() => void) => {
  if (!socket) {
    return () => {}
  }

  socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, callback)

  return () => {
    if (socket) {
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, callback)
    }
  }
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  joinCourse,
  leaveCourse,
  joinChat,
  leaveChat,
  sendChatMessage,
  markChatSeen,
  onGradingStatus,
  onGradingResult,
  onGradingError,
  onChatMessage,
  onChatJoined,
  onChatSeenUpdated,
  onConversationUpdated,
  SOCKET_EVENTS
}
