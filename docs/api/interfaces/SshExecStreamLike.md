[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / SshExecStreamLike

# Interface: SshExecStreamLike

Defined in: [ssh.ts:29](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L29)

## Properties

### stderr

> **stderr**: `object`

Defined in: [ssh.ts:30](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L30)

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

Defined in: [ssh.ts:33](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L33)

##### Parameters

###### event

`"data"`

###### listener

(`chunk`) => `void`

##### Returns

`this`

#### Call Signature

> **on**(`event`, `listener`): `this`

Defined in: [ssh.ts:34](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L34)

##### Parameters

###### event

`"close"`

###### listener

(`code?`) => `void`

##### Returns

`this`

#### Call Signature

> **on**(`event`, `listener`): `this`

Defined in: [ssh.ts:35](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L35)

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

Defined in: [ssh.ts:36](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/ssh.ts#L36)

#### Returns

`void`
