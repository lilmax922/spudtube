import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_DIR = resolve(__dirname)
const SOURCE_FILE = /\.(?:vue|css|ts)$/
const TEST_FILE = /\.test\.ts$/

// `calc(100vw - Npx)` caps and `sizes="100vw"` stay legal: they size against the
// viewport without positioning a surface relative to it.
const FORBIDDEN_LAYOUT_WIDTH_PATTERNS: Array<{ name: string, pattern: RegExp }> = [
  { name: 'width: 100vw', pattern: /width:\s*100vw/ },
  { name: 'calc(50% - 50vw)', pattern: /calc\(\s*50%\s*-\s*50vw\s*\)/ },
  { name: 'w-screen', pattern: /\bw-screen\b/ },
  { name: 'innerWidth', pattern: /\binnerWidth\b/ },
]

function findLayoutWidthViolations(source: string): string[] {
  return FORBIDDEN_LAYOUT_WIDTH_PATTERNS
    .filter(({ pattern }) => pattern.test(source))
    .map(({ name }) => name)
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return listSourceFiles(path)
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : []
  })
}

describe('layout width guard (ADR-0009)', () => {
  it('flags each forbidden viewport-width layout pattern', () => {
    expect(findLayoutWidthViolations('.x { width: 100vw; margin-left: calc(50% - 50vw); }'))
      .toEqual(['width: 100vw', 'calc(50% - 50vw)'])
    expect(findLayoutWidthViolations('<div class="w-screen" />')).toEqual(['w-screen'])
    expect(findLayoutWidthViolations('const w = window.innerWidth')).toEqual(['innerWidth'])
  })

  it('allows sizes hints and calc(100vw - N) caps', () => {
    expect(findLayoutWidthViolations('<img sizes="100vw">')).toEqual([])
    expect(findLayoutWidthViolations('width: min(380px, calc(100vw - 32px));')).toEqual([])
  })

  it('finds no violations in app sources', () => {
    const violations = listSourceFiles(APP_DIR).flatMap(file =>
      findLayoutWidthViolations(readFileSync(file, 'utf8')).map(name => `${relative(APP_DIR, file)}: ${name}`),
    )
    expect(violations).toEqual([])
  })
})
