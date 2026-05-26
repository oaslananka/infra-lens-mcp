[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / SshExecStreamLike

# Interface: SshExecStreamLike

Defined in: [ssh.ts:27](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L27)

## Properties

### stderr

> **stderr**: `object`

Defined in: [ssh.ts:28](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L28)

#### on()

> **on**(`event`, `listener`): `void`

##### Parameters

###### event

`"data"`

###### listener

(`chunk`) => `void`

##### Returns

`void`

## Methods

### on()

#### Call Signature

> **on**(`event`, `listener`): `this`

Defined in: [ssh.ts:31](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L31)

##### Parameters

###### event

`"data"`

###### listener

(`chunk`) => `void`

##### Returns

`this`

#### Call Signature

> **on**(`event`, `listener`): `this`

Defined in: [ssh.ts:32](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L32)

##### Parameters

###### event

`"close"`

###### listener

(`code?`) => `void`

##### Returns

`this`

#### Call Signature

> **on**(`event`, `listener`): `this`

Defined in: [ssh.ts:33](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L33)

##### Parameters

###### event

`"error"`

###### listener

(`error`) => `void`

##### Returns

`this`

***

### close()

> **close**(): `void`

Defined in: [ssh.ts:34](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L34)

#### Returns

`void`
