import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="py-12 px-6 border-t border-silver/10 bg-background">
            <div className="max-w-7xl mx-auto text-center space-y-2">
                <p className="font-semibold text-foreground">
                    © 2026 SSLDUCK.COM
                </p>
                <p className="text-xs text-foreground/40 uppercase tracking-widest">
                    Member Blue Ridge Technology Family of Companies
                </p>
            </div>
        </footer>
    );
};
