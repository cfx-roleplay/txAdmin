import type { AuthedCtx } from '@modules/WebServer/ctxTypes';
import type { GenericApiErrorResp } from '@shared/genericApiTypes';

export type ServerLogDataApiResp = {
    success: true;
    canDownload: boolean;
    initialLog: any[];
} | {
    success: false;
    error: string;
};

/**
 * Returns the server log data for the React page
 */
export default async function ServerLogData(ctx: AuthedCtx) {
    const sendTypedResp = (data: ServerLogDataApiResp | GenericApiErrorResp) => ctx.send(data);

    // Check permissions
    if (!ctx.admin.hasPermission('server.log.view')) {
        return sendTypedResp({ error: 'You don\'t have permission to view server logs.' });
    }

    try {
        // Get recent server log buffer
        const initialLog = txCore.logger.server.getRecentBuffer(500);
        const canDownload = ctx.admin.hasPermission('console.view'); // Download permission check

        return sendTypedResp({
            success: true,
            canDownload,
            initialLog,
        });
    } catch (error) {
        console.error('Error fetching server log data:', error);
        return sendTypedResp({
            success: false,
            error: 'Failed to fetch server log data.',
        });
    }
} 