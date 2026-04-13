import { useEffect, useState, useCallback } from 'react';
import { initSocket, getSocket, onGradingStatus, onGradingResult, onGradingError } from '../app/services/socketService';
import type { GradingStatusPayload, GradingResultPayload, GradingErrorPayload } from '../app/services/socketService';

export interface GradingProgress {
    total: number;
    completed: number;
    failed: number;
    isActive: boolean;
    currentSubmissionId?: string;
    errors: GradingErrorPayload[];
}

export const useGradingProgress = (role: 'lecturer' | 'student' = 'lecturer') => {
    const [progress, setProgress] = useState<GradingProgress>({
        total: 0,
        completed: 0,
        failed: 0,
        isActive: false,
        errors: [],
    });

    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize socket on mount
    useEffect(() => {
        if (!isInitialized) {
            try {
                initSocket(role);
                setIsInitialized(true);
            } catch (error) {
                console.error('Failed to initialize socket:', error);
            }
        }
    }, [isInitialized, role]);

    // Subscribe to grading events
    useEffect(() => {
        if (!isInitialized) return;

        const unsubscribeStatus = onGradingStatus((payload: GradingStatusPayload) => {
            setProgress((prev) => ({
                ...prev,
                total: payload.total,
                completed: payload.completed,
                failed: payload.failed,
                isActive: payload.inProgress,
                currentSubmissionId: payload.currentSubmissionId,
            }));
        });

        const unsubscribeResult = onGradingResult((payload: GradingResultPayload) => {
            // Handle individual grading result if needed
            console.log('Grading result received:', payload);
            setProgress(prev => ({ 
                ...prev, 
                completed: prev.completed + 1 // Cứ có Result là tăng completed
            }));
        });

        const unsubscribeError = onGradingError((payload: GradingErrorPayload) => {
            setProgress((prev) => ({
                ...prev,
                errors: [...prev.errors, payload],
                failed: prev.failed + 1, // Cứ có Error là tăng failed
            }));
        });

        return () => {
            unsubscribeStatus();
            unsubscribeResult();
            unsubscribeError();
        };
    }, [isInitialized]);

    // Calculate progress percentage
    const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

    const resetProgress = useCallback(() => {
        setProgress({
            total: 0,
            completed: 0,
            failed: 0,
            isActive: false,
            errors: [],
        });
    }, []);

    return {
        ...progress,
        progressPercentage,
        resetProgress,
        isInitialized,
    };
};

export default useGradingProgress;
