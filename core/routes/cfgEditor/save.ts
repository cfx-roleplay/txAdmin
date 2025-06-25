const modulename = 'WebServer:CFGEditorSave';
import { validateModifyServerConfig } from '@lib/fxserver/fxsConfigHelper';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { ApiToastResp } from '@shared/genericApiTypes';
const console = consoleFactory(modulename);

const isUndefined = (x: any): x is undefined => (x === undefined);

/**
 * Saves the server.cfg
 */
export default async function CFGEditorSave(ctx: AuthedCtx) {
    //Sanity check
    if (
        isUndefined(ctx.request.body.cfgData)
        || typeof ctx.request.body.cfgData !== 'string'
    ) {
        return ctx.utils.error(400, 'Invalid Request');
    }

    //Check permissions
    if (!ctx.admin.testPermission('server.cfg.editor', modulename)) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'You don\'t have permission to execute this action.',
        });
    }

    //Check if file is set
    if (!txCore.fxRunner.isConfigured) {
        return ctx.send<ApiToastResp>({
            type: 'error', 
            msg: 'CFG or Server Data Path not defined. Configure it in the settings page first.',
        });
    }

    //Validating config contents + saving file and backup
    let result;
    try {
        if (!txConfig.server.cfgPath || !txConfig.server.dataPath) {
            return ctx.send<ApiToastResp>({
                type: 'error',
                msg: 'Server configuration path is not set.',
            });
        }
        
        result = await validateModifyServerConfig(
            ctx.request.body.cfgData,
            txConfig.server.cfgPath,
            txConfig.server.dataPath,
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: `Failed to save server.cfg: ${errorMessage}`,
        });
    }

    //Handle result
    if (result.errors) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: `Cannot save server.cfg due to error(s): ${result.errors}`,
        });
    }
    if (result.warnings) {
        return ctx.send<ApiToastResp>({
            type: 'warning',
            msg: `File saved, but there are warnings: ${result.warnings}`,
        });
    }
    return ctx.send<ApiToastResp>({
        type: 'success',
        msg: 'File saved successfully.',
    });
}; 