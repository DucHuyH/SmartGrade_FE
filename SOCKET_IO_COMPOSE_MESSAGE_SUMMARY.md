# Socket.IO Compose Message - Implementation Summary

## 📋 Tài liệu & Hướng dẫn Được Tạo

Dưới đây là các tài liệu và code được tạo để hỗ trợ compose message qua Socket.IO:

### 1. **COMPOSE_MESSAGE_INTEGRATION_GUIDE.md**
   - Tổng quan về quy trình gửi tin nhắn
   - Backend events explanation
   - Xử lý lỗi & edge cases
   - Lưu ý quan trọng cho frontend
   - Files liên quan

### 2. **COMPOSE_MESSAGE_USAGE_GUIDE.md**
   - Cách sử dụng `useComposeMessage` hook
   - API reference đầy đủ
   - Xử lý rate limiting
   - Full example cho Lecturer

### 3. **LECTURER_MESSAGES_EXAMPLE.ts**
   - Ví dụ cụ thể cách integrasi
   - Code hoàn chỉnh để cập nhật LecturerMessages.tsx
   - UI patterns cho compose dialog

### 4. **Code Files (Thực thi)**

   #### **src/app/hooks/useComposeMessage.ts**
   ```
   ✅ Custom hook để xử lý compose message
   ✅ Auto socket initialization
   ✅ Rate limiting retry logic
   ✅ Group message support (N-N)
   ✅ Error handling & cleanup
   ```

   #### **src/app/utils/socketUtils.ts**
   ```
   ✅ toNumericId() - Convert string/null to number
   ✅ generateClientMessageId() - Generate unique ID
   ✅ validateMessagePayload() - Validate socket payload
   ```

## 🎯 Quy trình Tích hợp

### Bước 1: Khởi tạo Socket
```typescript
// Socket được khởi tạo tự động khi gửi tin nhắn đầu tiên
const { sendOneToOne } = useComposeMessage('lecturer');
```

### Bước 2: Gửi Tin Nhắn
```typescript
// One-to-One
await sendOneToOne(assignmentId, studentId, message);

// Group (N-N, tự động delay 350ms giữa các lần gửi)
await sendGroup(assignmentId, [studentId1, studentId2, studentId3], message);
```

### Bước 3: Lắng nghe Tin Nhắn Mới
```typescript
// Lắng nghe socket event chat:message
const unsubscribe = onChatMessage((message) => {
  setMessages(prev => [...prev, message]);
});

// Cleanup
return () => unsubscribe();
```

### Bước 4: Đánh Dấu Đã Đọc
```typescript
markChatSeen({
  assignment_id: assignmentId,
  other_user_id: recipientId,
});
```

## 📊 Tính Năng

### ✅ Đã Triển Khai

| Tính Năng | Trạng thái | Ghi Chú |
|-----------|-----------|--------|
| One-to-One Message | ✅ | Gửi tin nhắn 1-1 |
| Group Message | ✅ | Gửi 1 tin nhắn tới N sinh viên |
| Rate Limiting Handling | ✅ | Auto retry & delay 350ms |
| Socket Auto-init | ✅ | Khởi tạo tự động lần đầu gửi |
| Error Handling | ✅ | Xử lý lỗi chi tiết |
| Partial Success | ✅ | Tracking success/failure cho từng recipient |
| Cleanup & Cancellation | ✅ | Hủy pending requests |

### ⏳ Chưa Triển Khai (Cần Backend)

| Tính Năng | Trạng thái | Ghi Chú |
|-----------|-----------|--------|
| Course Broadcast | ❌ | Cần event `course:broadcast` từ backend |
| File/Attachment | ❌ | Cần endpoint upload file & xử lý file URL |
| Typing Indicator | ❌ | Cần event `typing:start/stop` từ backend |
| Message Edit/Delete | ❌ | Cần API support từ backend |
| Message Reactions | ❌ | Cần API support từ backend |

## 🚀 Cách Triển Khai Ngay

### Bước 1: Kiểm tra Current Status

```typescript
// ✅ Đã có
import { initSocket, sendChatMessage, onChatMessage, markChatSeen, joinChat, leaveChat } from 'socketService.ts';

// ✅ Sử dụng được ngay
const { sendOneToOne, sendGroup } = useComposeMessage('lecturer');
```

### Bước 2: Cập nhật Component

Tham khảo **LECTURER_MESSAGES_EXAMPLE.ts** để:
1. Import hook
2. Khởi tạo hook
3. Cập nhật handleSendComposedMessage
4. Thêm UI loading state
5. Thêm error display

### Bước 3: Test

```typescript
// Test One-to-One
await sendOneToOne(123, 456, 'Hello Student');

// Test Group
await sendGroup(123, [456, 789, 1011], 'Hello Everyone');
```

## ⚠️ Important Notes

### Backend Expectations

Backend mong đợi:
- ✅ `assignment_id` = **number** (không phải string)
- ✅ `other_user_id` = **number** (không phải string)  
- ✅ `message` = non-empty string
- ✅ `withCredentials: true` = bắt buộc
- ✅ Token trong auth header = bắt buộc

### Rate Limiting

- 🚫 **Không thể** gửi 2+ tin nhắn trong vòng 300ms cho cùng 1 assignment
- ✅ Hook xử lý tự động bằng cách delay 350ms giữa các tin nhắn
- ✅ Nếu gặp limit, tự động retry (max 2 lần)

### Socket Events Flow

```
Frontend                          Backend
|                                    |
|-- socket.emit('chat:send') ------->|
|                                    |
|<--- socket.on('chat:message') -----|
|      (Auto broadcast sau khi lưu)  |
|                                    |
```

## 📁 Files Structure

```
src/
├── app/
│   ├── hooks/
│   │   └── useComposeMessage.ts     (✅ NEW)
│   ├── utils/
│   │   └── socketUtils.ts           (✅ NEW)
│   ├── services/
│   │   └── socketService.ts         (✅ EXISTING - không thay đổi)
│   └── pages/
│       ├── lecturer/
│       │   └── LecturerMessages.tsx  (⏳ Cần update)
│       └── student/
│           └── StudentMessages.tsx  (⏳ Cần update)
└── COMPOSE_MESSAGE_*.md             (📖 Documentation)
```

## 🔄 Next Steps

1. **Review Documentation**
   - Đọc COMPOSE_MESSAGE_INTEGRATION_GUIDE.md
   - Đọc COMPOSE_MESSAGE_USAGE_GUIDE.md

2. **Implement in Components**
   - Tham khảo LECTURER_MESSAGES_EXAMPLE.ts
   - Update LecturerMessages.tsx
   - Update StudentMessages.tsx
   - Test thoroughly

3. **Handle Edge Cases**
   - Test rate limiting (gửi nhanh)
   - Test group messages (N recipients)
   - Test error scenarios (invalid IDs, network down)
   - Test partial success

4. **Monitor & Debug**
   - Check browser console for socket events
   - Use Network tab để xem WebSocket messages
   - Log message state changes

## 💡 Pro Tips

### Tip 1: Debug Socket Events
```typescript
// Trong browser console
window.socketEvents = [];
const logEvent = (name, data) => {
  window.socketEvents.push({ name, data, time: new Date() });
};
// Sau đó attach logging trong socketService
```

### Tip 2: Test Rate Limiting
```typescript
// Gửi nhanh 2 tin nhắn cùng assignment
await sendOneToOne(123, 456, 'Message 1');
await sendOneToOne(123, 789, 'Message 2');
// Lần 2 sẽ gặp rate limit, hook sẽ auto retry
```

### Tip 3: Handle Disconnection
```typescript
// Khi socket disconnect, message sẽ fail
// Hook catch lỗi & return false
const success = await sendOneToOne(...);
if (!success) {
  // Reconnect logic
  initSocket('lecturer');
}
```

## 📞 Support

Nếu cần help:
1. Kiểm tra console logs
2. Xem Network → WebSocket
3. Verify assignment_id & other_user_id là number
4. Verify socket connection status
5. Check rate limiting (300ms)

---

**Status**: ✅ Ready to implement
**Last Updated**: May 4, 2026
