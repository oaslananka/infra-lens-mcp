# Golden incident fixtures

These reviewed fixtures demonstrate stable `analyzeSnapshot` behavior without a baseline:

- `high-cpu.json`: critical CPU saturation and top-process evidence;
- `memory-pressure.json`: critical memory/OOM pressure;
- `inode-pressure.json`: critical inode exhaustion despite free bytes;
- `network-loss.json`: bounded NIC loss ratio;
- `service-kernel-pressure.json`: failed services plus recent kernel errors.

Each file contains the input snapshot and exact expected output. Run `pnpm run check:golden` to detect drift. Intentional output changes require `pnpm run golden:update`, review of every JSON diff, and an explanation in the pull request.
