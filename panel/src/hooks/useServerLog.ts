import { useBackendApi } from './fetch';

export type ServerLogDataApiResp = {
    success: true;
    canDownload: boolean;
    initialLog: ServerLogEvent[];
} | {
    success: false;
    error: string;
};

export type ServerLogPartialApiResp = {
    success: true;
    boundry: boolean;
    log: ServerLogEvent[];
} | {
    success: false;
    error: string;
};

export type ServerLogEvent = {
    ts: number;
    type: string;
    src: {
        id: string | false;
        name: string;
    };
    msg: string;
};

export const useServerLogDataApi = () => {
    return useBackendApi<ServerLogDataApiResp>({
        method: 'GET',
        path: '/serverLog',
    });
};

export const useServerLogPartialApi = () => {
    return useBackendApi<ServerLogPartialApiResp>({
        method: 'GET',
        path: '/serverLog/history',
    });
}; 