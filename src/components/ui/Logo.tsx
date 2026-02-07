import React from 'react';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

/**
 * ScriptHub Logo Component
 * Uses the ScriptHub_icon2.png with transparent background
 */
export const Logo: React.FC<LogoProps> = ({ className = '', showText = true }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Icon using the transparent PNG */}
            <img
                src="/logo.png"
                alt="ScriptHub"
                className="w-8 h-8 object-contain"
            />

            {/* Text */}
            {showText && (
                <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    Script<span className="text-violet-600 dark:text-violet-400">Hub</span>
                </span>
            )}
        </div>
    );
};

export default Logo;
