[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / SshSession

# Interface: SshSession

Defined in: [ssh.ts:22](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L22)

## Methods

### exec()

> **exec**(`command`, `timeoutMs?`): `Promise`\<[`CommandResult`](CommandResult.md)\>

Defined in: [ssh.ts:23](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L23)

#### Parameters

##### command

`string`

##### timeoutMs?

`number`

#### Returns

`Promise`\<[`CommandResult`](CommandResult.md)\>

***

### close()

> **close**(): `void`

Defined in: [ssh.ts:24](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L24)

#### Returns

`void`
