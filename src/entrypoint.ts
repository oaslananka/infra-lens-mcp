import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Return true when an ES module URL matches the executable passed to Node. */
export function isMainModule(moduleUrl: string, executablePath = process.argv[1]): boolean {
  if (!executablePath) {
    return false;
  }
  return pathToFileURL(resolve(executablePath)).href === moduleUrl;
}
