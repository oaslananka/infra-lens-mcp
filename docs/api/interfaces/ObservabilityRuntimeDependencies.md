[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / ObservabilityRuntimeDependencies

# Interface: ObservabilityRuntimeDependencies

Defined in: [observe.ts:25](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L25)

## Properties

### env?

> `optional` **env?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [observe.ts:26](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L26)

***

### createServer?

> `optional` **createServer?**: (`handler`) => [`HttpServer`](../type-aliases/HttpServer.md)

Defined in: [observe.ts:27](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L27)

#### Parameters

##### handler

`RequestListener`

#### Returns

[`HttpServer`](../type-aliases/HttpServer.md)

***

### readLatest?

> `optional` **readLatest?**: () => [`LatestObservationSnapshots`](LatestObservationSnapshots.md)

Defined in: [observe.ts:28](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L28)

#### Returns

[`LatestObservationSnapshots`](LatestObservationSnapshots.md)

***

### exportMetrics?

> `optional` **exportMetrics?**: (`options`) => `Promise`\<`void`\>

Defined in: [observe.ts:29](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L29)

#### Parameters

##### options

[`ExportOtlpMetricsOptions`](ExportOtlpMetricsOptions.md)

#### Returns

`Promise`\<`void`\>

***

### now?

> `optional` **now?**: () => `number`

Defined in: [observe.ts:30](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L30)

#### Returns

`number`

***

### setInterval?

> `optional` **setInterval?**: (`callback`, `intervalMs`) => `Timeout`

Defined in: [observe.ts:31](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L31)

#### Parameters

##### callback

() => `void`

##### intervalMs

`number`

#### Returns

`Timeout`

***

### clearInterval?

> `optional` **clearInterval?**: (`timer`) => `void`

Defined in: [observe.ts:32](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L32)

#### Parameters

##### timer

`Timeout`

#### Returns

`void`

***

### signals?

> `optional` **signals?**: [`SignalRegistrar`](SignalRegistrar.md)

Defined in: [observe.ts:33](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L33)

***

### exit?

> `optional` **exit?**: (`code`) => `void`

Defined in: [observe.ts:34](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L34)

#### Parameters

##### code

`number`

#### Returns

`void`

***

### logListening?

> `optional` **logListening?**: (`message`) => `void`

Defined in: [observe.ts:35](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L35)

#### Parameters

##### message

`string`

#### Returns

`void`

***

### logError?

> `optional` **logError?**: (`message`) => `void`

Defined in: [observe.ts:36](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L36)

#### Parameters

##### message

`string`

#### Returns

`void`
