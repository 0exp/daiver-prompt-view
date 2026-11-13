// table: markdown tables in a framed reply, drawn by the mod. The engine sizes
// a table to the terminal's width, not to the box it is drawn in, so inside a
// frame (two borders and a column of padding each side) its right edge is cut
// or its corners wrap to the next row. Here every column is a Box as wide as
// its widest cell that shrinks with the room it has (`flexShrink`), so the
// grid lines and the cells of one column always keep one width; the vertical
// lines are absolute columns of `│` stretched over the row and clipped to it
import type { Elements } from 'claude-code'

export type Align = 'left' | 'center' | 'right'
export type Table = { header: string[]; align: Align[]; rows: string[][] }
export type Part = { kind: 'text'; text: string } | { kind: 'table'; table: Table }

type Els = Pick<Elements['terminal'], 'Box' | 'Text' | 'Markdown'>

const FENCE = /^\s{0,3}(`{3,}|~{3,})/
const DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
const ITEMS = { left: 'flex-start', center: 'center', right: 'flex-end' } as const

// a row's cells: outer pipes dropped, `\|` kept as a pipe, a pipe inside `code` kept
export function cellsOf(line: string) {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  let code = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (c === '\\' && s[i + 1] === '|') {
      cell += '|'
      i++
      continue
    }
    if (c === '`') code = !code
    if (c === '|' && !code) {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += c
  }
  cells.push(cell.trim())
  return cells
}

function alignOf(cell: string): Align {
  const c = cell.trim()
  if (c.startsWith(':') && c.endsWith(':')) return 'center'
  if (c.endsWith(':')) return 'right'
  return 'left'
}

// a reply's text cut into its markdown tables and the text around them; a
// table inside a code fence stays text
export function partsOf(text: string): Part[] {
  const lines = text.split('\n')
  const parts: Part[] = []
  let prose: string[] = []
  let fence = ''
  const flush = () => {
    const body = prose.join('\n').replace(/^\s*\n/, '').trimEnd()
    if (body.trim()) parts.push({ kind: 'text', text: body })
    prose = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const mark = FENCE.exec(line)?.[1]
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length) fence = ''
      prose.push(line)
      continue
    }
    if (mark) {
      fence = mark
      prose.push(line)
      continue
    }
    const next = lines[i + 1]
    const header = line.includes('|') ? cellsOf(line) : []
    if (header.length && next !== undefined && DELIMITER.test(next) && cellsOf(next).length === header.length) {
      flush()
      const align = cellsOf(next).map(alignOf)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim() && !FENCE.test(lines[i]!)) {
        const cells = cellsOf(lines[i]!)
        rows.push(header.map((_, n) => cells[n] ?? ''))
        i++
      }
      i--
      parts.push({ kind: 'table', table: { header, align, rows } })
      continue
    }
    prose.push(line)
  }
  flush()
  return parts
}

export function hasTable(text: string) {
  return partsOf(text).some(part => part.kind === 'table')
}

// the text a cell shows, its inline markdown dropped: what its width is counted by
export function plainOf(cell: string) {
  return cell
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\*(\S(?:.*?\S)?)\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
}

function isWide(cp: number) {
  return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3)
    || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60)
    || (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff) || (cp >= 0x20000 && cp <= 0x3fffd)
}

// cells a text takes on the terminal: wide (CJK, emoji) twice, joiners and marks none
export function widthOf(text: string) {
  let width = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp < 32 || (cp >= 0x300 && cp <= 0x36f) || cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) continue
    width += isWide(cp) ? 2 : 1
  }
  return width
}

// each column's width as drawn when the room allows: its widest cell and a column of padding each side
export function widthsOf(table: Table) {
  return table.header.map((head, i) =>
    Math.max(1, widthOf(plainOf(head)), ...table.rows.map(row => widthOf(plainOf(row[i] ?? '')))) + 2)
}

export function drawTable(t: Els, table: Table) {
  const { Box, Text, Markdown } = t
  const widths = widthsOf(table)
  const last = widths.length - 1
  // a cell wraps to at most as many rows as it has characters
  const tall = Math.min(1000, Math.max(...widths))
  const bar = Array.from({ length: tall }, () => '│').join('\n')

  const glyph = (ch: string) => (
    <Box width={1} flexShrink={0}>
      <Text>{ch}</Text>
    </Box>
  )
  const column = () => (
    <Box width={1} flexShrink={0}>
      <Box position="absolute" top={0} bottom={0} left={0} width={1} overflow="hidden">
        <Text>{bar}</Text>
      </Box>
    </Box>
  )
  const line = (left: string, middle: string, right: string) => (
    <Box flexDirection="row" height={1} overflow="hidden">
      {glyph(left)}
      {widths.map((width, i) => [
        <Box width={width} minWidth={3} flexShrink={1} height={1} overflow="hidden">
          <Text>{'─'.repeat(width)}</Text>
        </Box>,
        glyph(i === last ? right : middle),
      ])}
    </Box>
  )
  const row = (cells: string[], isHeader: boolean) => (
    <Box flexDirection="row">
      {column()}
      {cells.map((cell, i) => [
        <Box width={widths[i]!} minWidth={3} flexShrink={1} paddingX={1} flexDirection="column" alignItems={ITEMS[table.align[i] ?? 'left']}>
          {isHeader
            ? <Text bold>{plainOf(cell) || ' '}</Text>
            : plainOf(cell) === cell ? <Text>{cell || ' '}</Text> : <Markdown text={cell} />}
        </Box>,
        column(),
      ])}
    </Box>
  )

  return (
    <Box flexDirection="column">
      {line('┌', '┬', '┐')}
      {row(table.header, true)}
      {line('├', '┼', '┤')}
      {table.rows.map(cells => row(cells, false))}
      {line('└', '┴', '┘')}
    </Box>
  )
}

// a reply block with tables, drawn by the mod: the bullet that opens a reply,
// then each run of text as the engine's markdown and each table as above
export function drawReply(t: Els, text: string, isFirstOfReply: boolean) {
  const { Box, Text, Markdown } = t
  return (
    <Box flexDirection="row">
      <Box width={2} flexShrink={0}>
        <Text>{isFirstOfReply ? '●' : ' '}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} gap={1}>
        {partsOf(text).map(part => part.kind === 'table' ? drawTable(t, part.table) : <Markdown text={part.text} />)}
      </Box>
    </Box>
  )
}
