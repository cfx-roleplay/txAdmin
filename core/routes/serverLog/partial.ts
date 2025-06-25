import type { AuthedCtx } from '@modules/WebServer/ctxTypes';
import type { GenericApiErrorResp } from '@shared/genericApiTypes';

export type ServerLogPartialApiResp = {
    success: true;
    boundry: boolean;
    log: any[];
} | {
    success: false;
    error: string;
};

/**
 * Returns partial server log data for pagination
 * Supports fetching older/newer log entries relative to a timestamp reference
 */
export default async function ServerLogPartial(ctx: AuthedCtx) {
    const sendTypedResp = (data: ServerLogPartialApiResp | GenericApiErrorResp) => ctx.send(data);

    // Check permissions
    if (!ctx.admin.hasPermission('server.log.view')) {
        return sendTypedResp({ error: 'You don\'t have permission to call this endpoint.' });
    }

    const isDigit = /^\d{13}$/;
    const sliceSize = 500;
    const { dir, ref } = ctx.request.query as { dir?: string; ref?: string };

    try {
        if (dir === 'older' && ref && isDigit.test(ref)) {
            const log = txCore.logger.server.readPartialOlder(parseInt(ref), sliceSize);
            return sendTypedResp({
                success: true,
                boundry: log.length < sliceSize,
                log,
            });
        } else if (dir === 'newer' && ref && isDigit.test(ref)) {
            const log = txCore.logger.server.readPartialNewer(parseInt(ref), sliceSize);
            return sendTypedResp({
                success: true,
                boundry: log.length < sliceSize,
                log,
            });
        } else {
            return sendTypedResp({
                success: true,
                boundry: true,
                log: txCore.logger.server.getRecentBuffer(500),
            });
        }
    } catch (error) {
        console.error('Error fetching partial server log:', error);
        return sendTypedResp({
            success: false,
            error: 'Failed to fetch server log data.',
        });
    }
} 