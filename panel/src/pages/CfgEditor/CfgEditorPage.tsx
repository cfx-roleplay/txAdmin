import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { SaveIcon, RotateCcwIcon, AlertTriangleIcon, RefreshCwIcon, FileTextIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Editor, loader } from "@monaco-editor/react";
import { useCfgEditorApi, useCfgEditorSaveApi, type CFGEditorApiResp } from '@/hooks/useCfgEditor';
import { useBackendApi, ApiTimeout } from '@/hooks/fetch';
import { cn } from '@/lib/utils';
import type { editor } from 'monaco-editor';

// Configure Monaco Editor theme
loader.init().then(monaco => {
    monaco.editor.defineTheme('txadmin-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6a9955' },
            { token: 'keyword', foreground: '569cd6' },
            { token: 'string', foreground: 'ce9178' },
            { token: 'number', foreground: 'b5cea8' },
            { token: 'regexp', foreground: 'd16969' },
        ],
        colors: {
            'editor.background': '#1E1E1E',
            'editor.foreground': '#D4D4D4',
            'editor.lineHighlightBackground': '#2D2D30',
            'editor.selectionBackground': '#264F78',
            'editorCursor.foreground': '#AEAFAD',
            'editorLineNumber.foreground': '#858585',
            'editor.inactiveSelectionBackground': '#3A3D41',
            'editorWhitespace.foreground': '#858585',
        }
    });
});

export default function CfgEditorPage() {
    const [cfgContent, setCfgContent] = useState<string>('');
    const [originalContent, setOriginalContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [canRestart, setCanRestart] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const cfgEditorApi = useCfgEditorApi();
    const cfgEditorSaveApi = useCfgEditorSaveApi();
    const fxsControlApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/controls'
    });

    // Load CFG content
    const loadCfgContent = useCallback(() => {
        setIsLoading(true);
        setError(null);
        
        cfgEditorApi({
            success: (data) => {
                if (data.success) {
                    setCfgContent(data.cfgContent);
                    setOriginalContent(data.cfgContent);
                    setCanRestart(data.canRestart);
                    setHasUnsavedChanges(false);
                } else {
                    setError(data.error);
                }
                setIsLoading(false);
            },
            error: (message) => {
                setError(message);
                setIsLoading(false);
            },
        });
    }, []); // Remove cfgEditorApi from dependencies to prevent infinite loop

    // Save CFG content
    const saveCfgContent = useCallback(() => {
        if (!hasUnsavedChanges) return;

        // Check for suspiciously small content
        if (cfgContent.length < 1024) {
            const proceed = window.confirm(
                'Your CFG file is very small. There is a good chance you deleted something important. ' +
                'A backup will be created. Do you want to continue?'
            );
            if (!proceed) return;
        }

        cfgEditorSaveApi({
            data: { cfgData: cfgContent },
            toastLoadingMessage: 'Saving CFG file...',
            success: () => {
                setOriginalContent(cfgContent);
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
            },
        });
    }, [cfgContent, hasUnsavedChanges]); // Remove cfgEditorSaveApi from dependencies

    // Handle content change
    const handleContentChange = useCallback((value: string | undefined) => {
        if (value !== undefined) {
            setCfgContent(value);
            setHasUnsavedChanges(value !== originalContent);
        }
    }, [originalContent]);

    // Handle server restart
    const handleRestart = useCallback(() => {
        if (hasUnsavedChanges) {
            const proceed = window.confirm(
                'You have unsaved changes. Do you want to save them before restarting the server?'
            );
            if (proceed) {
                saveCfgContent();
            }
        }

        const confirmRestart = window.confirm('Are you sure you want to restart the FXServer?');
        if (confirmRestart) {
            fxsControlApi({
                data: { action: 'restart' },
                toastLoadingMessage: 'Restarting server...',
                timeout: ApiTimeout.LONG,
            });
        }
    }, [hasUnsavedChanges, saveCfgContent, fxsControlApi]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 's') {
                event.preventDefault();
                saveCfgContent();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveCfgContent]);

    // Load content on mount
    useEffect(() => {
        loadCfgContent();
    }, []); // Only run once on mount

    // Handle beforeunload
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCwIcon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertTriangleIcon className="h-12 w-12 text-destructive" />
                <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Failed to load CFG file</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={loadCfgContent} variant="outline">
                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-w-96 w-full h-contentvh">
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <FileTextIcon className="h-6 w-6 text-accent" />
                            <h1 className="text-2xl font-bold">CFG Editor</h1>
                            {hasUnsavedChanges && (
                                <Badge variant="outline" className="border-accent text-accent">
                                    Unsaved Changes
                                </Badge>
                            )}
                        </div>
                        {lastSaved && (
                            <p className="text-sm text-muted-foreground">
                                Last saved: {lastSaved.toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={loadCfgContent} 
                            variant="outline" 
                            size="sm"
                            disabled={isLoading}
                        >
                            <RefreshCwIcon className="h-4 w-4 mr-2" />
                            Reload
                        </Button>
                        <Button 
                            onClick={saveCfgContent} 
                            variant="default"
                            size="sm"
                            disabled={!hasUnsavedChanges}
                            className="bg-accent hover:bg-accent/90"
                        >
                            <SaveIcon className="h-4 w-4 mr-2" />
                            Save (Ctrl+S)
                        </Button>
                        {canRestart && (
                            <Button 
                                onClick={handleRestart} 
                                variant="outline"
                                size="sm"
                            >
                                <RotateCcwIcon className="h-4 w-4 mr-2" />
                                Restart Server
                            </Button>
                        )}
                    </div>
                </div>

                {/* Help Alert */}
                <Alert className="mb-4">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Important:</strong> This is your server.cfg file. Be careful when editing it as incorrect syntax can prevent your server from starting. 
                        A backup is automatically created when you save. Use <strong>Ctrl+S</strong> to save quickly.
                    </AlertDescription>
                </Alert>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <Card className="h-full">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">server.cfg</CardTitle>
                        <CardDescription>
                            Edit your FiveM/RedM server configuration file. Changes require a server restart to take effect.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 h-full">
                        <div className="h-[calc(100vh-400px)] min-h-[400px]">
                            <Editor
                                height="100%"
                                language="ini"
                                theme="txadmin-dark"
                                value={cfgContent}
                                onChange={handleContentChange}
                                onMount={(editor, monaco) => {
                                    editorRef.current = editor;
                                    monaco.editor.setTheme('txadmin-dark');
                                }}
                                options={{
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    wordWrap: 'on',
                                    minimap: { enabled: true },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 4,
                                    insertSpaces: true,
                                    detectIndentation: true,
                                    folding: true,
                                    renderWhitespace: 'boundary',
                                    cursorStyle: 'line',
                                    cursorBlinking: 'blink',
                                    selectOnLineNumbers: true,
                                    roundedSelection: false,
                                    readOnly: false,
                                    cursorSmoothCaretAnimation: 'on',
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 