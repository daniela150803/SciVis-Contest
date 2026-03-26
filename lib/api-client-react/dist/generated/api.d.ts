import type { QueryKey, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { GetGlobeDataParams, GetHumidityDataParams, GetTemperatureDataParams, GlobeDataResponse, HealthStatus, HumidityDataResponse, RegionsResponse, ScenariosResponse, TemperatureDataResponse } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Returns air temperature data by year and region from 2015 to 2100
 * @summary Get global temperature data
 */
export declare const getGetTemperatureDataUrl: (params?: GetTemperatureDataParams) => string;
export declare const getTemperatureData: (params?: GetTemperatureDataParams, options?: RequestInit) => Promise<TemperatureDataResponse>;
export declare const getGetTemperatureDataQueryKey: (params?: GetTemperatureDataParams) => readonly ["/api/climate/temperature", ...GetTemperatureDataParams[]];
export declare const getGetTemperatureDataQueryOptions: <TData = Awaited<ReturnType<typeof getTemperatureData>>, TError = ErrorType<unknown>>(params?: GetTemperatureDataParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTemperatureData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTemperatureData>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTemperatureDataQueryResult = NonNullable<Awaited<ReturnType<typeof getTemperatureData>>>;
export type GetTemperatureDataQueryError = ErrorType<unknown>;
/**
 * @summary Get global temperature data
 */
export declare function useGetTemperatureData<TData = Awaited<ReturnType<typeof getTemperatureData>>, TError = ErrorType<unknown>>(params?: GetTemperatureDataParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTemperatureData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Returns humidity data across different global regions
 * @summary Get humidity data by region
 */
export declare const getGetHumidityDataUrl: (params?: GetHumidityDataParams) => string;
export declare const getHumidityData: (params?: GetHumidityDataParams, options?: RequestInit) => Promise<HumidityDataResponse>;
export declare const getGetHumidityDataQueryKey: (params?: GetHumidityDataParams) => readonly ["/api/climate/humidity", ...GetHumidityDataParams[]];
export declare const getGetHumidityDataQueryOptions: <TData = Awaited<ReturnType<typeof getHumidityData>>, TError = ErrorType<unknown>>(params?: GetHumidityDataParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getHumidityData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getHumidityData>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetHumidityDataQueryResult = NonNullable<Awaited<ReturnType<typeof getHumidityData>>>;
export type GetHumidityDataQueryError = ErrorType<unknown>;
/**
 * @summary Get humidity data by region
 */
export declare function useGetHumidityData<TData = Awaited<ReturnType<typeof getHumidityData>>, TError = ErrorType<unknown>>(params?: GetHumidityDataParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getHumidityData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Returns gridded temperature data for 3D globe visualization
 * @summary Get globe heatmap data
 */
export declare const getGetGlobeDataUrl: (params?: GetGlobeDataParams) => string;
export declare const getGlobeData: (params?: GetGlobeDataParams, options?: RequestInit) => Promise<GlobeDataResponse>;
export declare const getGetGlobeDataQueryKey: (params?: GetGlobeDataParams) => readonly ["/api/climate/globe", ...GetGlobeDataParams[]];
export declare const getGetGlobeDataQueryOptions: <TData = Awaited<ReturnType<typeof getGlobeData>>, TError = ErrorType<unknown>>(params?: GetGlobeDataParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGlobeData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGlobeData>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGlobeDataQueryResult = NonNullable<Awaited<ReturnType<typeof getGlobeData>>>;
export type GetGlobeDataQueryError = ErrorType<unknown>;
/**
 * @summary Get globe heatmap data
 */
export declare function useGetGlobeData<TData = Awaited<ReturnType<typeof getGlobeData>>, TError = ErrorType<unknown>>(params?: GetGlobeDataParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGlobeData>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Returns list of all available regions with their metadata
 * @summary Get available regions
 */
export declare const getGetRegionsUrl: () => string;
export declare const getRegions: (options?: RequestInit) => Promise<RegionsResponse>;
export declare const getGetRegionsQueryKey: () => readonly ["/api/climate/regions"];
export declare const getGetRegionsQueryOptions: <TData = Awaited<ReturnType<typeof getRegions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRegions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRegions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRegionsQueryResult = NonNullable<Awaited<ReturnType<typeof getRegions>>>;
export type GetRegionsQueryError = ErrorType<unknown>;
/**
 * @summary Get available regions
 */
export declare function useGetRegions<TData = Awaited<ReturnType<typeof getRegions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRegions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Returns available climate scenarios (SSP pathways)
 * @summary Get climate scenarios
 */
export declare const getGetScenariosUrl: () => string;
export declare const getScenarios: (options?: RequestInit) => Promise<ScenariosResponse>;
export declare const getGetScenariosQueryKey: () => readonly ["/api/climate/scenarios"];
export declare const getGetScenariosQueryOptions: <TData = Awaited<ReturnType<typeof getScenarios>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getScenarios>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getScenarios>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetScenariosQueryResult = NonNullable<Awaited<ReturnType<typeof getScenarios>>>;
export type GetScenariosQueryError = ErrorType<unknown>;
/**
 * @summary Get climate scenarios
 */
export declare function useGetScenarios<TData = Awaited<ReturnType<typeof getScenarios>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getScenarios>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map