import { useBackendApi } from './fetch';

export type ResourceData = {
    name: string;
    divName: string;
    status: 'started' | 'stopped' | 'error';
    statusClass: 'success' | 'danger' | 'warning';
    version: string;
    author: string;
    description: string;
};

export type ResourceGroup = {
    subPath: string;
    divName: string;
    resources: ResourceData[];
};

export type ResourcesApiResp = {
    success: true;
    resourceGroups: ResourceGroup[];
    canManageResources: boolean;
} | {
    success: false;
    error: string;
};

export const useResourcesApi = () => {
    return useBackendApi<ResourcesApiResp>({
        method: 'GET',
        path: '/fxserver/resources',
    });
};

export const useResourcesRefreshApi = () => {
    return useBackendApi<ResourcesApiResp>({
        method: 'GET',
        path: '/fxserver/resources',
    });
};

export type ResourceCommandReq = {
    action: 'restart_res' | 'start_res' | 'stop_res' | 'ensure_res' | 'refresh_res';
    parameter: string;
};

export const useResourceCommandApi = () => {
    return useBackendApi<any, ResourceCommandReq>({
        method: 'POST',
        path: '/fxserver/commands',
    });
}; 