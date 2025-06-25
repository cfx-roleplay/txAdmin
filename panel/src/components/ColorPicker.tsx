import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
    presetColors?: string[];
    disabled?: boolean;
    className?: string;
}

// Validate hex color
const isValidHex = (hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
};

const defaultPresets = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#c084fc', '#d946ef', '#ec4899', '#f43f5e'
];

export default function ColorPicker({
    value,
    onChange,
    label,
    presetColors = defaultPresets,
    disabled = false,
    className
}: ColorPickerProps) {
    const [inputValue, setInputValue] = useState(value);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        
        if (isValidHex(newValue)) {
            onChange(newValue);
        }
    };

    const handlePresetClick = (color: string) => {
        setInputValue(color);
        onChange(color);
    };

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {label && <Label className="text-sm font-medium">{label}</Label>}
            <div className="flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            disabled={disabled}
                            className="w-12 h-10 p-0"
                        >
                            <div
                                className="w-6 h-6 rounded border border-border"
                                style={{ backgroundColor: isValidHex(inputValue) ? inputValue : '#000000' }}
                            />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72 p-4" align="start">
                        <div className="space-y-4">
                            {/* Current Color Display */}
                            <div 
                                className="p-3 rounded border text-center"
                                style={{ backgroundColor: inputValue }}
                            >
                                <div className="text-white font-medium mix-blend-difference">
                                    {inputValue}
                                </div>
                            </div>

                            {/* Color Presets */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Color Presets</Label>
                                <div className="grid grid-cols-9 gap-2">
                                    {presetColors.map((color) => (
                                        <button
                                            key={color}
                                            className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => handlePresetClick(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Common Colors */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Basic Colors</Label>
                                <div className="grid grid-cols-8 gap-2">
                                    {[
                                        '#000000', '#ffffff', '#ff0000', '#00ff00',
                                        '#0000ff', '#ffff00', '#ff00ff', '#00ffff'
                                    ].map((color) => (
                                        <button
                                            key={color}
                                            className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => handlePresetClick(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="#000000"
                    className="font-mono flex-1"
                    disabled={disabled}
                />
            </div>
        </div>
    );
} 