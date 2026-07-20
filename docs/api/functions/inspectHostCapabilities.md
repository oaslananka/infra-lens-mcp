[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / inspectHostCapabilities

# Function: inspectHostCapabilities()

> **inspectHostCapabilities**(`connection`, `runner?`): `Promise`\<\{ `capabilities`: [`HostCapability`](../interfaces/HostCapability.md)[]; `warnings`: `string`[]; \}\>

Defined in: [collector.ts:318](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/collector.ts#L318)

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

## Returns

`Promise`\<\{ `capabilities`: [`HostCapability`](../interfaces/HostCapability.md)[]; `warnings`: `string`[]; \}\>
