import { ChangeEvent, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export type ImportStudentRow = {
    studentId: string;
    name: string;
    email: string;
};

type ImportExcelModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (payload: { file: File; rows: ImportStudentRow[] }) => Promise<void>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_REGEX = /^\d{11}$/;
const REQUIRED_HEADERS = ['studentid', 'name', 'email'];

function normalizeHeader(header: string) {
    return header.replace(/\s+/g, '').toLowerCase();
}

function normalizeCellValue(cell: unknown) {
    return String(cell ?? '').trim();
}

export function ImportExcelModal({ open, onOpenChange, onImport }: ImportExcelModalProps) {
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<ImportStudentRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

    const resetState = () => {
        setSelectedFile(null);
        setFileName('');
        setRows([]);
        setErrors([]);
        setIsParsing(false);
        setIsImporting(false);
    };

    const validateRows = (parsedRows: ImportStudentRow[], rowNumberOffset: number) => {
        const validationErrors: string[] = [];
        const seenIds = new Set<string>();
        const seenEmails = new Set<string>();

        parsedRows.forEach((row, index) => {
            const rowNumber = index + rowNumberOffset;

            // if (!STUDENT_ID_REGEX.test(row.studentId)) {
            //     validationErrors.push(`Row ${rowNumber}: StudentID must contain exactly 11 digits.`);
            // }

            if (!row.name || row.name.length < 2) {
                validationErrors.push(`Row ${rowNumber}: Name is required and must be at least 2 characters.`);
            }

            if (!EMAIL_REGEX.test(row.email)) {
                validationErrors.push(`Row ${rowNumber}: Email is not valid.`);
            }

            if (seenIds.has(row.studentId)) {
                validationErrors.push(`Row ${rowNumber}: Duplicate StudentID in file.`);
            }
            seenIds.add(row.studentId);

            const normalizedEmail = row.email.toLowerCase();
            if (seenEmails.has(normalizedEmail)) {
                validationErrors.push(`Row ${rowNumber}: Duplicate email in file.`);
            }
            seenEmails.add(normalizedEmail);
        });

        return validationErrors;
    };

    const parseExcel = async (file: File) => {
        setIsParsing(true);
        setErrors([]);
        setRows([]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];

            if (!firstSheetName) {
                setErrors(['The file does not contain any sheet.']);
                return;
            }

            const worksheet = workbook.Sheets[firstSheetName];
            const sheetRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
                header: 1,
                defval: '',
            });

            if (sheetRows.length === 0) {
                setErrors(['The file is empty.']);
                return;
            }

            const firstRow = (sheetRows[0] ?? []).map((cell) => normalizeHeader(normalizeCellValue(cell)));
            const hasHeader = REQUIRED_HEADERS.every((header, index) => firstRow[index] === header);
            const dataRows = hasHeader ? sheetRows.slice(1) : sheetRows;
            const rowNumberOffset = hasHeader ? 2 : 1;

            const mappedRows = dataRows
                .map<ImportStudentRow>((row) => ({
                    studentId: normalizeCellValue(row[0]),
                    name: normalizeCellValue(row[1]),
                    email: normalizeCellValue(row[2]),
                }))
                .filter((row) => row.studentId || row.name || row.email);

            if (mappedRows.length === 0) {
                setErrors(['No valid data row was found in the file.']);
                return;
            }

            const validationErrors = validateRows(mappedRows, rowNumberOffset);
            if (validationErrors.length > 0) {
                setErrors(validationErrors);
                return;
            }

            setRows(mappedRows);
        } catch (error) {
            console.error('Failed to parse student file:', error);
            setErrors(['Cannot read this file. Please check format and import again.']);
        } finally {
            setIsParsing(false);
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) {
            return;
        }

        setFileName(selectedFile.name);
        setSelectedFile(selectedFile);
        await parseExcel(selectedFile);
        event.target.value = '';
    };

    const handleImport = async () => {
        if (!selectedFile || !rows.length || errors.length > 0) {
            return;
        }

        setIsImporting(true);
        try {
            await onImport({ file: selectedFile, rows });
            onOpenChange(false);
            resetState();
        } finally {
            setIsImporting(false);
        }
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            resetState();
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Import Student List</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file (.xlsx, .xls) in this column order: StudentID, Name, Email. Header row is optional.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="import-student-file">Excel File</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="import-student-file"
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="flex-1"
                            />
                            <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                        </div>
                        {fileName && <p className="text-sm text-gray-600">Selected: {fileName}</p>}
                    </div>

                    <div className="bg-blue-50 p-3 rounded text-sm text-gray-700">
                        <p className="mb-1">Expected column order:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>StudentID (exactly 11 digits)</li>
                            <li>Name</li>
                            <li>Email (valid email format)</li>
                        </ul>
                        <p className="text-xs mt-2">You can include header row or not.</p>
                    </div>

                    {errors.length > 0 && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <p className="font-medium mb-2">Invalid file data. Please fix and import again.</p>
                            <ul className="list-disc list-inside space-y-1 max-h-40 overflow-auto">
                                {errors.slice(0, 10).map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                            {errors.length > 10 && (
                                <p className="text-xs mt-2">Showing first 10 errors out of {errors.length}.</p>
                            )}
                        </div>
                    )}

                    {previewRows.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Preview (first 5 rows)</p>
                            <div className="rounded border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>StudentID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewRows.map((row, index) => (
                                            <TableRow key={`${row.studentId}-${index}`}>
                                                <TableCell>{row.studentId}</TableCell>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-xs text-gray-500">Total valid rows ready to import: {rows.length}</p>
                        </div>
                    )}

                    <Button
                        onClick={handleImport}
                        className="w-full"
                        disabled={isParsing || isImporting || !selectedFile || !rows.length || errors.length > 0}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        {isParsing ? 'Validating file...' : isImporting ? 'Importing...' : 'Import Students'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}