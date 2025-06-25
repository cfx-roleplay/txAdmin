const modulename = 'WebServer:CFGEditorAPI';
import { resolveCFGFilePath, readRawCFGFile } from '@lib/fxserver/fxsConfigHelper';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
const console = consoleFactory(modulename);

export type CFGEditorApiResp = {
    success: true;
    cfgContent: string;
    canRestart: boolean;
} | {
    success: false;
    error: string;
};

/**
 * Returns the CFG file content as JSON
 */
export default async function CFGEditorAPI(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.hasPermission('server.cfg.editor')) {
        return ctx.send<CFGEditorApiResp>({
            success: false,
            error: 'You don\'t have permission to view this page.',
        });
    }

    //Check if file is set
    if (!txCore.fxRunner.isConfigured) {
        return ctx.send<CFGEditorApiResp>({
            success: false,
            error: 'You need to configure your server data path before being able to edit the CFG file.',
        });
    }

    //Read cfg file
    try {
        if (!txConfig.server.cfgPath || !txConfig.server.dataPath) {
            return ctx.send<CFGEditorApiResp>({
                success: false,
                error: 'Server configuration path is not set.',
            });
        }
        
        let cfgFilePath = resolveCFGFilePath(txConfig.server.cfgPath, txConfig.server.dataPath);
        const cfgContent = await readRawCFGFile(cfgFilePath);
        
        return ctx.send<CFGEditorApiResp>({
            success: true,
            cfgContent,
            canRestart: ctx.admin.hasPermission('control.server'),
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return ctx.send<CFGEditorApiResp>({
            success: false,
            error: `Failed to read CFG File: ${errorMessage}`,
        });
    }
}; 