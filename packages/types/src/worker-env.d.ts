// Minimal Worker Runtime types to avoid external deps in initial scaffold
// You can replace these with @cloudflare/workers-types during build.
declare type ExecutionContext = { waitUntil(promise: Promise<unknown>): void }
declare type KVNamespace = { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> }
declare type D1Database = unknown
declare type R2Bucket = unknown
