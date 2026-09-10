import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AgentPlan, AgentPlanDetail, AgentPlanInput, AuditEvent, DashboardSummary, ExecutionArtifact, ExecutionEvent, ExecutionRun, HealthStatus, PlanDecisionInput, ReplanInput, Run, RunInput, Scenario, ShortUrl, UrlAnalytics, UrlInput } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
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
export declare const getGetDashboardUrl: () => string;
/**
 * @summary Get control room dashboard
 */
export declare const getDashboard: (options?: Parameters<typeof customFetch>[1]) => Promise<DashboardSummary>;
export declare const getGetDashboardQueryKey: () => readonly ["/api/dashboard"];
export declare const getGetDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;
export type GetDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Get control room dashboard
 */
export declare function useGetDashboard<TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListScenariosUrl: () => string;
/**
 * @summary List engineering scenarios
 */
export declare const listScenarios: (options?: Parameters<typeof customFetch>[1]) => Promise<Scenario[]>;
export declare const getListScenariosQueryKey: () => readonly ["/api/scenarios"];
export declare const getListScenariosQueryOptions: <TData = Awaited<ReturnType<typeof listScenarios>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listScenarios>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listScenarios>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListScenariosQueryResult = NonNullable<Awaited<ReturnType<typeof listScenarios>>>;
export type ListScenariosQueryError = ErrorType<unknown>;
/**
 * @summary List engineering scenarios
 */
export declare function useListScenarios<TData = Awaited<ReturnType<typeof listScenarios>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listScenarios>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListRunsUrl: () => string;
/**
 * @summary List orchestration runs
 */
export declare const listRuns: (options?: Parameters<typeof customFetch>[1]) => Promise<Run[]>;
export declare const getListRunsQueryKey: () => readonly ["/api/runs"];
export declare const getListRunsQueryOptions: <TData = Awaited<ReturnType<typeof listRuns>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRuns>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRuns>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRunsQueryResult = NonNullable<Awaited<ReturnType<typeof listRuns>>>;
export type ListRunsQueryError = ErrorType<unknown>;
/**
 * @summary List orchestration runs
 */
export declare function useListRuns<TData = Awaited<ReturnType<typeof listRuns>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRuns>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateRunUrl: () => string;
/**
 * @summary Start an orchestration run
 */
export declare const createRun: (runInput: RunInput, options?: Parameters<typeof customFetch>[1]) => Promise<Run>;
export declare const getCreateRunMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRun>>, TError, {
        data: BodyType<RunInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRun>>, TError, {
    data: BodyType<RunInput>;
}, TContext>;
export type CreateRunMutationResult = NonNullable<Awaited<ReturnType<typeof createRun>>>;
export type CreateRunMutationBody = BodyType<RunInput>;
export type CreateRunMutationError = ErrorType<unknown>;
/**
* @summary Start an orchestration run
*/
export declare const useCreateRun: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRun>>, TError, {
        data: BodyType<RunInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRun>>, TError, {
    data: BodyType<RunInput>;
}, TContext>;
export declare const getApproveRunUrl: (runId: string) => string;
/**
 * @summary Approve a human checkpoint
 */
export declare const approveRun: (runId: string, options?: Parameters<typeof customFetch>[1]) => Promise<Run>;
export declare const getApproveRunMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof approveRun>>, TError, {
    runId: string;
}, TContext>;
export type ApproveRunMutationResult = NonNullable<Awaited<ReturnType<typeof approveRun>>>;
export type ApproveRunMutationError = ErrorType<unknown>;
/**
* @summary Approve a human checkpoint
*/
export declare const useApproveRun: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof approveRun>>, TError, {
    runId: string;
}, TContext>;
export declare const getRetryRunUrl: (runId: string) => string;
/**
 * @summary Retry a failed task
 */
export declare const retryRun: (runId: string, options?: Parameters<typeof customFetch>[1]) => Promise<Run>;
export declare const getRetryRunMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof retryRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof retryRun>>, TError, {
    runId: string;
}, TContext>;
export type RetryRunMutationResult = NonNullable<Awaited<ReturnType<typeof retryRun>>>;
export type RetryRunMutationError = ErrorType<unknown>;
/**
* @summary Retry a failed task
*/
export declare const useRetryRun: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof retryRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof retryRun>>, TError, {
    runId: string;
}, TContext>;
export declare const getRollbackRunUrl: (runId: string) => string;
/**
 * @summary Roll back a run to its last safe checkpoint
 */
export declare const rollbackRun: (runId: string, options?: Parameters<typeof customFetch>[1]) => Promise<Run>;
export declare const getRollbackRunMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rollbackRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof rollbackRun>>, TError, {
    runId: string;
}, TContext>;
export type RollbackRunMutationResult = NonNullable<Awaited<ReturnType<typeof rollbackRun>>>;
export type RollbackRunMutationError = ErrorType<unknown>;
/**
* @summary Roll back a run to its last safe checkpoint
*/
export declare const useRollbackRun: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof rollbackRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof rollbackRun>>, TError, {
    runId: string;
}, TContext>;
export declare const getStopRunUrl: (runId: string) => string;
/**
 * @summary Safely stop a run and block unfinished work
 */
export declare const stopRun: (runId: string, options?: Parameters<typeof customFetch>[1]) => Promise<Run>;
export declare const getStopRunMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stopRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof stopRun>>, TError, {
    runId: string;
}, TContext>;
export type StopRunMutationResult = NonNullable<Awaited<ReturnType<typeof stopRun>>>;
export type StopRunMutationError = ErrorType<unknown>;
/**
* @summary Safely stop a run and block unfinished work
*/
export declare const useStopRun: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stopRun>>, TError, {
        runId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof stopRun>>, TError, {
    runId: string;
}, TContext>;
export declare const getListUrlsUrl: () => string;
/**
 * @summary List shortened URLs
 */
export declare const listUrls: (options?: Parameters<typeof customFetch>[1]) => Promise<ShortUrl[]>;
export declare const getListUrlsQueryKey: () => readonly ["/api/urls"];
export declare const getListUrlsQueryOptions: <TData = Awaited<ReturnType<typeof listUrls>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUrls>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUrls>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUrlsQueryResult = NonNullable<Awaited<ReturnType<typeof listUrls>>>;
export type ListUrlsQueryError = ErrorType<unknown>;
/**
 * @summary List shortened URLs
 */
export declare function useListUrls<TData = Awaited<ReturnType<typeof listUrls>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUrls>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateUrlUrl: () => string;
/**
 * @summary Create a shortened URL
 */
export declare const createUrl: (urlInput: UrlInput, options?: Parameters<typeof customFetch>[1]) => Promise<ShortUrl>;
export declare const getCreateUrlMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUrl>>, TError, {
        data: BodyType<UrlInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createUrl>>, TError, {
    data: BodyType<UrlInput>;
}, TContext>;
export type CreateUrlMutationResult = NonNullable<Awaited<ReturnType<typeof createUrl>>>;
export type CreateUrlMutationBody = BodyType<UrlInput>;
export type CreateUrlMutationError = ErrorType<unknown>;
/**
* @summary Create a shortened URL
*/
export declare const useCreateUrl: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUrl>>, TError, {
        data: BodyType<UrlInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createUrl>>, TError, {
    data: BodyType<UrlInput>;
}, TContext>;
export declare const getGetUrlUrl: (slug: string) => string;
/**
 * @summary Resolve a shortened URL
 */
export declare const getUrl: (slug: string, options?: Parameters<typeof customFetch>[1]) => Promise<ShortUrl>;
export declare const getGetUrlQueryKey: (slug: string) => readonly [`/api/urls/${string}`];
export declare const getGetUrlQueryOptions: <TData = Awaited<ReturnType<typeof getUrl>>, TError = ErrorType<void>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUrl>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUrl>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUrlQueryResult = NonNullable<Awaited<ReturnType<typeof getUrl>>>;
export type GetUrlQueryError = ErrorType<void>;
/**
 * @summary Resolve a shortened URL
 */
export declare function useGetUrl<TData = Awaited<ReturnType<typeof getUrl>>, TError = ErrorType<void>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUrl>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getDeleteUrlUrl: (slug: string) => string;
/**
 * @summary Deactivate a shortened URL
 */
export declare const deleteUrl: (slug: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteUrlMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUrl>>, TError, {
        slug: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteUrl>>, TError, {
    slug: string;
}, TContext>;
export type DeleteUrlMutationResult = NonNullable<Awaited<ReturnType<typeof deleteUrl>>>;
export type DeleteUrlMutationError = ErrorType<unknown>;
/**
* @summary Deactivate a shortened URL
*/
export declare const useDeleteUrl: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUrl>>, TError, {
        slug: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteUrl>>, TError, {
    slug: string;
}, TContext>;
export declare const getGetUrlAnalyticsUrl: (slug: string) => string;
/**
 * @summary Get analytics for a shortened URL
 */
export declare const getUrlAnalytics: (slug: string, options?: Parameters<typeof customFetch>[1]) => Promise<UrlAnalytics>;
export declare const getGetUrlAnalyticsQueryKey: (slug: string) => readonly [`/api/urls/${string}/analytics`];
export declare const getGetUrlAnalyticsQueryOptions: <TData = Awaited<ReturnType<typeof getUrlAnalytics>>, TError = ErrorType<unknown>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUrlAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUrlAnalytics>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUrlAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof getUrlAnalytics>>>;
export type GetUrlAnalyticsQueryError = ErrorType<unknown>;
/**
 * @summary Get analytics for a shortened URL
 */
export declare function useGetUrlAnalytics<TData = Awaited<ReturnType<typeof getUrlAnalytics>>, TError = ErrorType<unknown>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUrlAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListActivityUrl: () => string;
/**
 * @summary List recent audit events
 */
export declare const listActivity: (options?: Parameters<typeof customFetch>[1]) => Promise<AuditEvent[]>;
export declare const getListActivityQueryKey: () => readonly ["/api/activity"];
export declare const getListActivityQueryOptions: <TData = Awaited<ReturnType<typeof listActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListActivityQueryResult = NonNullable<Awaited<ReturnType<typeof listActivity>>>;
export type ListActivityQueryError = ErrorType<unknown>;
/**
 * @summary List recent audit events
 */
export declare function useListActivity<TData = Awaited<ReturnType<typeof listActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAgentPlanUrl: () => string;
/**
 * @summary Generate and persist an AI engineering plan for operator review
 */
export declare const createAgentPlan: (agentPlanInput: AgentPlanInput, options?: Parameters<typeof customFetch>[1]) => Promise<AgentPlan>;
export declare const getCreateAgentPlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAgentPlan>>, TError, {
        data: BodyType<AgentPlanInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAgentPlan>>, TError, {
    data: BodyType<AgentPlanInput>;
}, TContext>;
export type CreateAgentPlanMutationResult = NonNullable<Awaited<ReturnType<typeof createAgentPlan>>>;
export type CreateAgentPlanMutationBody = BodyType<AgentPlanInput>;
export type CreateAgentPlanMutationError = ErrorType<unknown>;
/**
* @summary Generate and persist an AI engineering plan for operator review
*/
export declare const useCreateAgentPlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAgentPlan>>, TError, {
        data: BodyType<AgentPlanInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAgentPlan>>, TError, {
    data: BodyType<AgentPlanInput>;
}, TContext>;
export declare const getGetAgentPlanUrl: (planId: string) => string;
/**
 * @summary Retrieve a plan and its immutable revisions
 */
export declare const getAgentPlan: (planId: string, options?: Parameters<typeof customFetch>[1]) => Promise<AgentPlanDetail>;
export declare const getGetAgentPlanQueryKey: (planId: string) => readonly [`/api/agent/plans/${string}`];
export declare const getGetAgentPlanQueryOptions: <TData = Awaited<ReturnType<typeof getAgentPlan>>, TError = ErrorType<unknown>>(planId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAgentPlan>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAgentPlan>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAgentPlanQueryResult = NonNullable<Awaited<ReturnType<typeof getAgentPlan>>>;
export type GetAgentPlanQueryError = ErrorType<unknown>;
/**
 * @summary Retrieve a plan and its immutable revisions
 */
export declare function useGetAgentPlan<TData = Awaited<ReturnType<typeof getAgentPlan>>, TError = ErrorType<unknown>>(planId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAgentPlan>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getDecideAgentPlanUrl: (planId: string) => string;
/**
 * @summary Scope-bound approval or feedback rejection
 */
export declare const decideAgentPlan: (planId: string, planDecisionInput: PlanDecisionInput, options?: Parameters<typeof customFetch>[1]) => Promise<ExecutionRun | AgentPlan>;
export declare const getDecideAgentPlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof decideAgentPlan>>, TError, {
        planId: string;
        data: BodyType<PlanDecisionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof decideAgentPlan>>, TError, {
    planId: string;
    data: BodyType<PlanDecisionInput>;
}, TContext>;
export type DecideAgentPlanMutationResult = NonNullable<Awaited<ReturnType<typeof decideAgentPlan>>>;
export type DecideAgentPlanMutationBody = BodyType<PlanDecisionInput>;
export type DecideAgentPlanMutationError = ErrorType<unknown>;
/**
* @summary Scope-bound approval or feedback rejection
*/
export declare const useDecideAgentPlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof decideAgentPlan>>, TError, {
        planId: string;
        data: BodyType<PlanDecisionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof decideAgentPlan>>, TError, {
    planId: string;
    data: BodyType<PlanDecisionInput>;
}, TContext>;
export declare const getGetExecutionUrl: (executionId: string) => string;
/**
 * @summary Get autonomous execution detail
 */
export declare const getExecution: (executionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<ExecutionRun>;
export declare const getGetExecutionQueryKey: (executionId: string) => readonly [`/api/executions/${string}`];
export declare const getGetExecutionQueryOptions: <TData = Awaited<ReturnType<typeof getExecution>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExecution>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExecution>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExecutionQueryResult = NonNullable<Awaited<ReturnType<typeof getExecution>>>;
export type GetExecutionQueryError = ErrorType<unknown>;
/**
 * @summary Get autonomous execution detail
 */
export declare function useGetExecution<TData = Awaited<ReturnType<typeof getExecution>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExecution>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListExecutionEventsUrl: (executionId: string) => string;
export declare const listExecutionEvents: (executionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<ExecutionEvent[]>;
export declare const getListExecutionEventsQueryKey: (executionId: string) => readonly [`/api/executions/${string}/events`];
export declare const getListExecutionEventsQueryOptions: <TData = Awaited<ReturnType<typeof listExecutionEvents>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listExecutionEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listExecutionEvents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListExecutionEventsQueryResult = NonNullable<Awaited<ReturnType<typeof listExecutionEvents>>>;
export type ListExecutionEventsQueryError = ErrorType<unknown>;
export declare function useListExecutionEvents<TData = Awaited<ReturnType<typeof listExecutionEvents>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listExecutionEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListExecutionArtifactsUrl: (executionId: string) => string;
export declare const listExecutionArtifacts: (executionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<ExecutionArtifact[]>;
export declare const getListExecutionArtifactsQueryKey: (executionId: string) => readonly [`/api/executions/${string}/artifacts`];
export declare const getListExecutionArtifactsQueryOptions: <TData = Awaited<ReturnType<typeof listExecutionArtifacts>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listExecutionArtifacts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listExecutionArtifacts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListExecutionArtifactsQueryResult = NonNullable<Awaited<ReturnType<typeof listExecutionArtifacts>>>;
export type ListExecutionArtifactsQueryError = ErrorType<unknown>;
export declare function useListExecutionArtifacts<TData = Awaited<ReturnType<typeof listExecutionArtifacts>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listExecutionArtifacts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getReplanExecutionUrl: (executionId: string) => string;
export declare const replanExecution: (executionId: string, replanInput: ReplanInput, options?: Parameters<typeof customFetch>[1]) => Promise<AgentPlan>;
export declare const getReplanExecutionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof replanExecution>>, TError, {
        executionId: string;
        data: BodyType<ReplanInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof replanExecution>>, TError, {
    executionId: string;
    data: BodyType<ReplanInput>;
}, TContext>;
export type ReplanExecutionMutationResult = NonNullable<Awaited<ReturnType<typeof replanExecution>>>;
export type ReplanExecutionMutationBody = BodyType<ReplanInput>;
export type ReplanExecutionMutationError = ErrorType<unknown>;
export declare const useReplanExecution: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof replanExecution>>, TError, {
        executionId: string;
        data: BodyType<ReplanInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof replanExecution>>, TError, {
    executionId: string;
    data: BodyType<ReplanInput>;
}, TContext>;
export declare const getStopExecutionUrl: (executionId: string) => string;
export declare const stopExecution: (executionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<ExecutionRun>;
export declare const getStopExecutionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stopExecution>>, TError, {
        executionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof stopExecution>>, TError, {
    executionId: string;
}, TContext>;
export type StopExecutionMutationResult = NonNullable<Awaited<ReturnType<typeof stopExecution>>>;
export type StopExecutionMutationError = ErrorType<unknown>;
export declare const useStopExecution: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stopExecution>>, TError, {
        executionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof stopExecution>>, TError, {
    executionId: string;
}, TContext>;
export declare const getGetExecutionReceiptUrl: (executionId: string) => string;
export declare const getExecutionReceipt: (executionId: string, options?: Parameters<typeof customFetch>[1]) => Promise<ExecutionArtifact>;
export declare const getGetExecutionReceiptQueryKey: (executionId: string) => readonly [`/api/executions/${string}/receipt`];
export declare const getGetExecutionReceiptQueryOptions: <TData = Awaited<ReturnType<typeof getExecutionReceipt>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExecutionReceipt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExecutionReceipt>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExecutionReceiptQueryResult = NonNullable<Awaited<ReturnType<typeof getExecutionReceipt>>>;
export type GetExecutionReceiptQueryError = ErrorType<unknown>;
export declare function useGetExecutionReceipt<TData = Awaited<ReturnType<typeof getExecutionReceipt>>, TError = ErrorType<unknown>>(executionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExecutionReceipt>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map