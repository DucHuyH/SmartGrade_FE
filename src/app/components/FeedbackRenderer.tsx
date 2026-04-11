import React from 'react';

interface FeedbackRendererProps {
    content: string;
    className?: string;
}

/**
 * Renders feedback text with proper formatting:
 * - Preserves line breaks
 * - Formats bullet points (lines starting with "-")
 * - Groups consecutive lines into paragraphs
 */
export function FeedbackRenderer({ content, className = '' }: FeedbackRendererProps) {
    if (!content || typeof content !== 'string') {
        return null;
    }

    // Split content into lines
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
        return null;
    }

    // Group lines into sections (paragraphs and bullet lists)
    type Section = { type: 'paragraph' | 'bullet-list'; content: string[] };
    const sections: Section[] = [];
    let currentSection: Section = { type: 'paragraph', content: [] };

    for (const line of lines) {
        const isBullet = line.startsWith('-');
        const lineType: 'bullet-list' | 'paragraph' = isBullet ? 'bullet-list' : 'paragraph';

        // If line type matches current section, add to it
        if (currentSection.type === lineType) {
            currentSection.content.push(line);
        } else {
            // Start new section
            if (currentSection.content.length > 0) {
                sections.push(currentSection);
            }
            currentSection = {
                type: lineType,
                content: [line]
            };
        }
    }

    // Add last section
    if (currentSection.content.length > 0) {
        sections.push(currentSection);
    }

    return (
        <div className={`space-y-4 text-gray-700 ${className}`}>
            {sections.map((section, idx) => {
                if (section.type === 'bullet-list') {
                    return (
                        <ul key={idx} className="space-y-2 ml-4">
                            {section.content.map((line, bulletIdx) => (
                                <li key={bulletIdx} className="flex gap-2">
                                    <span className="font-semibold text-gray-600">-</span>
                                    <span className="text-gray-700">
                                        {line.startsWith('-') ? line.substring(1).trim() : line}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    );
                } else {
                    return (
                        <p key={idx} className="leading-relaxed">
                            {section.content.join(' ')}
                        </p>
                    );
                }
            })}
        </div>
    );
}
