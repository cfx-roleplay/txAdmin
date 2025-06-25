import { useMemo } from 'react';
import { useTheme } from '@/hooks/theme';

export type ProfileThemeColors = {
    // General accent colors
    primary: string;
    secondary: string;
    accent: string;
    // Chart data colors
    chartColors: string[];
};

export const useProfileTheme = (): ProfileThemeColors => {
    const { theme } = useTheme();
    
    return useMemo(() => {
        // Check for custom profiles in localStorage
        try {
            const stored = localStorage.getItem('txAdmin-customProfiles');
            if (stored) {
                const customProfiles = JSON.parse(stored);
                const customProfile = customProfiles.find((p: any) => p.id === theme);
                if (customProfile && customProfile.theme) {
                    // Convert HSL values to hex for custom profiles
                    const hslToHex = (hsl: string): string => {
                        const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
                        if (!match) return '#000000';
                        
                        const h = parseInt(match[1]) / 360;
                        const s = parseInt(match[2]) / 100;
                        const l = parseInt(match[3]) / 100;

                        const c = (1 - Math.abs(2 * l - 1)) * s;
                        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
                        const m = l - c / 2;

                        let r = 0, g = 0, b = 0;

                        if (h * 6 < 1) {
                            r = c; g = x; b = 0;
                        } else if (h * 6 < 2) {
                            r = x; g = c; b = 0;
                        } else if (h * 6 < 3) {
                            r = 0; g = c; b = x;
                        } else if (h * 6 < 4) {
                            r = 0; g = x; b = c;
                        } else if (h * 6 < 5) {
                            r = x; g = 0; b = c;
                        } else {
                            r = c; g = 0; b = x;
                        }

                        const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
                        const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
                        const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

                        return `#${rHex}${gHex}${bHex}`;
                    };

                    const style = customProfile.theme.style;
                    
                    return {
                        primary: hslToHex(style.accent),
                        secondary: hslToHex(style.secondary),
                        accent: hslToHex(style.ring),
                        chartColors: [
                            hslToHex(style.accent),
                            hslToHex(style.secondary),
                            hslToHex(style.ring),
                            hslToHex(style.muted),
                            '#f59e0b',
                            '#ef4444',
                            '#10b981',
                            '#06b6d4'
                        ]
                    };
                }
            }
        } catch (error) {
            console.warn('Failed to load custom profiles:', error);
        }
        
        // RyleGames profile (purple theme)
        if (theme === 'rylegames') {
            return {
                primary: '#8b5cf6',       // violet-500
                secondary: '#c084fc',     // violet-400
                accent: '#a855f7',        // purple-500
                chartColors: [
                    '#8b5cf6', // violet-500
                    '#c084fc', // violet-400
                    '#a855f7', // purple-500
                    '#7c3aed', // violet-600
                    '#f59e0b', // amber-500
                    '#ef4444', // red-500
                    '#10b981', // emerald-500
                    '#06b6d4'  // cyan-500
                ]
            };
        }

        // Zerod profile (indigo/pink/orange theme)
        if (theme === 'zerod') {
            return {
                primary: '#6366f1',       // indigo-500
                secondary: '#ec4899',     // pink-500
                accent: '#f97316',        // orange-500
                chartColors: [
                    '#6366f1', // indigo-500
                    '#ec4899', // pink-500
                    '#f97316', // orange-500
                    '#8b5cf6', // violet-500
                    '#06b6d4', // cyan-500
                    '#10b981', // emerald-500
                    '#f59e0b', // amber-500
                    '#ef4444'  // red-500
                ]
            };
        }

        // Default (system theme)
        return {
            primary: '#3b82f6',           // blue-500
            secondary: '#6b7280',         // gray-500
            accent: '#8b5cf6',            // violet-500
            chartColors: [
                '#3b82f6', // blue-500
                '#10b981', // emerald-500
                '#f59e0b', // amber-500
                '#ef4444', // red-500
                '#8b5cf6', // violet-500
                '#06b6d4', // cyan-500
                '#ec4899', // pink-500
                '#84cc16'  // lime-500
            ]
        };
    }, [theme]);
}; 