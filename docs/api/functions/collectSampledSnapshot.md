[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / collectSampledSnapshot

# Function: collectSampledSnapshot()

> **collectSampledSnapshot**(`connection`, `durationMinutes`, `intervalSeconds?`, `runner?`, `options?`): `Promise`\<[`MetricSnapshot`](../interfaces/MetricSnapshot.md)\>

Defined in: [collector.ts:246](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L246)

## Parameters

### connection

#### host

`string` = `...`

#### port

`number` = `...`

#### username

`string` = `...`

#### password?

`string` = `...`

#### privateKey?

`string` = `...`

#### passphrase?

`string` = `...`

#### hostKeySha256?

`string` = `...`

#### knownHostsPath?

`string` = `...`

### durationMinutes

`number`

### intervalSeconds?

`number` = `30`

### runner?

[`CollectorRunner`](../interfaces/CollectorRunner.md) = `...`

### options?

[`CollectionOptions`](../interfaces/CollectionOptions.md) = `DEFAULT_COLLECTION_OPTIONS`

## Returns

`Promise`\<[`MetricSnapshot`](../interfaces/MetricSnapshot.md)\>
