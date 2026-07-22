[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / SshClientLike

# Interface: SshClientLike

Defined in: [ssh.ts:39](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L39)

## Methods

### exec()

> **exec**(`command`, `callback`): `void`

Defined in: [ssh.ts:40](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L40)

#### Parameters

##### command

`string`

##### callback

(`error`, `stream`) => `void`

#### Returns

`void`

***

### once()

#### Call Signature

> **once**(`event`, `listener`): `this`

Defined in: [ssh.ts:44](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L44)

##### Parameters

###### event

`"ready"`

###### listener

() => `void`

##### Returns

`this`

#### Call Signature

> **once**(`event`, `listener`): `this`

Defined in: [ssh.ts:45](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L45)

##### Parameters

###### event

`"error"`

###### listener

(`error`) => `void`

##### Returns

`this`

***

### removeListener()

#### Call Signature

> **removeListener**(`event`, `listener`): `this`

Defined in: [ssh.ts:46](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L46)

##### Parameters

###### event

`"ready"`

###### listener

() => `void`

##### Returns

`this`

#### Call Signature

> **removeListener**(`event`, `listener`): `this`

Defined in: [ssh.ts:47](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L47)

##### Parameters

###### event

`"error"`

###### listener

(`error`) => `void`

##### Returns

`this`

***

### connect()

> **connect**(`config`): `void`

Defined in: [ssh.ts:48](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L48)

#### Parameters

##### config

`ConnectConfig`

#### Returns

`void`

***

### end()

> **end**(): `void`

Defined in: [ssh.ts:49](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L49)

#### Returns

`void`
