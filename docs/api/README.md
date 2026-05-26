**mcp-infra-lens v1.0.6**

***

# mcp-infra-lens v1.0.6

## Interfaces

- [RawMetricOutput](interfaces/RawMetricOutput.md)
- [CollectorRunner](interfaces/CollectorRunner.md)
- [ToolDefinition](interfaces/ToolDefinition.md)
- [ToolRegistrar](interfaces/ToolRegistrar.md)
- [ToolDependencies](interfaces/ToolDependencies.md)
- [ToolDefinitionOptions](interfaces/ToolDefinitionOptions.md)
- [CommandResult](interfaces/CommandResult.md)
- [SshSession](interfaces/SshSession.md)
- [SshExecStreamLike](interfaces/SshExecStreamLike.md)
- [SshClientLike](interfaces/SshClientLike.md)
- [InfraLensConnectConfig](interfaces/InfraLensConnectConfig.md)
- [CollectionOptions](interfaces/CollectionOptions.md)
- [AnalysisThresholds](interfaces/AnalysisThresholds.md)
- [DiskMetric](interfaces/DiskMetric.md)
- [NetworkMetric](interfaces/NetworkMetric.md)
- [ProcessMetric](interfaces/ProcessMetric.md)
- [MetricSnapshot](interfaces/MetricSnapshot.md)
- [Anomaly](interfaces/Anomaly.md)
- [StoredSnapshotRow](interfaces/StoredSnapshotRow.md)

## Type Aliases

- [ToolContent](type-aliases/ToolContent.md)
- [ToolHandler](type-aliases/ToolHandler.md)
- [ToolConfig](type-aliases/ToolConfig.md)
- [ToolDefinitionTuple](type-aliases/ToolDefinitionTuple.md)
- [ConnectionInput](type-aliases/ConnectionInput.md)
- [AnalyzeInput](type-aliases/AnalyzeInput.md)
- [SnapshotInput](type-aliases/SnapshotInput.md)
- [BaselineInput](type-aliases/BaselineInput.md)
- [CompareInput](type-aliases/CompareInput.md)
- [GetHistoryInput](type-aliases/GetHistoryInput.md)
- [MetricName](type-aliases/MetricName.md)
- [RuntimeProfile](type-aliases/RuntimeProfile.md)

## Variables

- [toolDefinitions](variables/toolDefinitions.md)
- [ConnectionSchema](variables/ConnectionSchema.md)
- [SafeConnectionSchema](variables/SafeConnectionSchema.md)
- [AnalyzeSchema](variables/AnalyzeSchema.md)
- [SnapshotSchema](variables/SnapshotSchema.md)
- [BaselineSchema](variables/BaselineSchema.md)
- [CompareSchema](variables/CompareSchema.md)
- [MetricNameSchema](variables/MetricNameSchema.md)
- [GetHistorySchema](variables/GetHistorySchema.md)
- [DEFAULT\_THRESHOLDS](variables/DEFAULT_THRESHOLDS.md)

## Functions

- [analyzeSnapshot](functions/analyzeSnapshot.md)
- [saveSnapshot](functions/saveSnapshot.md)
- [getBaseline](functions/getBaseline.md)
- [getHistory](functions/getHistory.md)
- [collectSnapshot](functions/collectSnapshot.md)
- [collectSampledSnapshot](functions/collectSampledSnapshot.md)
- [resolveDatabasePath](functions/resolveDatabasePath.md)
- [getDatabase](functions/getDatabase.md)
- [closeAllDatabases](functions/closeAllDatabases.md)
- [createToolDefinitions](functions/createToolDefinitions.md)
- [registerInfraLensTools](functions/registerInfraLensTools.md)
- [registerToolsOnServer](functions/registerToolsOnServer.md)
- [createConnectConfig](functions/createConnectConfig.md)
- [withSshSession](functions/withSshSession.md)
- [getPackageVersion](functions/getPackageVersion.md)
