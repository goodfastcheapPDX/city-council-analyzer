'use client';

import { useState } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

interface ErrorDisplayProps {
    title?: string;
    message: string;
    details?: any;
    onClose?: () => void;
    variant?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({
    title,
    message,
    details,
    onClose,
    variant = 'error'
}: ErrorDisplayProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        setIsOpen(false);
        if (onClose) {
            onClose();
        }
    };

    // Set colors based on variant
    const colors = {
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            title: 'text-red-800',
            text: 'text-red-700',
            icon: 'text-red-500'
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            title: 'text-yellow-800',
            text: 'text-yellow-700',
            icon: 'text-yellow-500'
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            title: 'text-blue-800',
            text: 'text-blue-700',
            icon: 'text-blue-500'
        }
    };

    const currentColors = colors[variant];

    return (
        <div className={`rounded-md ${currentColors.bg} ${currentColors.border} border p-4 mb-4`
        }>
            <div className="flex justify-between items-start" >
                <div className="flex" >
                    <AlertCircle className={`h-5 w-5 ${currentColors.icon} mt-0.5 mr-2 flex-shrink-0`} />
                    <div>
                        {title && <h3 className={`text-sm font-medium ${currentColors.title}`}> {title} </h3>}
                        <div className={`text-sm ${currentColors.text} mt-1`}>
                            <p>{message} </p>
                        </div>

                        {
                            details && (
                                <div className="mt-2" >
                                    <button
                                        type="button"
                                        className={`text-xs underline ${currentColors.text}`
                                        }
                                        onClick={() => setShowDetails(!showDetails)}
                                    >
                                        {showDetails ? 'Hide details' : 'Show details'}
                                    </button>

                                    {
                                        showDetails && (
                                            <pre className={`mt-2 text-xs p-2 rounded ${currentColors.bg} bg-opacity-50 overflow-auto max-h-40`}>
                                                {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                                            </pre>
                                        )
                                    }
                                </div>
                            )}
                    </div>
                </div>

                < button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={handleClose}
                >
                    <XCircle className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}