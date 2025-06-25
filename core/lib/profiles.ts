import type { ThemeType } from '@shared/otherTypes';

export interface ProfileDefinition {
    id: string;
    name: string;
    description: string;
    logo: string;
    theme: ThemeType;
}

export const PROFILES: Record<string, ProfileDefinition> = {
    rylegames: {
        id: 'rylegames',
        name: 'RyleGames',
        description: 'Black theme with purple accents and white highlights',
        logo: 'img/rylegames-logo.png',
        theme: {
            name: 'rylegames',
            isDark: true,
            style: {
                "background": "0 0% 8%", // Very dark background
                "foreground": "0 0% 98%", // White text
                "card": "0 0% 12%", // Dark card background
                "card-foreground": "0 0% 98%",
                "popover": "0 0% 8%",
                "popover-foreground": "0 0% 98%",
                "secondary": "0 0% 15%", // Dark secondary
                "secondary-foreground": "0 0% 98%",
                "muted": "0 0% 15%",
                "muted-foreground": "0 0% 65%",
                "accent": "270 91% 65%", // Purple accent
                "accent-foreground": "0 0% 98%",
                "border": "0 0% 20%",
                "input": "0 0% 15%",
                "ring": "270 91% 65%", // Purple ring
                "radius": "0.5rem"
                // Note: Primary and semantic colors are preserved from default theme
                // to maintain chart functionality and consistent server stats
            }
        }
    },
    
    zerod: {
        id: 'zerod',
        name: 'Zerod',
        description: 'Modern theme with indigo, pink, and orange gradient colors',
        logo: 'img/zerod-logo.png',
        theme: {
            name: 'zerod',
            isDark: true,
            style: {
                "background": "230 35% 7%", // Dark indigo background
                "foreground": "0 0% 98%",
                "card": "230 25% 12%", // Slightly lighter indigo
                "card-foreground": "0 0% 98%",
                "popover": "230 35% 7%",
                "popover-foreground": "0 0% 98%",
                "secondary": "330 100% 60%", // Pink secondary (#FF3694)
                "secondary-foreground": "0 0% 98%",
                "muted": "230 25% 15%",
                "muted-foreground": "0 0% 65%",
                "accent": "25 95% 65%", // Orange accent (#F38F5A)
                "accent-foreground": "0 0% 98%",
                "border": "230 25% 20%",
                "input": "230 25% 15%",
                "ring": "225 83% 53%", // Indigo ring
                "radius": "0.5rem"
                // Note: Primary and semantic colors are preserved from default theme
                // to maintain chart functionality and consistent server stats
            }
        }
    }
};

export const getProfile = (profileId: string): ProfileDefinition => {
    if (!profileId || typeof profileId !== 'string') {
        return PROFILES.rylegames;
    }
    return PROFILES[profileId] || PROFILES.rylegames;
};

export const getAllProfiles = (): ProfileDefinition[] => {
    return Object.values(PROFILES);
};

export const isValidProfile = (profileId: string): boolean => {
    return profileId in PROFILES;
}; 