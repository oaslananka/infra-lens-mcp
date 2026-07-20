import { describe, expect, it, jest } from '@jest/globals';

import {
  buildCollectionCommandPlan,
  collectSampledSnapshot,
  collectSnapshot,
  inspectHostCapabilities
} from '../../src/collector.js';

const connection = {
  host: 'server.example.com',
  port: 22,
  username: 'ops'
};

describe('collectSnapshot', () => {
  it('keeps full and minimal SSH command plans within explicit budgets', () => {
    const full = buildCollectionCommandPlan({ includeProcesses: true, includeNetwork: true });
    const minimal = buildCollectionCommandPlan({
      includeProcesses: false,
      includeNetwork: false
    });

    expect(full.map((item) => item.key)).toEqual([
      'cpu',
      'memory',
      'disk',
      'diskInodes',
      'network',
      'system',
      'processes',
      'os'
    ]);
    expect(minimal.map((item) => item.key)).toEqual([
      'cpu',
      'memory',
      'disk',
      'diskInodes',
      'system',
      'os'
    ]);
    expect(full.filter((item) => item.required).map((item) => item.key)).toEqual([
      'cpu',
      'memory',
      'disk',
      'os'
    ]);
  });

  it('parses Linux metric output into a snapshot', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '83\n4.20 3.80 2.20 123/456 789\n8',
        memory: '8192 4096 4096\n128 1024',
        disk: '/dev/sda1 / 100 60 60\n/dev/sdb1 /data 200 100 50',
        network: 'eth0 12345 67890\nens5 222 333',
        processes: '100 nginx 15.5 3.2 nginx: worker\n200 node 75.0 12.1 node api.js',
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
      })
    });

    expect(snapshot.host).toBe('server.example.com');
    expect(snapshot.cpu.usage_percent).toBe(83);
    expect(snapshot.cpu.core_count).toBe(8);
    expect(snapshot.memory.usage_percent).toBe(50);
    expect(snapshot.disk).toHaveLength(2);
    expect(snapshot.network[0]).toEqual({ interface: 'eth0', rx_bytes: 12345, tx_bytes: 67890 });
    expect(snapshot.processes[1]?.command).toBe('node api.js');
    expect(snapshot.os.distro).toBe('Ubuntu 24.04.1 LTS');
  });

  it('computes CPU from /proc/stat deltas and memory pressure from MemAvailable', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: 'cpu  100 0 100 800 0 0 0 0 0 0\ncpu  150 0 150 900 0 0 0 0 0 0\n1.00 0.80 0.60 0/0 0\n4',
        memory: '8000 6000 3000\n0 0',
        disk: '',
        network: '',
        processes: '',
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
      })
    });

    expect(snapshot.cpu.usage_percent).toBe(50);
    expect(snapshot.memory.used_mb).toBe(5000);
    expect(snapshot.memory.free_mb).toBe(3000);
    expect(snapshot.memory.usage_percent).toBe(63);
  });

  it('falls back safely when optional lines are missing', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '0\n0.00 0.00 0.00 0/0 0\n4',
        memory: '',
        disk: '',
        network: '',
        processes: '',
        os: '\n\n\n'
      })
    });

    expect(snapshot.memory.total_mb).toBe(0);
    expect(snapshot.disk).toEqual([]);
    expect(snapshot.network).toEqual([]);
    expect(snapshot.processes).toEqual([]);
    expect(snapshot.os.hostname).toBe('server.example.com');
  });

  it('parses tab-delimited process output from the collector command', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '50\n1.00 0.80 0.60 0/0 0\n4',
        memory: '4096 2048 2048\n0 0',
        disk: '/dev/sda1 / 50 20 40',
        network: 'eth0 100 200',
        processes: '300\tjava\t44.1\t8.2\tjava -jar service.jar',
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
      })
    });

    expect(snapshot.processes[0]).toEqual({
      pid: 300,
      name: 'java',
      cpu_percent: 44.1,
      mem_percent: 8.2,
      command: 'java -jar service.jar'
    });
  });

  it('redacts secret-looking process arguments', async () => {
    const passwordArg = `--${'password'}=sample-value`;
    const tokenArg = `--${'token'}=sample-token`;
    const bearerArg = `${'authorization'}: ${'bearer'} sample-bearer`;

    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '50\n1.00 0.80 0.60 0/0 0\n4',
        memory: '4096 2048 2048\n0 0',
        disk: '',
        network: '',
        processes: `300\tbackup\t44.1\t8.2\tbackup ${passwordArg} ${tokenArg} ${bearerArg}`,
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
      })
    });

    expect(snapshot.processes[0]?.command).toContain('--password=[REDACTED]');
    expect(snapshot.processes[0]?.command).toContain('--token=[REDACTED]');
    expect(snapshot.processes[0]?.command).toContain('authorization: bearer [REDACTED]');
  });

  it('passes include flags to the runner so optional collection can be skipped', async () => {
    const run = jest.fn(async () => ({
      cpu: '50\n1.00 0.80 0.60 0/0 0\n4',
      memory: '4096 2048 2048\n0 0',
      disk: '',
      network: '',
      processes: '',
      os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
    }));

    await collectSnapshot(connection, { run }, { includeProcesses: false, includeNetwork: false });

    expect(run).toHaveBeenCalledWith(connection, {
      includeProcesses: false,
      includeNetwork: false
    });
  });

  it('preserves partial collection warnings while returning the available snapshot sections', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '25\n0.20 0.10 0.05 0/0 0\n2',
        memory: '2048 1024 1024\n0 0',
        disk: '/dev/sda1 / 20 5 25',
        network: '',
        processes: '',
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400',
        warnings: ['network skipped']
      })
    });

    expect(snapshot.network).toEqual([]);
    expect(snapshot.warnings).toEqual(['network skipped']);
  });

  it('returns host support checks and warnings', async () => {
    const inspection = await inspectHostCapabilities(connection, {
      run: async () => ({ cpu: '', memory: '', disk: '', network: '', processes: '', os: '' }),
      inspectCapabilities: async () => [
        { name: 'proc_stat', available: true, source: '/proc/stat' },
        { name: 'ps', available: false, source: 'ps', detail: 'missing' }
      ]
    });

    expect(inspection.capabilities).toHaveLength(2);
    expect(inspection.warnings).toEqual(['ps is unavailable: missing']);
  });

  it('surfaces collection errors from the SSH layer', async () => {
    await expect(
      collectSnapshot(connection, {
        run: async () => {
          throw new Error('command timed out');
        }
      })
    ).rejects.toThrow('command timed out');
  });

  it('averages sampled metrics across the requested collection window', async () => {
    jest.useFakeTimers();

    let sampleIndex = 0;
    const sampledPromise = collectSampledSnapshot(connection, 1, 30, {
      run: async () => {
        sampleIndex += 1;

        if (sampleIndex === 1) {
          return {
            cpu: '20\n1.00 0.90 0.80 0/0 0\n4',
            memory: '8192 2048 6144\n0 1024',
            disk: '/dev/sda1 / 100 20 20',
            network: 'eth0 100 200',
            processes: '100 nginx 10.0 2.0 nginx',
            os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
          };
        }

        return {
          cpu: '80\n3.00 2.50 2.00 0/0 0\n4',
          memory: '8192 6144 2048\n128 1024',
          disk: '/dev/sda1 / 100 60 60',
          network: 'eth0 300 400',
          processes: '200 node 70.0 12.0 node api.js',
          os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86500'
        };
      }
    });

    await jest.advanceTimersByTimeAsync(30_000);
    const snapshot = await sampledPromise;
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();

    expect(sampleIndex).toBe(2);
    expect(snapshot.cpu.usage_percent).toBe(50);
    expect(snapshot.cpu.load_1).toBe(2);
    expect(snapshot.memory.used_mb).toBe(4096);
    expect(snapshot.memory.usage_percent).toBe(50);
    expect(snapshot.disk[0]?.usage_percent).toBe(60);
    expect(snapshot.processes[0]?.command).toBe('node api.js');
  });

  it('cleans up sampling timers when a later sample fails', async () => {
    jest.useFakeTimers();
    let sampleIndex = 0;
    const sampledPromise = collectSampledSnapshot(connection, 1, 30, {
      run: async () => {
        sampleIndex += 1;
        if (sampleIndex > 1) {
          throw new Error('second sample timed out');
        }
        return {
          cpu: '20\n1.00 0.90 0.80 0/0 0\n4',
          memory: '8192 2048 6144\n0 1024',
          disk: '',
          network: '',
          processes: '',
          os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
        };
      }
    });

    const outcome = sampledPromise.then(
      () => null,
      (error: unknown) => error
    );
    await jest.advanceTimersByTimeAsync(30_000);
    const error = await outcome;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('second sample timed out');
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it('marks unsampled quality counters unsupported instead of treating lifetime totals as incidents', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '10\n0.10 0.10 0.10 0/0 0\n4',
        memory: '4096 1024 3072\n0 0',
        disk: '',
        network: 'eth0 1000 2000 10 20 8 7 6 5',
        system:
          'failed_units 0\nkernel_error_events 0\nkernel_signal_available 0\nkernel_window_minutes 5',
        processes: '',
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
      })
    });

    expect(snapshot.network[0]?.sample_window_seconds).toBeUndefined();
    expect(snapshot.warnings).toContain(
      'Network quality counters were not sampled over a bounded window; anomaly detection skipped for eth0.'
    );
    expect(snapshot.warnings).toContain(
      'Recent kernel error evidence is unavailable; kernel anomaly detection was skipped.'
    );
  });

  it('parses bounded network deltas, reset evidence, and a recent kernel window', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '10\n0.10 0.10 0.10 0/0 0\n4',
        memory: '4096 1024 3072\n0 0',
        disk: '',
        network: 'eth0 1000 2000 10 20 1 2 3 4 1',
        system:
          'failed_units 0\nkernel_error_events 2\nkernel_signal_available 1\nkernel_window_minutes 5',
        processes: '',
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
      })
    });

    expect(snapshot.network[0]).toMatchObject({
      interface: 'eth0',
      rx_errors: 1,
      tx_errors: 2,
      rx_dropped: 3,
      tx_dropped: 4,
      sample_window_seconds: 1,
      counter_reset: true
    });
    expect(snapshot.system).toEqual({
      failed_units: 0,
      kernel_error_events: 2,
      kernel_signal_available: true,
      kernel_window_minutes: 5
    });
    expect(snapshot.warnings).toContain(
      'Network counters reset or wrapped during the sample window for eth0; anomaly detection skipped for that interface.'
    );
  });

  it('parses inode, network quality, and system health signals', async () => {
    const snapshot = await collectSnapshot(connection, {
      run: async () => ({
        cpu: '10\n0.10 0.10 0.10 0/0 0\n4',
        memory: '4096 1024 3072\n0 0',
        disk: '/dev/sda1 / 100 40 40',
        diskInodes: '/dev/sda1 / 100000 95000 95',
        network: 'eth0 1000 2000 10 20 1 2 3 4 0',
        system:
          'failed_units 2\nkernel_error_events 5\nkernel_signal_available 1\nkernel_window_minutes 5',
        processes: '',
        os: '6.8.0\nserver.example.com\nUbuntu 24.04.1 LTS\n86400'
      })
    });

    expect(snapshot.disk[0]).toMatchObject({
      inode_total: 100000,
      inode_used: 95000,
      inode_usage_percent: 95
    });
    expect(snapshot.network[0]).toMatchObject({
      rx_packets: 10,
      tx_packets: 20,
      rx_errors: 1,
      tx_errors: 2,
      rx_dropped: 3,
      tx_dropped: 4,
      sample_window_seconds: 1,
      counter_reset: false
    });
    expect(snapshot.system).toEqual({
      failed_units: 2,
      kernel_error_events: 5,
      kernel_signal_available: true,
      kernel_window_minutes: 5
    });
  });
});
