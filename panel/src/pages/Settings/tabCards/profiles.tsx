import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, EditIcon, TrashIcon, PaletteIcon, DownloadIcon, UploadIcon } from 'lucide-react';
import ColorPicker from '@/components/ColorPicker';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { useTheme } from '@/hooks/theme';
import { txToast } from '@/components/TxToaster';
import type { SettingsCardProps } from '../utils';

// Define the profile type structure
interface ProfileTheme {
    name: string;
    isDark: boolean;
    style: {
        background: string;
        foreground: string;
        card: string;
        'card-foreground': string;
        popover: string;
        'popover-foreground': string;
        secondary: string;
        'secondary-foreground': string;
        muted: string;
        'muted-foreground': string;
        accent: string;
        'accent-foreground': string;
        border: string;
        input: string;
        ring: string;
        radius: string;
    };
}

interface ProfileDefinition {
    id: string;
    name: string;
    description: string;
    logo: string;
    theme: ProfileTheme;
}

const defaultStyle: ProfileTheme['style'] = {
    background: "0 0% 8%",
    foreground: "0 0% 98%",
    card: "0 0% 12%",
    'card-foreground': "0 0% 98%",
    popover: "0 0% 8%",
    'popover-foreground': "0 0% 98%",
    secondary: "0 0% 15%",
    'secondary-foreground': "0 0% 98%",
    muted: "0 0% 15%",
    'muted-foreground': "0 0% 65%",
    accent: "270 91% 65%",
    'accent-foreground': "0 0% 98%",
    border: "0 0% 20%",
    input: "0 0% 15%",
    ring: "270 91% 65%",
    radius: "0.5rem"
};

// HSL string to hex conversion
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

// Hex to HSL string conversion
const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Initial profiles (RyleGames and Zerod)
const initialProfiles: ProfileDefinition[] = [
    {
        id: 'rylegames',
        name: 'RyleGames',
        description: 'Black theme with purple accents and white highlights',
        logo: 'img/rylegames-logo.png',
        theme: {
            name: 'rylegames',
            isDark: true,
            style: {
                background: "0 0% 8%",
                foreground: "0 0% 98%",
                card: "0 0% 12%",
                'card-foreground': "0 0% 98%",
                popover: "0 0% 8%",
                'popover-foreground': "0 0% 98%",
                secondary: "0 0% 15%",
                'secondary-foreground': "0 0% 98%",
                muted: "0 0% 15%",
                'muted-foreground': "0 0% 65%",
                accent: "270 91% 65%",
                'accent-foreground': "0 0% 98%",
                border: "0 0% 20%",
                input: "0 0% 15%",
                ring: "270 91% 65%",
                radius: "0.5rem"
            }
        }
    },
    {
        id: 'zerod',
        name: 'Zerod',
        description: 'Modern theme with indigo, pink, and orange gradient colors',
        logo: 'img/zerod-logo.png',
        theme: {
            name: 'zerod',
            isDark: true,
            style: {
                background: "230 35% 7%",
                foreground: "0 0% 98%",
                card: "230 25% 12%",
                'card-foreground': "0 0% 98%",
                popover: "230 35% 7%",
                'popover-foreground': "0 0% 98%",
                secondary: "330 100% 60%",
                'secondary-foreground': "0 0% 98%",
                muted: "230 25% 15%",
                'muted-foreground': "0 0% 65%",
                accent: "25 95% 65%",
                'accent-foreground': "0 0% 98%",
                border: "230 25% 20%",
                input: "230 25% 15%",
                ring: "225 83% 53%",
                radius: "0.5rem"
            }
        }
    }
];

interface ProfileEditorProps {
    profile?: ProfileDefinition;
    onSave: (profile: ProfileDefinition) => void;
    onCancel: () => void;
    isOpen: boolean;
}

function ProfileEditor({ profile, onSave, onCancel, isOpen }: ProfileEditorProps) {
    const [editingProfile, setEditingProfile] = useState<ProfileDefinition>(
        profile || {
            id: '',
            name: '',
            description: '',
            logo: '',
            theme: {
                name: '',
                isDark: true,
                style: { ...defaultStyle },
            }
        }
    );

    useEffect(() => {
        if (profile) {
            setEditingProfile({ ...profile });
        }
    }, [profile]);

    const updateBasicInfo = (field: keyof ProfileDefinition, value: string) => {
        setEditingProfile(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'name' && !profile ? { id: value.toLowerCase().replace(/[^a-z0-9]/g, '-') } : {}),
            ...(field === 'name' ? { theme: { ...prev.theme, name: value.toLowerCase().replace(/[^a-z0-9]/g, '-') } } : {})
        }));
    };

    const updateThemeStyle = (styleKey: keyof ProfileTheme['style'], value: string) => {
        const hslValue = hexToHsl(value);
        if (editingProfile) {
            setEditingProfile(prev => ({
                ...prev,
                theme: {
                    ...prev.theme,
                    style: {
                        ...prev.theme.style,
                        [styleKey]: hslValue
                    }
                }
            }));
        }
    };

    const handleSave = () => {
        if (!editingProfile.name || !editingProfile.id) {
            txToast.error('Please provide a profile name');
            return;
        }
        onSave(editingProfile);
    };

    const styleFields = [
        { key: 'background', label: 'Background', description: 'Main background color' },
        { key: 'foreground', label: 'Foreground', description: 'Primary text color' },
        { key: 'card', label: 'Card Background', description: 'Card and panel background' },
        { key: 'secondary', label: 'Secondary', description: 'Secondary elements color' },
        { key: 'accent', label: 'Accent', description: 'Accent color for highlights' },
        { key: 'border', label: 'Border', description: 'Border and divider color' },
        { key: 'muted', label: 'Muted Background', description: 'Muted areas background' },
        { key: 'ring', label: 'Focus Ring', description: 'Focus indicator color' },
    ] as const;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{profile ? 'Edit Profile' : 'Create New Profile'}</DialogTitle>
                    <DialogDescription>
                        Configure the profile details and customize the color scheme.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Basic Information and Color Scheme Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Profile Name</Label>
                                <Input
                                    id="name"
                                    value={editingProfile.name}
                                    onChange={(e) => updateBasicInfo('name', e.target.value)}
                                    placeholder="Enter profile name"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={editingProfile.description}
                                    onChange={(e) => updateBasicInfo('description', e.target.value)}
                                    placeholder="Describe this profile theme"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <Label htmlFor="logo">Logo Path</Label>
                                <Input
                                    id="logo"
                                    value={editingProfile.logo}
                                    onChange={(e) => updateBasicInfo('logo', e.target.value)}
                                    placeholder="img/profile-logo.png"
                                />
                            </div>

                            <div>
                                <Label>Theme Mode</Label>
                                <Select
                                    value={editingProfile.theme.isDark ? 'dark' : 'light'}
                                    onValueChange={(value) => setEditingProfile(prev => ({
                                        ...prev,
                                        theme: { ...prev.theme, isDark: value === 'dark' }
                                    }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dark">Dark Mode</SelectItem>
                                        <SelectItem value="light">Light Mode</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Color Customization */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-3">Color Scheme</h4>
                                <div className="grid gap-3">
                                    {styleFields.map(({ key, label, description }) => (
                                        <ColorPicker
                                            key={key}
                                            label={label}
                                            value={hslToHex(editingProfile.theme.style[key])}
                                            onChange={(color) => updateThemeStyle(key, color)}
                                            className="text-sm"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-6">
                        <Label>Preview</Label>
                        <Card className="mt-2" style={{
                            backgroundColor: hslToHex(editingProfile.theme.style.card),
                            borderColor: hslToHex(editingProfile.theme.style.border),
                            color: hslToHex(editingProfile.theme.style.foreground)
                        }}>
                            <CardHeader>
                                <CardTitle style={{ color: hslToHex(editingProfile.theme.style.accent) }}>
                                    {editingProfile.name || 'Profile Preview'}
                                </CardTitle>
                                <CardDescription>
                                    {editingProfile.description || 'This is how your profile will look'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button style={{
                                        backgroundColor: hslToHex(editingProfile.theme.style.accent),
                                        color: hslToHex(editingProfile.theme.style['accent-foreground'])
                                    }}>
                                        Primary Button
                                    </Button>
                                    <Button variant="outline" style={{
                                        borderColor: hslToHex(editingProfile.theme.style.border),
                                        backgroundColor: hslToHex(editingProfile.theme.style.secondary),
                                        color: hslToHex(editingProfile.theme.style['secondary-foreground'])
                                    }}>
                                        Secondary Button
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        {profile ? 'Save Changes' : 'Create Profile'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ConfigCardProfiles(props: SettingsCardProps) {
    const [profiles, setProfiles] = useState<ProfileDefinition[]>(() => {
        try {
            const stored = localStorage.getItem('txAdmin-customProfiles');
            const customProfiles = stored ? JSON.parse(stored) : [];
            return [...initialProfiles, ...customProfiles];
        } catch {
            return initialProfiles;
        }
    });
    const [editingProfile, setEditingProfile] = useState<ProfileDefinition | undefined>();
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const profileTheme = useProfileTheme();

    // Save custom profiles to localStorage
    const saveCustomProfiles = (allProfiles: ProfileDefinition[]) => {
        const customProfiles = allProfiles.filter(p => !['rylegames', 'zerod'].includes(p.id));
        localStorage.setItem('txAdmin-customProfiles', JSON.stringify(customProfiles));
    };

    const handleCreateProfile = () => {
        setEditingProfile(undefined);
        setIsEditorOpen(true);
    };

    const handleEditProfile = (profile: ProfileDefinition) => {
        setEditingProfile(profile);
        setIsEditorOpen(true);
    };

    const handleDeleteProfile = (profileId: string) => {
        // Don't allow deleting default profiles
        if (['rylegames', 'zerod'].includes(profileId)) {
            txToast.error('Cannot delete default profiles');
            return;
        }
        
        const newProfiles = profiles.filter(p => p.id !== profileId);
        setProfiles(newProfiles);
        saveCustomProfiles(newProfiles);
        
        if (theme === profileId) {
            setTheme('rylegames'); // Fallback to default
        }
        txToast.success('Profile deleted successfully');
    };

    const handleSaveProfile = (profile: ProfileDefinition) => {
        const newProfiles = profiles.find(p => p.id === profile.id)
            ? profiles.map(p => p.id === profile.id ? profile : p)
            : [...profiles, profile];
            
        setProfiles(newProfiles);
        saveCustomProfiles(newProfiles);
        setIsEditorOpen(false);
        setEditingProfile(undefined);
        txToast.success(editingProfile ? 'Profile updated successfully' : 'Profile created successfully');
    };

    const handleExportProfile = (profile: ProfileDefinition) => {
        const dataStr = JSON.stringify(profile, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${profile.id}-profile.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportProfile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const profile = JSON.parse(e.target?.result as string) as ProfileDefinition;
                        setProfiles(prev => [...prev.filter(p => p.id !== profile.id), profile]);
                        txToast.success('Profile imported successfully');
                    } catch (error) {
                        txToast.error('Invalid profile file');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Profile Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and customize visual themes for your txAdmin interface
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleImportProfile}>
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Import
                    </Button>
                    <Button onClick={handleCreateProfile}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        New Profile
                    </Button>
                </div>
            </div>

            {/* Active Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PaletteIcon className="w-5 h-5" />
                        Current Profile
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-8 h-8 rounded border"
                                style={{ backgroundColor: profileTheme.primary }}
                            />
                            <div>
                                <p className="font-medium">
                                    {profiles.find(p => p.id === theme)?.name || 'Unknown Profile'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {profiles.find(p => p.id === theme)?.description || 'No description'}
                                </p>
                            </div>
                        </div>
                        <Badge style={{ backgroundColor: profileTheme.accent, color: profileTheme.primary }}>
                            Active
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Profile List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((profile) => (
                    <Card key={profile.id} className={theme === profile.id ? 'ring-2' : ''} style={
                        theme === profile.id ? { borderColor: profileTheme.accent } : {}
                    }>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-6 h-6 rounded border"
                                        style={{ backgroundColor: hslToHex(profile.theme.style.accent) }}
                                    />
                                    <CardTitle className="text-sm">{profile.name}</CardTitle>
                                </div>
                                {['rylegames', 'zerod'].includes(profile.id) && (
                                    <Badge variant="outline" className="text-xs">Default</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                {profile.description}
                            </p>
                            
                            {/* Color Preview */}
                            <div className="flex gap-1 mb-3">
                                {['background', 'accent', 'secondary', 'border'].map((colorKey) => (
                                    <div
                                        key={colorKey}
                                        className="w-4 h-4 rounded border border-border"
                                        style={{ backgroundColor: hslToHex(profile.theme.style[colorKey as keyof typeof profile.theme.style]) }}
                                        title={colorKey}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {theme !== profile.id && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setTheme(profile.id)}
                                    >
                                        Apply
                                    </Button>
                                )}
                                
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditProfile(profile)}
                                >
                                    <EditIcon className="w-3 h-3" />
                                </Button>
                                
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleExportProfile(profile)}
                                >
                                    <DownloadIcon className="w-3 h-3" />
                                </Button>
                                
                                {!['rylegames', 'zerod'].includes(profile.id) && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteProfile(profile.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <TrashIcon className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Profile Editor Dialog */}
            <ProfileEditor
                profile={editingProfile}
                onSave={handleSaveProfile}
                onCancel={() => {
                    setIsEditorOpen(false);
                    setEditingProfile(undefined);
                }}
                isOpen={isEditorOpen}
            />
        </div>
    );
} 