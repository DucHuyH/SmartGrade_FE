# Hướng dẫn Tích hợp Compose Message với Socket.IO

Dựa trên hướng dẫn Backend, đây là cách triển khai Compose Message trên Frontend.

## Tình trạng Hiện tại

✅ **Đã có:**
- Socket.IO client được cấu hình đúng với `withCredentials: true`
- Socket events được định nghĩa trong `socketService.ts`
- Functions: `joinChat`, `leaveChat`, `sendChatMessage`, `markChatSeen`, `onChatMessage`
- Compose message dialog trong `LecturerMessages.tsx` và `StudentMessages.tsx`

## Cách Hoạt động của Compose Message

### 1. **Quy trình gửi tin nhắn qua Socket**

```typescript
// Backend mong đợi payload này:
interface SendChatMessagePayload {
  assignment_id: number;        // Bắt buộc
  other_user_id: number;        // Bắt buộc (người nhận)
  message: string;              // Bắt buộc
  client_message_id?: string;   // Optional - để xử lý optimistic UI
}

// Gửi tin nhắn:
sendChatMessage(payload, (response) => {
  if (response?.ok) {
    // response.data chứa: { chat_id, created_at, ... }
    console.log('Tin nhắn đã gửi:', response.data.chat_id);
  } else {
    // Error: response.error (VD: "Too many requests - 300ms")
    console.error('Lỗi:', response.error);
  }
});
```

### 2. **Nhận tin nhắn từ Server**

Backend sẽ tự động broadcast tin nhắn cho cả người gửi và người nhận qua sự kiện `chat:message`:

```typescript
// Lắng nghe tin nhắn mới
const unsubscribe = onChatMessage((message) => {
  // message: { chat_id, assignment_id, sender_id, receiver_id, message, is_read, created_at }
  setDirectMessages(prev => [...prev, message]);
});

// Dọn dẹp khi unmount
return () => unsubscribe();
```

### 3. **Đánh dấu đã đọc**

```typescript
markChatSeen(
  {
    assignment_id: number,
    other_user_id: number,
  },
  (response) => {
    if (response?.ok) {
      console.log(`Đã cập nhật ${response.data.updated_count} tin nhắn`);
    }
  }
);
```

## Cấu trúc Compose Message trong LecturerMessages.tsx

### Loại tin nhắn hỗ trợ:

1. **One-to-One (1-1)**
   - Gửi tin nhắn riêng cho một học sinh
   - Cần: student selection + assignment selection

2. **Group (N-N)**
   - Gửi cùng tin nhắn cho nhiều học sinh (nhưng riêng biệt)
   - Backend sẽ xử lý qua multiple `chat:send` calls

3. **Course-wide Broadcast (1-N)**
   - Gửi announcement cho toàn bộ lớp
   - Hiện tại chưa được implement qua socket

## Quy trình Tích hợp Chi tiết

### Bước 1: Khởi tạo Socket khi Component Mount

```typescript
useEffect(() => {
  initSocket('lecturer'); // hoặc 'student'
  
  return () => {
    // Không disconnect ngay, vì có thể còn phòng khác
    // Chỉ disconnect khi user logout
  };
}, []);
```

### Bước 2: Join Chat khi chọn Conversation

```typescript
const handleSelectConversation = (conversationId) => {
  setSelectedConversation(conversationId);
  
  // Join chat room qua socket
  joinChat(
    {
      assignment_id: conversation.assignmentId,
      other_user_id: conversation.studentId,
    },
    (response) => {
      if (response?.ok) {
        console.log('Đã vào phòng:', response.data.room);
      }
    }
  );
};
```

### Bước 3: Lắng nghe tin nhắn mới

```typescript
useEffect(() => {
  if (!selectedConv) return;
  
  // Lắng nghe tin nhắn
  const unsubscribe = onChatMessage((message) => {
    // Chỉ thêm tin nhắn nếu nó thuộc về conversation này
    if (Number(message.assignment_id) === Number(selectedConv.assignmentId)) {
      setDirectMessages(prev => [...prev, message]);
    }
  });
  
  // Đánh dấu đã đọc
  markChatSeen({
    assignment_id: selectedConv.assignmentId,
    other_user_id: selectedConv.studentId,
  });
  
  return () => unsubscribe();
}, [selectedConv]);
```

### Bước 4: Gửi tin nhắn từ Compose Dialog

```typescript
const handleSendComposedMessage = () => {
  if (!composeMessage.trim()) return;
  
  if (messageType === 'one-to-one') {
    const targetId = toNumericId(selectedStudent);
    
    if (!targetId) {
      setError('Vui lòng chọn học sinh');
      return;
    }
    
    // Nếu có assignmentId, gửi qua socket (real-time)
    if (selectedAssignmentId) {
      sendChatMessage(
        {
          assignment_id: selectedAssignmentId,
          other_user_id: targetId,
          message: composeMessage,
          client_message_id: generateClientMessageId(), // UUID
        },
        (response) => {
          if (response?.ok) {
            console.log('Tin nhắn đã gửi:', response.data.chat_id);
            resetComposeForm();
          } else {
            setError(response.error || 'Lỗi gửi tin nhắn');
            // Error có thể là: "Too many requests - 300ms"
          }
        }
      );
    } else {
      // Nếu không có assignment, gửi qua API REST thay vì socket
      // (hoặc yêu cầu user chọn assignment)
      setError('Vui lòng chọn assignment hoặc bài tập');
    }
  }
  
  if (messageType === 'group') {
    selectedStudents.forEach((studentId) => {
      const targetId = toNumericId(studentId);
      if (!targetId) return;
      
      sendChatMessage(
        {
          assignment_id: selectedAssignmentId,
          other_user_id: targetId,
          message: composeMessage,
          client_message_id: generateClientMessageId(),
        },
        (response) => {
          if (!response?.ok) {
            console.error('Lỗi gửi cho:', studentId, response.error);
          }
        }
      );
    });
    
    resetComposeForm();
  }
};
```

## Xử lý Lỗi & Edge Cases

### Rate Limiting (300ms)
Backend sẽ reject nếu gửi 2 tin nhắn trong vòng 300ms cho cùng assignment:

```typescript
const handleSendComposedMessage = () => {
  // ... code ...
  
  sendChatMessage(payload, (response) => {
    if (response?.ok === false) {
      if (response.error?.includes('Too many requests')) {
        setError('Bạn gửi tin nhắn quá nhanh. Vui lòng chờ 300ms');
        // Có thể thêm retry logic
      } else {
        setError(response.error);
      }
    }
  });
};
```

### Loại Tin Nhắn Hỗ trợ

1. **Text Message** ✅ Hỗ trợ
   ```typescript
   sendChatMessage({ ..., message: 'Hello' });
   ```

2. **File/Attachment** ❌ Chưa hỗ trợ qua socket
   - Cần gọi API REST trước để upload
   - Sau đó gửi tin nhắn chứa file URL

3. **Course Broadcast** ❌ Chưa implement
   - Hiện tại socket chỉ hỗ trợ 1-1 hoặc group (N lần 1-1)
   - Cần thêm event `course:broadcast` từ backend

## Lưu ý Quan trọng

### ✅ Đã Đúng
- Socket được khởi tạo với `withCredentials: true` ✓
- Sử dụng `async/await` cho user ID conversion ✓
- Unsubscribe events khi unmount ✓
- Xử lý null checks cho socket ✓

### ⚠️ Cần Chú ý
1. **assignment_id & other_user_id phải là number**
   ```typescript
   // ✅ Đúng
   const assignmentId = Number(selectedConv.assignmentId);
   
   // ❌ Sai - Backend mong đợi number
   sendChatMessage({ assignment_id: '123', other_user_id: '456' });
   ```

2. **Backend tự động emit lại tin nhắn qua `chat:message`**
   ```typescript
   // ❌ KHÔNG làm cái này - sẽ duplicate
   setMessages(prev => [...prev, { ...payload, id: response.data.chat_id }]);
   
   // ✅ Đúng - chỉ cần lắng nghe chat:message
   onChatMessage((message) => {
     setMessages(prev => [...prev, message]);
   });
   ```

3. **Để load lịch sử tin nhắn cũ, vẫn cần gọi REST API**
   ```typescript
   useEffect(() => {
     // Load lịch sử qua API
     fetchDirectChatThread(axiosInstance, assignmentId, currentUserId)
       .then(thread => setMessages(thread.messages));
     
     // Sau đó lắng nghe tin nhắn mới qua socket
     onChatMessage(newMessage => {
       setMessages(prev => [...prev, newMessage]);
     });
   }, [assignmentId]);
   ```

## Files Liên quan

- `src/app/services/socketService.ts` - Socket event handlers
- `src/app/pages/lecturer/LecturerMessages.tsx` - Lecturer UI
- `src/app/pages/student/StudentMessages.tsx` - Student UI
- `src/app/services/shared/directChat.ts` - Chat history API
