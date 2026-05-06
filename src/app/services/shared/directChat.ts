import type { AxiosInstance } from 'axios'

export type ChatRole = 'lecturer' | 'student'

export interface ChatParticipant {
    user_id?: number | string
    name?: string
    email?: string
    role?: string
}

export interface ChatApiMessage {
    chat_id?: number | string
    assignment_id?: number | string
    sender_id?: number | string
    receiver_id?: number | string
    message?: string
    is_read?: boolean
    created_at?: string
    deletedAt?: string | null
    sender?: ChatParticipant
    receiver?: ChatParticipant
    client_message_id?: string | null
}

export interface DirectChatMessage {
    id: string
    chatId: number | string | null
    assignmentId: number | string | null
    senderId: number | null
    receiverId: number | null
    content: string
    isRead: boolean
    createdAt: string
    deletedAt: string | null
    sender?: ChatParticipant
    receiver?: ChatParticipant
    isFromReceiverUser: boolean
}

export interface DirectChatThread {
    messages: DirectChatMessage[]
    peerUserId: number | null
    peerName: string
    peerEmail: string
    peerRole: ChatRole | string | null
}

export interface ChatConversationApiParticipant extends ChatParticipant {
    user_code?: string
}

export interface ChatConversationApiItem {
    course_id?: number | string
    other_user?: ChatConversationApiParticipant
    last_message?: ChatApiMessage | null
    unread_count?: number | string
    unreadCount?: number | string
}

export interface ChatConversationSummary {
    courseId: number | string | null
    otherUserId: number | null
    otherUserName: string
    otherUserEmail: string
    otherUserCode: string
    otherUserRole: ChatRole | string | null
    lastMessage: string
    lastMessageTime: string
    unreadCount: number
    lastMessageIsRead: boolean
}

const toNumber = (value: unknown): number | null => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

const unwrapArrayPayload = (payload: unknown): unknown[] => {
    let current: any = payload

    while (current && typeof current === 'object' && !Array.isArray(current)) {
        if (Array.isArray(current.data)) {
            return current.data
        }

        if (Array.isArray(current.items)) {
            return current.items
        }

        if (current.data && typeof current.data === 'object') {
            current = current.data
            continue
        }

        break
    }

    return Array.isArray(current) ? current : []
}

const normalizeMessage = (raw: any, currentUserId: number): DirectChatMessage | null => {
    const senderId = toNumber(raw?.sender_id)
    const receiverId = toNumber(raw?.receiver_id)
    const assignmentId = raw?.assignment_id ?? null

    if (!raw || typeof raw !== 'object') {
        return null
    }

    return {
        id: String(raw?.chat_id ?? raw?.id ?? `${assignmentId ?? 'chat'}-${raw?.created_at ?? Date.now()}`),
        chatId: raw?.chat_id ?? raw?.id ?? null,
        assignmentId,
        senderId,
        receiverId,
        content: String(raw?.message ?? ''),
        isRead: Boolean(raw?.is_read),
        createdAt: typeof raw?.created_at === 'string' ? raw.created_at : '',
        deletedAt: typeof raw?.deletedAt === 'string' ? raw.deletedAt : null,
        sender: raw?.sender,
        receiver: raw?.receiver,
        isFromReceiverUser: receiverId === currentUserId,
    }
}

const resolvePeer = (messages: DirectChatMessage[], currentUserId: number) => {
    for (const message of messages) {
        const senderId = message.senderId
        const receiverId = message.receiverId

        if (senderId === currentUserId && receiverId && receiverId !== currentUserId) {
            return {
                peerUserId: receiverId,
                peerName: message.receiver?.name ?? '',
                peerEmail: message.receiver?.email ?? '',
                peerRole: message.receiver?.role ?? null,
            }
        }

        if (receiverId === currentUserId && senderId && senderId !== currentUserId) {
            return {
                peerUserId: senderId,
                peerName: message.sender?.name ?? '',
                peerEmail: message.sender?.email ?? '',
                peerRole: message.sender?.role ?? null,
            }
        }
    }

    return {
        peerUserId: null,
        peerName: '',
        peerEmail: '',
        peerRole: null,
    }
}

const normalizeConversation = (
    raw: any,
    currentUserId: number,
): ChatConversationSummary | null => {
    if (!raw || typeof raw !== 'object') {
        return null
    }

    const otherUser = raw.other_user ?? raw.otherUser ?? {}
    const otherUserId = toNumber(otherUser.user_id ?? otherUser.id)
    const lastMessageRaw = raw.last_message ?? raw.lastMessage ?? null
    const lastMessage = lastMessageRaw ? normalizeMessage(lastMessageRaw, currentUserId) : null
    const rawUnreadCount = raw.unread_count ?? raw.unreadCount
    const unreadCount = Number(rawUnreadCount)

    return {
        courseId: raw.course_id ?? raw.courseId ?? null,
        otherUserId,
        otherUserName: String(otherUser.name ?? otherUser.full_name ?? 'Unknown User'),
        otherUserEmail: String(otherUser.email ?? ''),
        otherUserCode: String(otherUser.user_code ?? otherUser.userCode ?? ''),
        otherUserRole: otherUser.role ?? null,
        lastMessage: lastMessage?.content ?? '',
        lastMessageTime: lastMessage?.createdAt ?? '',
        unreadCount: Number.isFinite(unreadCount) ? unreadCount : 0,
        lastMessageIsRead: lastMessage?.isRead ?? false,
    }
}

export const fetchDirectChatThread = async (
    axiosInstance: AxiosInstance,
    courseId: string | number,
    currentUserId: string | number,
): Promise<DirectChatThread> => {

    const numericUserId = toNumber(currentUserId)
    console.log('Fetching direct chat thread for course:', courseId, 'and user ID:', numericUserId);

    if (numericUserId === null) {
        throw new Error('Invalid current user id for direct chat')
    }

    const response = await axiosInstance.get('/chat/messages', {
        params: {
            course_id: courseId,
            user_id: numericUserId,
        },
    })

    const payloadMessages = unwrapArrayPayload(response.data)
    const messages = payloadMessages
        .map((item) => normalizeMessage(item, numericUserId))
        .filter((item): item is DirectChatMessage => item !== null)
        .sort((left, right) => {
            const leftTime = new Date(left.createdAt).getTime()
            const rightTime = new Date(right.createdAt).getTime()

            if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0
            if (Number.isNaN(leftTime)) return 1
            if (Number.isNaN(rightTime)) return -1
            return leftTime - rightTime
        })

    const peer = resolvePeer(messages, numericUserId)

    return {
        messages,
        ...peer,
    }
}

export const fetchChatConversations = async (
    axiosInstance: AxiosInstance,
    courseId: string | number,
    currentUserId: string | number,
): Promise<ChatConversationSummary[]> => {
    const numericUserId = toNumber(currentUserId)

    if (numericUserId === null) {
        throw new Error('Invalid current user id for conversation list')
    }

    const response = await axiosInstance.get('/chat/conversations', {
        params: {
            course_id: courseId,
            user_id: numericUserId,
        },
    })

    const payloadItems = unwrapArrayPayload(response.data)

    return payloadItems
        .map((item) => normalizeConversation(item, numericUserId))
        .filter((item): item is ChatConversationSummary => item !== null)
        .sort((left, right) => {
            const leftTime = new Date(left.lastMessageTime || '').getTime()
            const rightTime = new Date(right.lastMessageTime || '').getTime()

            if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0
            if (Number.isNaN(leftTime)) return 1
            if (Number.isNaN(rightTime)) return -1
            return rightTime - leftTime
        })
}

export const formatChatTimestamp = (value: string): string => {
    if (!value) {
        return ''
    }

    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(parsedDate)
}
