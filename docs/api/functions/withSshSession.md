[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / withSshSession

# Function: withSshSession()

> **withSshSession**\<`T`\>(`connection`, `callback`, `clientFactory?`, `signal?`): `Promise`\<`T`\>

Defined in: [ssh.ts:501](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L501)

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

### signal?

`AbortSignal`

## Returns

`Promise`\<`T`\>
