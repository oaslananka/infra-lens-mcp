[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / collectSnapshot

# Function: collectSnapshot()

> **collectSnapshot**(`connection`, `runner?`, `options?`, `signal?`): `Promise`\<[`MetricSnapshot`](../interfaces/MetricSnapshot.md)\>

Defined in: [collector.ts:440](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L440)

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

### runner?

[`CollectorRunner`](../interfaces/CollectorRunner.md) = `...`

### options?

[`CollectionOptions`](../interfaces/CollectionOptions.md) = `DEFAULT_COLLECTION_OPTIONS`

### signal?

`AbortSignal`

## Returns

`Promise`\<[`MetricSnapshot`](../interfaces/MetricSnapshot.md)\>
