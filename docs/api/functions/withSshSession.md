[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / withSshSession

# Function: withSshSession()

> **withSshSession**\<`T`\>(`connection`, `callback`, `clientFactory?`): `Promise`\<`T`\>

Defined in: [ssh.ts:310](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L310)

## Type Parameters

### T

`T`

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

### callback

(`session`) => `Promise`\<`T`\>

### clientFactory?

() => [`SshClientLike`](../interfaces/SshClientLike.md)

## Returns

`Promise`\<`T`\>
