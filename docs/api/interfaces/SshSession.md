[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / SshSession

# Interface: SshSession

Defined in: [ssh.ts:24](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L24)

## Methods

### exec()

> **exec**(`command`, `timeoutMs?`): `Promise`\<[`CommandResult`](CommandResult.md)\>

Defined in: [ssh.ts:25](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L25)

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

Defined in: [ssh.ts:26](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L26)

#### Returns

`void`
