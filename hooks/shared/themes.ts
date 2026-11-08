// the color themes, the one place they are written: the status line script
// reads the active one from theme.sh (written by config.ts), the agents line
// is drawn with it here. Every color is an SGR parameter list (24-bit ANSI)
type State = 'pending' | 'running' | 'waiting' | 'idle'

export type Theme = {
  // shared by every line
  gray: string // punctuation, keys, the version
  white: string // model, directory, a subagent's task, the last prompt's time
  // the status line
  orange: string // Clawd, the rst reset time
  session: string // [session]
  ctx: string // ctx bar
  lmt: string // lmt bar
  rst: string // rst bar
  pch: string // pch bar
  sha: string // git sha
  branch: string // branch glyph and name
  flags: string // git flags
  added: string // +N lines added in the diff
  removed: string // -N lines removed in the diff
  matrix: string // the matrix rain Clawd dissolves into (Clawd orange by default)
  prompt: string // the frame around the person's prompts in the transcript
  frame: string // the frame around the whole status line
  reply: string // the frame around Claude's replies in the transcript
  tool: string // the frame around the tool calls' rows in the transcript
  spinner: string // the frame around the spinner line of a running turn
  command: string // the frame around a slash command's output row
  resources: string // the RAM/CPU line's brackets and labels, a shade under white
  values: string // the RAM/CPU numbers, a shade under that
  effort: string // the effort level on the modes line
  ostyle: string // the output style on the modes line
  // the agents line
  elapsed: string // run times
  state: Record<State, string>
  kind: { agents: string; sub: string; sh: string; mon: string }
  main: { idle: string; waiting: string; thinking: string; tool: string }
}

export const THEMES: Record<string, Theme> = {
  default: {
    gray: '38;2;128;128;128',
    white: '38;2;255;255;255',
    orange: '38;2;215;119;87',
    session: '38;2;255;250;250',
    ctx: '38;2;255;0;255',
    lmt: '38;2;135;206;235',
    rst: '38;2;144;238;144',
    pch: '38;2;132;136;132',
    sha: '38;2;212;201;106',
    branch: '1;38;2;170;127;240',
    flags: '1;38;2;239;100;124',
    added: '38;2;144;238;144',
    removed: '38;2;239;100;124',
    matrix: '38;2;215;119;87',
    prompt: '38;2;215;119;87',
    frame: '38;2;215;119;87',
    reply: '38;2;0;200;255',
    tool: '38;2;106;52;163',
    spinner: '38;2;191;255;0',
    command: '38;2;128;128;128',
    resources: '38;2;200;200;200',
    values: '38;2;165;165;165',
    effort: '38;2;215;119;87',
    ostyle: '38;2;230;200;110',
    elapsed: '38;2;144;238;144',
    state: { pending: '38;2;212;201;106', running: '38;2;144;238;144', waiting: '38;2;135;206;235', idle: '38;2;170;170;170' },
    kind: { agents: '38;2;152;251;152', sub: '38;2;135;206;250', sh: '38;2;175;238;238', mon: '38;2;255;160;160' },
    main: { idle: '38;2;255;255;255', waiting: '38;2;135;206;235', thinking: '38;2;255;0;255', tool: '38;2;239;100;124' },
  },
}

export const THEME_NAMES = Object.keys(THEMES)

export const themeOf = (name: unknown) => (THEME_NAMES.includes(String(name)) ? String(name) : 'default')

// a 24-bit SGR color (`38;2;R;G;B`, a `1;` bold prefix allowed) as the #rrggbb
// a Box's borderColor takes; a color of another shape comes back as it is
export const hexOf = (params: string) => {
  const m = /(?:^|;)38;2;(\d+);(\d+);(\d+)$/.exec(params)
  return m === null ? params : `#${m.slice(1, 4).map(n => Number(n).toString(16).padStart(2, '0')).join('')}`
}

// the escape of one color
export const sgr = (params: string) => `\x1b[${params}m`

// the status line's colors as the script sources them: c_<name>='<params>'
const SHELL_KEYS = ['gray', 'white', 'orange', 'session', 'ctx', 'lmt', 'rst', 'pch', 'sha', 'branch', 'flags', 'added', 'removed', 'matrix', 'frame', 'resources', 'values', 'effort', 'ostyle'] as const

export const themeShell = (name: string) =>
  `# daiver-prompt-view theme: ${name}\n` + SHELL_KEYS.map(key => `c_${key}='${THEMES[name][key]}'\n`).join('')
