import React from 'react';

export const TypingIndicator = () => {
    return (
        <div className="px-4 py-2 flex items-start">
            <div className="flex flex-row items-center px-3 py-2 bg-card border border-border rounded-2xl rounded-bl-sm h-9">
                <div className="w-1.5 h-1.5 rounded-full mx-[3px] bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full mx-[3px] bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full mx-[3px] bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    );
};
