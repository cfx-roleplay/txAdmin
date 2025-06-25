import { useBackendApi } from './fetch';

export type CFGEditorApiResp = {
    success: true;
    cfgContent: string;
    canRestart: boolean;
} | {
    success: false;
    error: string;
};

export type CFGEditorSaveReq = {
    cfgData: string;
};

export const useCfgEditorApi = () => {
    return useBackendApi<CFGEditorApiResp>({
        method: 'GET',
        path: '/cfgEditor',
    });
};

export const useCfgEditorSaveApi = () => {
    return useBackendApi<any, CFGEditorSaveReq>({
        method: 'POST',
        path: '/cfgEditor/save',
    });
}; 