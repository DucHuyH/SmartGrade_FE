import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'react-toastify';

interface SimplePDFViewerProps {
    fileUrl?: string;
    submissionId?: string | number;
    onFetchFileBlob?: (fileUrl: string) => Promise<Blob>;
    title?: string;
}

export function SimplePDFViewer({
    fileUrl,
    onFetchFileBlob,
    title = 'Student Submission',
}: SimplePDFViewerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [objectUrl, setObjectUrl] = useState<string>('');

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [objectUrl]);

    // Fetch and set PDF
    useEffect(() => {
        const loadPDF = async () => {
            if (!fileUrl) {
                setError('No file URL provided');
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                let url: string;

                // If onFetchFileBlob is provided, use it (for authenticated URLs)
                if (onFetchFileBlob) {
                    const blob = await onFetchFileBlob(fileUrl);
                    url = URL.createObjectURL(blob);
                } else {
                    // Otherwise use the URL directly (for public URLs or CORS-enabled)
                    console.log('[SimplePDFViewer] Using file URL directly:', fileUrl);
                    url = fileUrl;
                }

                setObjectUrl(url);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
                console.error('[SimplePDFViewer] Error:', err);
                setError(errorMessage);
                toast.error('Failed to load PDF file: ' + errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        loadPDF();
    }, [fileUrl, onFetchFileBlob]);

    return (
        <Card className="h-full flex flex-col bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-200 shrink-0">
                <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 bg-gray-50 flex items-center justify-center min-h-0">
                {isLoading && (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Loading PDF...</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center gap-2 text-red-500 text-center px-4">
                        <AlertCircle className="h-8 w-8" />
                        <p className="text-sm">{error}</p>
                        <p className="text-xs text-gray-500">Check the file URL and try again</p>
                    </div>
                )}

                {!isLoading && !error && objectUrl && (
                    <iframe
                        src={objectUrl}
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                        onError={() => {
                            setError('Failed to display PDF - the file may be corrupted');
                        }}
                    />
                )}

                {!isLoading && !error && !objectUrl && (
                    <div className="text-gray-500">No PDF file available</div>
                )}
            </CardContent>
        </Card>
    );
}