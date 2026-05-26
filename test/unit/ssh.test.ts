import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  createConnectConfig,
  resetSshWarningStateForTests,
  withSshSession,
  type SshClientLike,
  type SshExecStreamLike
} from '../../src/ssh.js';

class FakeExecStream extends EventEmitter implements SshExecStreamLike {
  private readonly stderrEmitter = new EventEmitter();
  stderr: SshExecStreamLike['stderr'] = {
    on: (event, listener) => {
      this.stderrEmitter.on(event, listener);
    }
  };

  close(): void {}

  emitStderr(chunk: Buffer): void {
    this.stderrEmitter.emit('data', chunk);
  }
}

class FakeClient extends EventEmitter implements SshClientLike {
  ended = false;
  receivedConfig: unknown;

  constructor(
    private readonly execHandler: (
      command: string,
      callback: (error: Error | undefined, stream: SshExecStreamLike) => void
    ) => void
  ) {
    super();
  }

  exec(
    command: string,
    callback: (error: Error | undefined, stream: SshExecStreamLike) => void
  ): void {
    this.execHandler(command, callback);
  }

  connect(config: unknown): void {
    this.receivedConfig = config;
    queueMicrotask(() => {
      this.emit('ready');
    });
  }

  end(): void {
    this.ended = true;
  }
}

afterEach(() => {
  resetSshWarningStateForTests();
});

describe('ssh helpers', () => {
  it('builds strict connection config for password and private key authentication', () => {
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const passwordConfig = createConnectConfig({
      host: 'db.internal',
      port: 22,
      username: 'ops',
      password: 'secret'
    });
    const keyConfig = createConnectConfig({
      host: 'db.internal',
      port: 2222,
      username: 'ops',
      privateKey: 'KEY',
      passphrase: 'phrase'
    });

    expect(passwordConfig.port).toBe(22);
    expect(passwordConfig.password).toBe('secret');
    expect(passwordConfig.hostVerifier).toBeDefined();
    expect(keyConfig.port).toBe(2222);
    expect(keyConfig.privateKey).toBe('KEY');
    expect(keyConfig.passphrase).toBe('phrase');

    stderrSpy.mockRestore();
  });

  it('accepts pinned SHA256 host keys and rejects mismatches', () => {
    const key = Buffer.from('test-host-key');
    const config = createConnectConfig({
      host: 'db.internal',
      port: 22,
      username: 'ops',
      hostKeySha256: 'SHA256:V/wGqHTHSNb4BFrleEaT0jG2C+WQ+j9+BcxG9WeR+6I'
    });

    expect(config.hostVerifier?.(key)).toBe(true);
    expect(config.hostVerifier?.(Buffer.from('other-host-key'))).toBe(false);
  });

  it('normalizes padded pinned SHA256 host keys in linear time', () => {
    const key = Buffer.from('test-host-key');
    const paddedFingerprint = `sha256:V/wGqHTHSNb4BFrleEaT0jG2C+WQ+j9+BcxG9WeR+6I${'='.repeat(4096)}`;
    const config = createConnectConfig({
      host: 'db.internal',
      port: 22,
      username: 'ops',
      hostKeySha256: paddedFingerprint
    });

    expect(config.hostVerifier?.(key)).toBe(true);
  });

  it('rejects unknown hosts in strict mode when no matching known host or pin exists', () => {
    const config = createConnectConfig({
      host: 'db.internal',
      port: 22,
      username: 'ops'
    });

    expect(config.hostVerifier?.(Buffer.from('test-host-key'))).toBe(false);
  });

  it('expands tilde in known_hosts paths', () => {
    const tempHome = mkdtempSync(path.join(os.tmpdir(), 'mcp-infra-lens-home-'));
    const homeSpy = jest.spyOn(os, 'homedir').mockReturnValue(tempHome);
    const knownHostsDir = path.join(tempHome, '.ssh');
    const key = Buffer.from('test-host-key');

    mkdirSync(knownHostsDir, { recursive: true });
    writeFileSync(
      path.join(knownHostsDir, 'known_hosts'),
      `db.internal ssh-ed25519 ${key.toString('base64')}\n`
    );

    try {
      const config = createConnectConfig({
        host: 'db.internal',
        port: 22,
        username: 'ops',
        knownHostsPath: '~/.ssh/known_hosts'
      });

      expect(config.hostVerifier?.(key)).toBe(true);
    } finally {
      homeSpy.mockRestore();
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('executes SSH commands through the injected client and closes the session', async () => {
    const stream = new FakeExecStream();
    const client = new FakeClient((_command, callback) => {
      callback(undefined, stream);
      queueMicrotask(() => {
        stream.emit('data', Buffer.from(' hello '));
        stream.emitStderr(Buffer.from(' warning '));
        stream.emit('close');
      });
    });

    const result = await withSshSession(
      {
        host: 'db.internal',
        port: 22,
        username: 'ops',
        password: 'secret',
        hostKeySha256: 'SHA256:V/wGqHTHSNb4BFrleEaT0jG2C+WQ+j9+BcxG9WeR+6I'
      },
      async (session) => session.exec('uptime'),
      () => client
    );

    expect(result).toEqual({ stdout: 'hello', stderr: 'warning', code: 0 });
    expect(client.receivedConfig).toMatchObject({
      host: 'db.internal',
      port: 22,
      username: 'ops',
      password: 'secret'
    });
    expect(client.ended).toBe(true);
  });

  it('rethrows SSH command failures and still closes the session', async () => {
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const client = new FakeClient((_command, callback) => {
      callback(new Error('exec failed'), new FakeExecStream());
    });

    await expect(
      withSshSession(
        {
          host: 'db.internal',
          port: 22,
          username: 'ops',
          hostKeySha256: 'SHA256:V/wGqHTHSNb4BFrleEaT0jG2C+WQ+j9+BcxG9WeR+6I'
        },
        async (session) => session.exec('uptime'),
        () => client
      )
    ).rejects.toThrow('exec failed');

    expect(client.ended).toBe(true);
    expect(stderrSpy.mock.calls.some(([chunk]) => String(chunk).includes('exec failed'))).toBe(
      true
    );

    stderrSpy.mockRestore();
  });

  it('logs callback failures and rethrows them after the connection is ready', async () => {
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const client = new FakeClient((_command, callback) => {
      callback(undefined, new FakeExecStream());
    });

    await expect(
      withSshSession(
        {
          host: 'db.internal',
          port: 22,
          username: 'ops',
          hostKeySha256: 'SHA256:V/wGqHTHSNb4BFrleEaT0jG2C+WQ+j9+BcxG9WeR+6I'
        },
        async () => {
          throw new Error('callback failed');
        },
        () => client
      )
    ).rejects.toThrow('callback failed');

    expect(client.ended).toBe(true);
    expect(stderrSpy.mock.calls.some(([chunk]) => String(chunk).includes('callback failed'))).toBe(
      true
    );

    stderrSpy.mockRestore();
  });
});
