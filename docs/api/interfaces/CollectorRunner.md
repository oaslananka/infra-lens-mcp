[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / CollectorRunner

# Interface: CollectorRunner

Defined in: [collector.ts:23](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L23)

Pluggable collector runner used by tests and SSH-backed collection.

## Methods

### run()

> **run**(`connection`, `options`): `Promise`\<[`RawMetricOutput`](RawMetricOutput.md)\>

Defined in: [collector.ts:24](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L24)

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

#### Returns

`Promise`\<[`RawMetricOutput`](RawMetricOutput.md)\>
