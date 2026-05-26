[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / SshClientLike

# Interface: SshClientLike

Defined in: [ssh.ts:37](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L37)

## Methods

### exec()

> **exec**(`command`, `callback`): `void`

Defined in: [ssh.ts:38](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L38)

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

Defined in: [ssh.ts:42](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L42)

##### Parameters

###### event

`"ready"`

###### listener

() => `void`

##### Returns

`this`

#### Call Signature

> **once**(`event`, `listener`): `this`

Defined in: [ssh.ts:43](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L43)

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

Defined in: [ssh.ts:44](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L44)

#### Parameters

##### config

`ConnectConfig`

#### Returns

`void`

***

### end()

> **end**(): `void`

Defined in: [ssh.ts:45](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L45)

#### Returns

`void`
