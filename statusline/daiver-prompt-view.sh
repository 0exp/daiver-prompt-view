#!/bin/sh
# daiver-prompt-view: the status line under the prompt.
# Reads the status line JSON on stdin and prints:
#   1. model -> [session] (sid:…) <stime:…> <automemory:on|off> <in:…·out:…·cash:…>
#   2. modes: effort, outputstyle, thinkmode, fastmode
#   3. the agents lines, which the mod writes for this session
#   4. ctx / lmt / rst / pch bars
#   5. git sha, branch, flags, +added/-removed lines | directory
# with Clawd, Claude's mascot, at the right edge of the terminal
# Requires jq. Usage in statusLine.command: sh <path>/daiver-prompt-view.sh

input=$(cat)
modes=''

esc() { printf '\033[%sm' "$1"; }
reset=$(esc 0)
bold=$(esc 1)
unbold=$(esc 22)

# the mod's folder: config, theme, agents lines and auto memory, written by the
# hooks module
mod="$HOME/.claude/daiver-prompt-view"

# the colors of the active theme (the `theme` option, /daiver-prompt-view:view:theme):
# c_<name>='<SGR params>' lines the hooks module writes from its themes; with
# none yet, no colors
c_gray='' c_white='' c_orange='' c_session='' c_ctx='' c_ctxSize='' c_lmt='' c_rst='' c_pch='' c_sha='' c_branch='' c_flags='' c_added='' c_removed='' c_matrix='' c_frame='' c_effort='' c_ostyle=''
[ -f "$mod/theme.sh" ] && . "$mod/theme.sh"
# a theme.sh written before the context's size had a color of its own: the
# reset time's, until the mod writes the theme again
[ -z "$c_ctxSize" ] && c_ctxSize=$c_orange
gray=$(esc "$c_gray")
white=$(esc "$c_white")
orange=$(esc "$c_orange")

# a 10-cell bar of a percentage
bar() {
  f=$(($1 / 10))
  [ $f -gt 10 ] && f=10
  [ $f -lt 0 ] && f=0
  o=''
  i=0
  while [ $i -lt 10 ]; do
    if [ $i -lt $f ]; then o="${o}█"; else o="${o}░"; fi
    i=$((i + 1))
  done
  printf '%s' "$o"
}

# a jq definition: a token count in short, 950, 74k, 1.2M
human='def h: if . >= 1000000 then ((. / 100000 | floor) / 10 | tostring) + "M" elif . >= 1000 then (. / 1000 | floor | tostring) + "k" else (floor | tostring) end;'

dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
case "$dir" in "$HOME"*) dir="~${dir#"$HOME"}" ;; esac

# line 1: model -> [session] (sid:…) <stime:…> <automemory:on|off> <in:…·out:…·cash:…>
mname="${white}$(echo "$input" | jq -r '.model.display_name')${reset}"
model=''
sid=$(echo "$input" | jq -r '.session_id // empty' | cut -c1-8)
[ -n "$sid" ] && model="${gray}(${bold}sid:${unbold}$sid)${reset} $model"

# session time: from the transcript's birth time, else the session's duration
tp=$(echo "$input" | jq -r '.transcript_path // empty')
st0=''
[ -n "$tp" ] && [ -f "$tp" ] && st0=$(stat -f %B "$tp" 2>/dev/null)
if [ -n "$st0" ] && [ "$st0" -gt 0 ] 2>/dev/null; then
  el=$(($(date +%s) - st0))
else
  el=$(($(echo "$input" | jq -r '.cost.total_duration_ms // 0' | awk '{printf "%d", $1}') / 1000))
fi
[ $el -lt 0 ] && el=0
stm="$((el / 3600))h$(printf '%02d' $((el % 3600 / 60)))m"
model="${model}${gray}<${bold}stime:${unbold}$stm>${reset} "

# auto memory: the status line's input has no such field, the hooks module
# writes it for this session; no file, no segment
am=$(cat "$mod/automemory/$(echo "$input" | jq -r '.session_id // empty')" 2>/dev/null)
case "$am" in on | off) model="${model}${gray}<${bold}automemory:${unbold}$am>${reset} " ;; esac

# the session's tokens and cost, last on the line: input (new, written to and
# read from the cache) and output tokens of every request so far (k thousands,
# M millions) and the cost in dollars at API prices, subagents included; zeros
# before the first request. The input's context_window.total_*_tokens are the
# last request's alone, so the sums come from the transcript and the
# subagents' ones beside it (<session>/subagents/agent-*.jsonl): each response
# once (it has a row per content block, all with its usage), kept in
# tokens/<session_id> with the files' sizes and summed again only when one
# grows. Names braced: bash 3.2 as sh takes the dot's first byte for part of a
# bare $name. The statuslineUsage option off (statusline:show-usage, `usage=`
# in config): no segment, nothing summed
if ! grep -qx 'usage=false' "$mod/config" 2>/dev/null; then
  tsum='0 0'
  if [ -n "$tp" ] && [ -f "$tp" ]; then
    tfiles=$(ls "$tp" "${tp%.jsonl}"/subagents/*.jsonl 2>/dev/null)
    tsig=$(echo "$tfiles" | while IFS= read -r f; do printf '%s,' "$(wc -c < "$f" | tr -d ' ')"; done)
    tc="$mod/tokens/$(echo "$input" | jq -r '.session_id // "none"')"
    csig='' cin='' cout=''
    [ -f "$tc" ] && read -r csig cin cout < "$tc"
    if [ "$csig" = "$tsig" ] && [ -n "$cout" ]; then
      tsum="$cin $cout"
    else
      tsum=$(echo "$tfiles" | while IFS= read -r f; do grep '"usage"' "$f"; done |
        jq -rs '[.[] | select(.type == "assistant" and .message.usage) | {key: .message.id, value: .message.usage}] | from_entries | [.[]]
          | "\(map((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)) | add // 0) \(map(.output_tokens // 0) | add // 0)"' 2>/dev/null)
      case "$tsum" in *[0-9]' '[0-9]*) mkdir -p "$mod/tokens" && printf '%s %s\n' "$tsig" "$tsum" > "$tc.$$" && mv "$tc.$$" "$tc" ;; *) tsum='0 0' ;; esac
    fi
  fi
  tin=$(echo "${tsum% *}" | jq -r "$human"' h')
  tout=$(echo "${tsum#* }" | jq -r "$human"' h')
  cash=$(printf '%.2f' "$(echo "$input" | jq -r '.cost.total_cost_usd // 0')")
  model="${model}${gray}<${bold}in:${unbold}${tin}·${bold}out:${unbold}${tout}·${bold}cash:${unbold}\$${cash}>${reset} "
fi

# line 2: modes; the effort level and the output style in their theme colors
effort=$(echo "$input" | jq -r '.effort.level // empty')
[ -n "$effort" ] && modes="$modes (${bold}effort${unbold}:$(esc "$c_effort")$effort${reset})"
ostyle=$(echo "$input" | jq -r '.output_style.name // empty')
[ -n "$ostyle" ] && modes="$modes (${bold}outputstyle${unbold}:$(esc "$c_ostyle")$ostyle${reset})"
thinking=$(echo "$input" | jq -r '.thinking.enabled')
case "$thinking" in
  true) modes="$modes (${bold}thinkmode${unbold}:thinking)" ;;
  false) modes="$modes (${bold}thinkmode${unbold}:non-thinking)" ;;
esac
fast=$(echo "$input" | jq -r '.fast_mode')
case "$fast" in true | false) modes="$modes (${bold}fastmode${unbold}:$fast)" ;; esac

session=$(echo "$input" | jq -r '.session_name // empty')
model="$(esc "$c_session")[${bold}$session${unbold}]${reset} $model"
model="$mname -> ${model% }"

# line 4: context, 5-hour limit, its reset, prompt cache hits; all four from
# the start: with no rate limits yet (no response in this session) or a 5-hour
# window that has already reset, nothing is used and a whole window is ahead;
# with no request yet the cache is 0%
ctx=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | awk '{printf "%d", $1}')
five=$(printf '%.0f' "$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // 0')")
now=$(date +%s)
left=18000
rst=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
if [ -n "$rst" ]; then
  left=$((rst - now))
  [ $left -le 0 ] && five=0 left=18000
  [ $left -gt 18000 ] && left=18000
fi
# the context's size in tokens beside its percentage: the last request's input
# (new, written to and read from the cache) over the window's size, as 74k/200k
# (1.2M over a million); 0 before the first request, the size alone left out
# when the input does not carry it; in the theme's ctxSize color
csz=$(echo "$input" | jq -r "$human"'
  ((.context_window.current_usage // {}) | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0) | h)
  + ((.context_window.context_window_size // 0) | if . > 0 then "/" + h else "" end)')
out="ctx $(esc "$c_ctx")$(bar $ctx)${reset} ${ctx}% $(esc "$c_ctxSize")(${csz})${reset}"
out="$out | lmt $(esc "$c_lmt")$(bar $five)${reset} ${five}%"
out="$out | rst $(esc "$c_rst")$(bar $(((18000 - left) * 100 / 18000)))${reset} $((left / 3600))h$(printf '%02d' $((left % 3600 / 60)))m"
# the reset's local time, 24-hour HHhMMm, in Clawd's orange (BSD date -r, else
# GNU date -d); with no window yet, when one that starts now resets
hm=$(date -r $((now + left)) +%Hh%Mm 2>/dev/null || date -d "@$((now + left))" +%Hh%Mm 2>/dev/null)
[ -n "$hm" ] && out="$out ${orange}(at $hm)${reset}"
cch=$(echo "$input" | jq -r '(.context_window.current_usage // {}) | ((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)) as $t | if $t > 0 then ((.cache_read_input_tokens // 0) * 100 / $t | floor) else 0 end')
out="$out | pch $(esc "$c_pch")$(bar $cch)${reset} ${cch}%"

# line 3: the agents lines, which the mod writes for this session. With none
# yet (the session's start hook has not run, or the mod is not loaded): the
# mod's idle line (an idle main loop, zeros everywhere), in the theme's colors;
# with not even that, the same line drawn here
af="$mod/agents/$(echo "$input" | jq -r '.session_id // empty')"
[ -f "$af" ] && [ -s "$af" ] || af="$mod/agents.idle"
idle="${gray}⚙ ${bold}main${unbold}:${white}idle${gray} │ ${bold}agents${unbold}:0 (${bold}sub${unbold}:0 ${bold}sh${unbold}:0 ${bold}mon${unbold}:0) -> ${bold}pending${unbold}:0 ${bold}running${unbold}:0 ${bold}waiting${unbold}:0 ${bold}idle${unbold}:0${reset}"

# the panel's lines, before Clawd is added
panel() {
  printf '%s\n' "$model"
  [ -n "$modes" ] && printf '%s\n' "${modes# }"
  if [ -s "$af" ]; then cat "$af"; else printf '%s\n' "$idle"; fi
  printf '%s\n' "$out"

  # line 5: git sha, branch, flags (+ staged, # untracked, ? unstaged),
  # +added/-removed lines of the diff against HEAD (+N/-N with none) | directory
  if [ -n "$dir" ]; then
    rawdir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
    branch=''
    if git -C "$rawdir" --no-optional-locks rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      branch=$(git -C "$rawdir" --no-optional-locks branch --show-current 2>/dev/null)
      [ -z "$branch" ] && branch=$(git -C "$rawdir" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
      sha=$(git -C "$rawdir" --no-optional-locks rev-parse --short=8 HEAD 2>/dev/null)
      [ -n "$sha" ] && sha="${gray}($(esc "$c_sha")$sha${gray})${reset} "
      st=$(git -C "$rawdir" --no-optional-locks status --porcelain 2>/dev/null)
      flags=''
      printf '%s\n' "$st" | grep -q '^[MADRCTU]' && flags="$flags+"
      printf '%s\n' "$st" | grep -q '^??' && flags="$flags#"
      printf '%s\n' "$st" | grep -q '^.[MADRCTU]' && flags="$flags?"
      added='N' removed='N'
      ns=$(git -C "$rawdir" --no-optional-locks diff HEAD --numstat 2>/dev/null | awk '{ if ($1 != "-") a += $1; if ($2 != "-") d += $2 } END { printf "%d %d", a, d }')
      if [ "$ns" != "0 0" ] && [ -n "$ns" ]; then
        added=${ns% *}
        removed=${ns#* }
      fi
    fi
    if [ -n "$branch" ]; then
      violet=$(esc "$c_branch")
      icon=$(printf '\356\202\240') # Nerd Font branch glyph (U+E0A0)
      printf '%s\n' "${violet}${icon}${reset} $sha${violet}$branch${reset} $(esc "$c_flags")[$flags]${reset} $(esc "$c_added")+$added${gray}/$(esc "$c_removed")-$removed${reset} | ${white}$dir${reset}"
    else
      printf '%s\n' "${white}$dir${reset}"
    fi
  fi
}

e=$(printf '\033')
# the visible width of a line: no color escapes, one cell per UTF-8 character
vis() { printf '%s' "$1" | sed "s/$e\[[0-9;]*m//g" | LC_ALL=C tr -d '\200-\277' | wc -c | tr -d ' '; }

# the status line's indent on each side: Claude Code's own 2 columns plus
# statusLine.padding, which is added to them (so -1 leaves 1 column, -2 none;
# a positive one widens the indent). The mod sets the padding from its
# statuslinePadding option and writes it to its config (`padding=`); with no
# such line, the one in settings.json
padding=$(sed -n 's/^padding=//p' "$mod/config" 2>/dev/null)
case "$padding" in
  [0-9] | [0-9][0-9] | -[0-9] | -[0-9][0-9]) pad=$((padding + 2)); [ "$pad" -lt 0 ] && pad=0 ;;
  *) pad=$(jq -r '((.statusLine.padding // 0) + 2) | floor | if . < 0 then 0 else . end' "$HOME/.claude/settings.json" 2>/dev/null) ;;
esac
case "$pad" in '' | *[!0-9]*) pad=2 ;; esac
# the frame around the whole status line, in the theme's frame color: as wide
# as the terminal less the indent on both sides when $COLUMNS is known, else
# as wide as the widest line; `inner` is the room between its borders
inner=''
case "$COLUMNS" in '' | *[!0-9]*) ;; *) [ "$COLUMNS" -gt $((2 * pad + 13)) ] && inner=$((COLUMNS - 2 * pad - 2)) ;; esac
frame() {
  # the borders option (/daiver-prompt-view:chat:show-borders) or the status
  # line's own (chat:show-statusline-borders) off: no frame
  if grep -qx 'borders=false' "$mod/config" 2>/dev/null || grep -qx 'statuslineBorders=false' "$mod/config" 2>/dev/null; then
    cat
    return
  fi
  body=$(cat)
  # never narrower than the widest line (a narrow terminal, Clawd beside the panel)
  fw=${inner:-0}
  while IFS= read -r l; do
    v=$(vis "$l")
    [ "$v" -gt "$fw" ] && fw=$v
  done <<EOF
$body
EOF
  fc=$(esc "$c_frame")
  # the borderStyle option (/daiver-prompt-view:chat:border-style): `line` a
  # solid rounded frame, else `dashed`, one with open corners (as the
  # transcript's dashed frames are drawn)
  if grep -qx 'borderStyle=line' "$mod/config" 2>/dev/null; then
    fh='─' fv='│' ftl='╭' ftr='╮' fbl='╰' fbr='╯'
  else
    fh='╌' fv='╎' ftl=' ' ftr=' ' fbl=' ' fbr=' '
  fi
  bar=$(printf '%*s' "$fw" '' | sed "s/ /$fh/g")
  printf '%s\n' "${fc}${ftl}${bar}${ftr}${reset}"
  while IFS= read -r l; do
    fill=$((fw - $(vis "$l")))
    [ $fill -lt 0 ] && fill=0
    printf '%s%s%*s%s\n' "${fc}${fv}${reset}" "$l" $fill '' "${fc}${fv}${reset}"
  done <<EOF
$body
EOF
  printf '%s\n' "${fc}${fbl}${bar}${fbr}${reset}"
}

# Clawd is the mod's option (userConfig `clodik`, on by default): the hooks
# module writes it to the config file next to this script
if grep -qx 'clodik=false' "$mod/config" 2>/dev/null; then
  panel | frame
  exit 0
fi

# Clawd, Claude's mascot, at the right edge (vertically centered): as far from
# the edge as the status line is from the left one; next to the panel when the
# terminal width ($COLUMNS) is unknown or too narrow; the Claude Code version
# centered under its feet. While Claude Code is busy (the agents line's
# main loop is not idle) Clawd plays one of twelve animations, a new random one
# every few seconds, a frame per refresh (the status line runs once a second)
ver=$(echo "$input" | jq -r '.version // empty')

# a pose on Clawd's 11-cell canvas: r0 is the spare line above it, r1-r3 its
# body (at rest in cells 1-9: cell 0 and 10 are room to move sideways); pcol is
# its color, Clawd orange and the theme's own for the matrix rain (m1-m8)
pose() {
  pcol=$orange
  r0=''
  r1='  ▐▛███▜▌'
  r2=' ▝▜█████▛▘'
  r3='   ▘▘ ▝▝'
  case "$1" in
    up) r0=$r1 r1=$r2 r2=$r3 r3='' ;;
    squash) r1='' r2='▝▐▛█████▜▌▘' r3='  ▀▀   ▀▀' ;;
    stretch) r0='   ▐▛█▜▌' r1='   ▐███▌' r2='  ▝▜███▛▘' r3='    ▘ ▝' ;;
    turn) r1='   ▐▛██▌' r2='  ▝▜████▛' r3='    ▘▘ ▝' ;;
    side) r1='    ▐▛▌' r2='   ▝███▘' r3='    ▘▝' ;;
    back) r1='  ▐█████▌' ;;
    turnback) r1='   ▐██▜▌' r2='  ▜████▛▘' r3='    ▘ ▝▝' ;;
    blink) r1='  ▐▀███▀▌' ;;
    cheer) r1=' ▗▐▛███▜▌▖' r2='  ▜█████▛' ;;
    wave) r1='  ▐▛███▜▌▖' r2=' ▝▜█████▛' ;;
    tapl) r3='      ▝▝' ;;
    tapr) r3='   ▘▘' ;;
    crack) r0='      ▝' r1='  ▐▛▞█▜▘ ▗' r2=' ▝▜█▚██▛▖' r3='   ▘▖ ▝▗' ;;
    scatter) r0='  ▗   ▘  ▝' r1=' ▘ ▚▝▞▖▘ ▗' r2='▖ ▞▗▚ ▘▞ ▝' r3='  ▝ ▖ ▗ ▘' ;;
    dust) r0=' ▝    ▖   ▗' r1='▗   ▘    ▝' r2='   ▖   ▗' r3='▘    ▝    ▖' ;;
    m1) pcol=$(esc "$c_matrix") r0='ﾃ ﾘ ｳ    ﾔ' r1='  ﾈ ｲ    ﾆ' r2='  ｸ    ｵ  ﾏ' r3='       ﾑ  ｲ' ;;
    m2) pcol=$(esc "$c_matrix") r0='ｱ    ｴ' r1='ｼ ﾉ ｾ    ｲ' r2='  ﾊ ｳ    ﾊ' r3='  ｴ    ﾒ  ﾓ' ;;
    m3) pcol=$(esc "$c_matrix") r0='ﾗ    ﾈ  ｲ' r1='ｽ    ﾔ' r2='ｶ ﾔ ﾓ    ｱ' r3='  ﾗ ｲ    ｽ' ;;
    m4) pcol=$(esc "$c_matrix") r0=' ﾉ   ﾂ  ﾚ' r1='ﾁ    ﾓ  ﾒ' r2='ｷ    ｶ' r3='ﾒ ｸ ﾑ    ｺ' ;;
    m5) pcol=$(esc "$c_matrix") r0=' ﾗ      ｳ ﾓ' r1=' ﾓ   ｵ  ﾜ' r2='ﾔ    ﾆ  ﾒ' r3='ｵ    ｻ' ;;
    m6) pcol=$(esc "$c_matrix") r0='       ﾑ  ﾌ' r1=' ｼ      ﾌ ﾔ' r2=' ﾖ   ﾚ  ﾃ' r3='ｲ    ﾎ  ﾊ' ;;
    m7) pcol=$(esc "$c_matrix") r0='  ｾ    ｾ  ﾎ' r1='       ﾛ  ﾐ' r2=' ﾂ      ﾓ ﾂ' r3=' ﾆ   ｺ  ｴ' ;;
    m8) pcol=$(esc "$c_matrix") r0='  ﾋ ﾁ    ﾏ' r1='  ﾝ    ｳ  Z' r2='       ﾕ  ｹ' r3=' ﾄ      ｶ ﾉ' ;;
  esac
  case "$2" in
    L) r0=${r0# } r1=${r1# } r2=${r2# } r3=${r3# } ;;
    R) for r in r0 r1 r2 r3; do eval "[ -n \"\$$r\" ] && $r=\" \$$r\""; done ;;
  esac
}

# the animations, by the names the clodikAnimation option takes: one
# pose[:L|R shift] per frame
anims='jump spin sway blink cheer wave stretch hop tap shiver pixels matrix'
anim() {
  case "$1" in
    jump) echo 'rest squash up rest' ;;
    spin) echo 'rest turn side back side turnback' ;;
    sway) echo 'rest rest:L rest rest:R' ;;
    blink) echo 'rest rest blink rest' ;;
    cheer) echo 'rest cheer rest cheer' ;;
    wave) echo 'wave rest wave rest' ;;
    stretch) echo 'rest squash rest stretch' ;;                     # squash and stretch
    hop) echo 'rest up:R rest up:L' ;;                              # hop side to side
    tap) echo 'rest tapl rest tapr' ;;                              # tap dance
    shiver) echo 'rest:L rest:R rest:L rest:R' ;;
    pixels) echo 'rest crack scatter dust scatter crack' ;;         # fall to pixels and back
    matrix) echo 'rest crack scatter dust m1 m2 m3 m4 m5 m6 m7 m8 m1 m2 m3 m4 dust scatter crack' ;; # to pixels, then the rain
  esac
}
# the clodikAnimation option (/daiver-prompt-view:clodik:animation): one of
# them, or random (empty here); none, or one unknown: matrix, the default
animation=$(sed -n 's/^animation=//p' "$mod/config" 2>/dev/null)
case " $anims random " in *" $animation "*) ;; *) animation=matrix ;; esac
[ "$animation" = random ] && animation=''

busy=''
# the clodikAnimate option (/daiver-prompt-view:clodik:animate): animate whether busy or not
grep -qx 'animate=true' "$mod/config" 2>/dev/null && busy=1
[ -z "$busy" ] && [ -f "$af" ] && head -n 1 "$af" | sed "s/$e\[[0-9;]*m//g" | grep -q 'main:' &&
  ! head -n 1 "$af" | sed "s/$e\[[0-9;]*m//g" | grep -q 'main:idle' && busy=1

if [ -n "$busy" ]; then
  now=$(date +%s)
  # random: a new one every 8 seconds, never the same twice in a row
  rnd() {
    x=$((($1 * 2654435761) & 4294967295))
    x=$((((x ^ (x >> 16)) * 73244475) & 4294967295))
    echo $(((x ^ (x >> 16)) % 12))
  }
  if [ -z "$animation" ]; then
    k=$(rnd $((now / 8)))
    [ "$k" -eq "$(rnd $((now / 8 - 1)))" ] && k=$(((k + 1) % 12))
    set -- $anims
    shift $k
    animation=$1
  fi
  set -- $(anim "$animation")
  shift $((now % $#))
  sh=''
  case "$1" in *:*) sh=${1##*:} ;; esac
  pose "${1%%:*}" "$sh"
else
  pose rest
fi

clawd() {
  case "$1" in
    -1) r=$r0 ;;
    0) r=$r1 ;;
    1) r=$r2 ;;
    2) r=$r3 ;;
    3) r="$(printf '%*s' $(((11 - ${#ver}) / 2)) '')${gray}$ver" ;;
  esac
  [ -n "$r" ] && printf '%s' "${pcol}$r${reset}"
}
h=3
[ -n "$ver" ] && h=4
lines=$(panel)
n=$(printf '%s\n' "$lines" | wc -l | tr -d ' ')
# at least one spare line, so Clawd sits off the prompt (and has room to jump)
while [ "$n" -le $h ]; do lines="$lines
"; n=$((n + 1)); done
w=0
while IFS= read -r l; do
  v=$(vis "$l")
  [ "$v" -gt "$w" ] && w=$v
done <<EOF
$lines
EOF
top=$(((n - h + 1) / 2)) # an odd spare line goes above, off the prompt
# the canvas' first cell: the whole canvas (a step right included) ends at
# the frame's right border
col=$((w + 1))
[ -n "$inner" ] && [ $((inner - 11)) -gt $col ] && col=$((inner - 11))
{
i=0
while IFS= read -r l; do
  a=$((i - top))
  c=''
  [ $a -ge -1 ] && [ $a -lt $h ] && c=$(clawd $a)
  if [ -n "$c" ]; then
    printf '%s%*s%s\n' "$l" $((col - $(vis "$l"))) '' "$c"
  else
    printf '%s\n' "$l"
  fi
  i=$((i + 1))
done <<EOF
$lines
EOF
} | frame
