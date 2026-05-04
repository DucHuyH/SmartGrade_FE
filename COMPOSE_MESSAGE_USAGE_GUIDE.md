# Cách Sử dụng useComposeMessage Hook

## Tổng Quan

Hook `useComposeMessage` được tạo để xử lý gửi tin nhắn compose qua Socket.IO với các tính năng:

✅ **Socket initialization** tự động
✅ **Rate limiting retry logic** - tự động retry khi gặp 300ms limit
✅ **Group message support** - gửi một tin nhắn tới nhiều sinh viên (với delay để tránh rate limit)
✅ **Error handling** và partial success tracking
✅ **Cleanup** cho pending requests

## Cách Sử dụng

### 1. Import Hook

```typescript
import { useComposeMessage } from '../hooks/useComposeMessage';
```

### 2. Sử dụng trong Component

#### **One-to-One Message (Lecturer)**

```typescript
export function LecturerMessages() {
  // Khởi tạo hook
  const {
    isLoading,
    error,
    sendOneToOne,
    sendGroup,
    cancelPendingRequests,
  } = useComposeMessage('lecturer', {
    onSuccess: () => {
      console.log('Tin nhắn đã gửi thành công');
      // Reset form
      setComposeMessage('');
      setIsComposeDialogOpen(false);
    },
    onError: (errorMsg) => {
      console.error('Lỗi:', errorMsg);
      setDirectChatError(errorMsg);
    },
  });

  const handleSendComposedMessage = async () => {
    if (!composeMessage.trim()) return;

    const studentId = toNumericId(selectedStudent);
    const assignmentId = toNumericId(selectedAssignmentId);

    if (!studentId) {
      setDirectChatError('Please select a student');
      return;
    }

    if (!assignmentId) {
      setDirectChatError('Please select an assignment');
      return;
    }

    // Gửi one-to-one message
    await sendOneToOne(assignmentId, studentId, composeMessage);
  };

  return (
    <Dialog>
      {/* ... */}
      <Button
        onClick={handleSendComposedMessage}
        disabled={isLoading}
      >
        {isLoading ? 'Sending...' : 'Send Message'}
      </Button>
      {error && <div className="text-red-500">{error}</div>}
    </Dialog>
  );
}
```

#### **Group Message (Lecturer)**

```typescript
const handleSendGroupMessage = async () => {
  if (!composeMessage.trim()) return;

  const assignmentId = toNumericId(selectedAssignmentId);
  const studentIds = selectedStudents.map(id => toNumericId(id)).filter(Boolean);

  if (!assignmentId || studentIds.length === 0) {
    setDirectChatError('Invalid selection');
    return;
  }

  // Gửi group message
  // Hook sẽ tự động delay 350ms giữa các tin nhắn để tránh rate limiting
  await sendGroup(assignmentId, studentIds, composeMessage);
};
```

#### **Student Messages**

```typescript
export function StudentMessages() {
  const { isLoading, sendOneToOne } = useComposeMessage('student', {
    onSuccess: () => {
      console.log('Message sent');
      setComposeMessage('');
    },
    onError: (error) => {
      setDirectChatError(error);
    },
  });

  const handleSendComposedMessage = async () => {
    if (!composeMessage.trim()) return;

    const courseId = toNumericId(selectedCourseId); // The lecturer/professor
    const assignmentId = toNumericId(selectedAssignmentId);

    if (!courseId || !assignmentId) {
      setDirectChatError('Please select both course and assignment');
      return;
    }

    await sendOneToOne(assignmentId, courseId, composeMessage);
  };

  return (
    <Dialog>
      {/* ... */}
      <Button
        onClick={handleSendComposedMessage}
        disabled={isLoading || !composeMessage.trim()}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </Button>
    </Dialog>
  );
}
```

## API Reference

### `useComposeMessage(role, options)`

#### Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | `'lecturer' \| 'student'` | ✅ | Role of current user |
| `options.onSuccess` | `() => void` | ❌ | Callback khi gửi thành công |
| `options.onError` | `(error: string) => void` | ❌ | Callback khi có lỗi |

#### Returns

```typescript
{
  isLoading: boolean;           // Đang gửi?
  error: string | null;         // Error message nếu có
  sendMessage: (payload) => Promise<boolean>;  // Gửi raw payload
  sendOneToOne: (assignmentId, recipientId, message) => Promise<boolean>;  // Helper 1-1
  sendGroup: (assignmentId, recipientIds, message) => Promise<boolean>;    // Helper N-N
  cancelPendingRequests: () => void;  // Hủy các send pending
}
```

## Xử lý Lỗi & Edge Cases

### Rate Limiting (300ms)

Hook tự động xử lý:

```typescript
// Ví dụ: Gửi tới 3 sinh viên
const success = await sendGroup(assignmentId, [studentId1, studentId2, studentId3], message);

// Hook sẽ:
// 1. Gửi tới studentId1 ngay
// 2. Delay 350ms, gửi tới studentId2
// 3. Delay 350ms, gửi tới studentId3
// Nếu gặp rate limit error, tự động retry
```

### Partial Success

```typescript
// Gửi tới 3 sinh viên, 1 thất bại:
const success = await sendGroup(assignmentId, [id1, id2, id3], message);
// success = true (vì có 2 thành công)
// error = "Sent to 2/3 recipients"
```

### Cleanup Cleanup khi component unmount:

```typescript
useEffect(() => {
  return () => {
    cancelPendingRequests(); // Hủy các send chưa hoàn thành
  };
}, [cancelPendingRequests]);
```

## Validation

Hook sử dụng `socketUtils.validateMessagePayload()` để kiểm tra:

```typescript
export const validateMessagePayload = (payload: SocketMessagePayload) => {
  // ✅ Kiểm tra:
  // - Message không rỗng
  // - assignment_id là số hợp lệ
  // - other_user_id là số hợp lệ
};
```

## Integrasi trong Compose Dialog

### Full Example (Lecturer)

```typescript
<Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Compose Message</DialogTitle>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {/* Message Type Selection */}
      <RadioGroup value={messageType} onValueChange={setMessageType}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="one-to-one" id="one-to-one" />
          <Label htmlFor="one-to-one">Send to One Student</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="group" id="group" />
          <Label htmlFor="group">Send to Multiple Students</Label>
        </div>
      </RadioGroup>

      {/* Student/Assignment Selection */}
      <div className="space-y-3">
        {/* Course Select */}
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          {/* ... */}
        </Select>

        {/* Assignment Select */}
        <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
          {/* ... */}
        </Select>

        {/* Student Selection */}
        {messageType === 'one-to-one' && (
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            {/* ... */}
          </Select>
        )}

        {messageType === 'group' && (
          <ScrollArea>
            {availableStudents.map(student => (
              <Checkbox
                key={student.id}
                checked={selectedStudents.includes(student.id)}
                onCheckedChange={() => toggleStudent(student.id)}
              />
            ))}
          </ScrollArea>
        )}
      </div>

      {/* Message Composer */}
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          value={composeMessage}
          onChange={(e) => setComposeMessage(e.target.value)}
          placeholder="Type your message..."
          rows={4}
        />
        {/* Message Templates */}
        <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
          {/* ... */}
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
          {error}
        </div>
      )}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setIsComposeDialogOpen(false);
          cancelPendingRequests();
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSendComposedMessage}
        disabled={isLoading || !composeMessage.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Notes

### ✅ Tốt

- Socket khởi tạo tự động lần đầu tiên gửi tin nhắn
- Retry tự động cho rate limiting
- ID conversion (string → number) được xử lý trong hook
- Cleanup khi unmount

### ⚠️ Cần Chú Ý

- Backend mong đợi `assignment_id` & `other_user_id` là **number**, không phải string
- Group messages sẽ mất thời gian (N × 350ms) nếu có nhiều sinh viên
- Nếu hủy dialog khi đang gửi, cần call `cancelPendingRequests()` để cleanup

### ❌ Không Làm

- Không gửi tin nhắn mà không có `assignment_id`
- Không gửi string IDs (phải convert sang number trước)
- Không bypass validate logic
