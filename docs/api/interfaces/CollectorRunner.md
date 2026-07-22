[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / CollectorRunner

# Interface: CollectorRunner

Defined in: [collector.ts:46](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L46)

Pluggable collector runner used by tests and SSH-backed collection.

## Methods

### run()

> **run**(`connection`, `options`, `signal?`): `Promise`\<[`RawMetricOutput`](RawMetricOutput.md)\>

Defined in: [collector.ts:47](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L47)

#### Parameters

##### connection

###### host

`string` = `...`

###### port

`number` = `...`

###### username

`string` = `...`

###### password?

`string` = `...`

###### privateKey?

`string` = `...`

###### passphrase?

`string` = `...`

###### hostKeySha256?

`string` = `...`

###### knownHostsPath?

`string` = `...`

##### options

[`CollectionOptions`](CollectionOptions.md)

##### signal?

`AbortSignal`

#### Returns

`Promise`\<[`RawMetricOutput`](RawMetricOutput.md)\>

***

### inspectCapabilities()?

> `optional` **inspectCapabilities**(`connection`): `Promise`\<[`HostCapability`](HostCapability.md)[]\>

Defined in: [collector.ts:52](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L52)

#### Parameters

##### connection

###### host

`string` = `...`

###### port

`number` = `...`

###### username

`string` = `...`

###### password?

`string` = `...`

###### privateKey?

`string` = `...`

###### passphrase?

`string` = `...`

###### hostKeySha256?

`string` = `...`

###### knownHostsPath?

`string` = `...`

#### Returns

`Promise`\<[`HostCapability`](HostCapability.md)[]\>
