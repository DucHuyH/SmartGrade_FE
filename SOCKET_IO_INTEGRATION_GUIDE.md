/**
 * SOCKET.IO FRONTEND INTEGRATION GUIDE
 * 
 * This file demonstrates how to complete the Socket.io real-time grading setup
 */

// ============================================================================
// 1. INSTALLATION
// ============================================================================
// Run: npm install socket.io-client

// ============================================================================
// 2. API INTEGRATION - Update SubmissionTable.tsx
// ============================================================================

/**
 * In handleConfirmAction function, update the 'ai' branch to:
 */

    // const handleConfirmAction = async () => {
    //     if (pendingAction === 'ai') {
    //         setAiGrading(true);
    //         resetProgress();
    //         setShowGradingProgress(true);
    //         
    //         try {
    //             const selectedIds = Array.from(selectedSubmissionIds);
    //             
    //             // Call your AI grading API endpoint
    //             await axiosInstance.post('/grading/ai', {
    //                 list_submission: selectedIds,  // or whatever param name backend expects
    //                 assignment_id: assignment_id,
    //             });
    //             
    //             toast.info(`Starting AI grading for ${selectedIds.length} submission(s)...`);
    //             setSelectedSubmissionIds(new Set()); // Clear selection
    //         } catch (error) {
    //             console.error('Error starting AI grading:', error);
    //             toast.error('Failed to start AI grading. Please try again.');
    //             setShowGradingProgress(false);
    //             setAiGrading(false);
    //         }
    //     }
    //     // ... rest of the code
    // };


// ============================================================================
// 3. BACKEND EVENTS - Expected from Backend
// ============================================================================

/**
 * The frontend Socket service expects these events from the backend:
 * 
 * Backend should emit to user room or course room:
 */

// Progress update - emit as grading progresses
socket.io.to(userRoom(userId)).emit('grading:status', {
  total: 10,           // Total submissions
  completed: 3,        // Already graded
  failed: 0,          // Failed to grade
  inProgress: true,   // Still grading (false when complete)
  currentSubmissionId: 'sub_123456' // Currently grading this one
});

// Individual result - after each submission is graded
socket.io.to(userRoom(userId)).emit('grading:result', {
  submission_id: 'sub_123456',
  score: 85,
  feedback: 'Good work, well explained',
  status: 'success'
});

// Error occurred - if a submission fails to grade
socket.io.to(userRoom(userId)).emit('grading:error', {
  submission_id: 'sub_123456',
  error: 'File is corrupted or unreadable'
});


// ============================================================================
// 4. FILE STRUCTURE
// ============================================================================

/**
 * Created/Modified Files:
 * 
 * ✓ src/app/services/socketService.ts
 *   - Socket connection management
 *   - Event listeners and emitters
 * 
 * ✓ src/hooks/useGradingProgress.ts
 *   - React hook for grading progress state
 *   - Auto-initializes socket
 * 
 * ✓ src/app/components/GradingProgressModal.tsx
 *   - Beautiful modal for showing real-time progress
 *   - Shows stats, progress bar, current submission, errors
 * 
 * ✓ src/app/components/ui/alert.tsx
 *   - Simple alert component for errors
 * 
 * ✓ src/app/pages/lecturer/SubmissionTable.tsx
 *   - Integrated useGradingProgress hook
 *   - Shows modal on AI grading action
 */


// ============================================================================
// 5. EXAMPLE BACKEND GRADING FLOW
// ============================================================================

/**
 * User clicks "Grade All with AI" [sub_101, sub_102, sub_103]
 *         ↓
 * Frontend sends POST /grading/ai with submission IDs
 *         ↓
 * Backend validates submissions
 *         ↓
 * Backend emits: grading:status { total: 3, completed: 0, failed: 0, inProgress: true }
 *         ↓
 * Backend processes sub_101
 *         ↓
 * Backend emits: grading:status { total: 3, completed: 1, failed: 0, currentSubmissionId: 'sub_102' }
 * Backend emits: grading:result { submission_id: 'sub_101', score: 85, ... }
 *         ↓
 * Backend processes sub_102
 *         ↓
 * Backend emits: grading:status { total: 3, completed: 2, failed: 0, currentSubmissionId: 'sub_103' }
 * Backend emits: grading:result { submission_id: 'sub_102', score: 78, ... }
 *         ↓
 * Backend processes sub_103 (fails)
 *         ↓
 * Backend emits: grading:error { submission_id: 'sub_103', error: '...' }
 * Backend emits: grading:status { total: 3, completed: 2, failed: 1, inProgress: false }
 *         ↓
 * Frontend modal shows: 2 completed, 1 remaining, 1 failed, 66% progress


// ============================================================================
// 6. CUSTOMIZATION OPTIONS
// ============================================================================

/**
 * In GradingProgressModal.tsx, you can:
 * - Change colors of stats boxes
 * - Adjust modal width/size
 * - Modify error display format
 * - Add more statistics
 * 
 * In useGradingProgress.ts, you can:
 * - Add more state tracking
 * - Add filtering/sorting logic
 * - Add caching
 * 
 * In socketService.ts, you can:
 * - Add retry logic
 * - Add logging
 * - Add more event types
 * - Customize reconnection strategy
 */

// ============================================================================
// 7. TROUBLESHOOTING
// ============================================================================

/**
 * Socket not connecting:
 * - Verify backend Socket.io server is running
 * - Check CORS settings in backend
 * - Ensure token is valid and stored in sessionStorage
 * - Check browser console for connection errors
 * 
 * Events not received:
 * - Verify event names match exactly
 * - Check payload structure matches interface
 * - Ensure backend emits to correct room/user
 * 
 * Modal not showing:
 * - Check showGradingProgress state
 * - Verify GradingProgressModal is imported
 * - Check if onClick handlers are working
 */

// ============================================================================
// 8. TESTING WITHOUT BACKEND
// ============================================================================

/**
 * To test the UI without backend grading:
 * 
 * Use browser DevTools Console:
 */

// Simulate grading start
window.__mockGrading = setInterval(() => {
  const event = new CustomEvent('grading:status', {
    detail: {
      total: 5,
      completed: Math.floor(Math.random() * 6),
      failed: 0,
      inProgress: true,
      currentSubmissionId: 'sub_' + Math.floor(Math.random() * 100)
    }
  });
  document.dispatchEvent(event);
}, 1000);

// Stop mock
clearInterval(window.__mockGrading);

