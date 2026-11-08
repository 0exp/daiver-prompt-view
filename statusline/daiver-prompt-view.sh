#!/bin/sh
# daiver-prompt-view: the status line under the prompt.
# Reads the status line JSON on stdin and prints:
#   1. model -> [session] (sid:…) <stime:…> <automemory:on|off>
#   2. modes: effort, outputstyle, thinkmode, fastmode
#   3. the agents lines, which the mod writes for this session
#   4. ctx / lmt / rst / pch bars
#   5. [RAM: used/total | %] [CPU: busy cores/cores | %]
#   6. git sha, branch, flags, +added/-removed lines | directory
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
c_gray='' c_white='' c_orange='' c_session='' c_ctx='' c_lmt='' c_rst='' c_pch='' c_sha='' c_branch='' c_flags='' c_added='' c_removed='' c_matrix='' c_resources='' c_values='' c_effort='' c_ostyle=''
[ -f "$mod/theme.sh" ] && . "$mod/theme.sh"
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

dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
case "$dir" in "$HOME"*) dir="~${dir#"$HOME"}" ;; esac

# line 1: model -> [session] (sid:…) <stime:…> <automemory:on|off>
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

# line 5: RAM and CPU of the machine (the `resources` option, on by default):
# [RAM: used/total | used%] [CPU: busy cores/cores | busy%]. `top` takes half
# a second, too slow for a run a second: RAM is Activity Monitor's "Memory Used"
# from vm_stat (anonymous - purgeable + wired + compressor pages) over hw.memsize,
# else /proc/meminfo's total - available; CPU is the sum of every process's %cpu
# from ps (a decaying average of the last minute) over the cores, else the busy
# share of /proc/stat since the previous run, kept in <mod>/cpu (none on the first).
# The brackets and labels in the theme's resources color, the numbers in values
gb() { awk -v b="$1" 'BEGIN { printf "%.1f", b / 1073741824 }' | sed 's/\.0$//'; }
res=''
vals=$(esc "$c_values")
rfr=$(esc "$c_resources")
if ! grep -qx 'resources=false' "$mod/config" 2>/dev/null; then
  ncpu=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 1)
  if [ -f /proc/meminfo ]; then
    mem=$(awk '/^MemTotal:/ { t = $2 } /^MemAvailable:/ { a = $2 } END { if (t > 0) printf "%.0f %.0f", (t - a) * 1024, t * 1024 }' /proc/meminfo)
  else
    mem=$(vm_stat 2>/dev/null | awk -v t="$(sysctl -n hw.memsize 2>/dev/null)" '
      /page size of/ { p = $8 } /^Anonymous pages/ { a = $3 } /^Pages purgeable/ { g = $3 }
      /^Pages wired/ { w = $4 } /^Pages occupied by compressor/ { c = $5 }
      END { if (t > 0 && p > 0) printf "%.0f %.0f", (a - g + w + c) * p, t }')
  fi
  if [ -n "$mem" ]; then
    used=${mem% *} total=${mem#* }
    res="[${bold}RAM:${unbold} ${vals}$(gb "$used")G/$(gb "$total")G | $((used * 100 / total))%${rfr}]"
  fi
  if [ -f /proc/stat ]; then
    ticks=$(awk 'NR == 1 { b = 0; for (i = 2; i <= NF; i++) b += $i; print b, $5 + $6 }' /proc/stat)
    prev=$(cat "$mod/cpu" 2>/dev/null)
    printf '%s\n' "$ticks" > "$mod/cpu" 2>/dev/null
    cpu=$(echo "$ticks $prev" | awk '$4 != "" && $1 > $3 { print ($1 - $3 - ($2 - $4)) * 100 / ($1 - $3) }')
  else
    cpu=$(ps -A -o %cpu= 2>/dev/null | awk -v n="$ncpu" '{ s += $1 } END { if (NR > 0) print s / n }')
  fi
  if [ -n "$cpu" ]; then
    set -- $(awk -v p="$cpu" -v n="$ncpu" 'BEGIN { if (p > 100) p = 100; printf "%.1f %.0f", p * n / 100, p }')
    res="$res [${bold}CPU:${unbold} ${vals}$(printf '%s' "$1" | sed 's/\.0$//')/$ncpu | $2%${rfr}]"
  fi
  [ -n "$res" ] && res="${rfr}${res# }${reset}"
fi

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
out="ctx $(esc "$c_ctx")$(bar $ctx)${reset} ${ctx}%"
out="$out | lmt $(esc "$c_lmt")$(bar $five)${reset} ${five}%"
out="$out | rst $(esc "$c_rst")$(bar $(((18000 - left) * 100 / 18000)))${reset} $((left / 3600))h$(printf '%02d' $((left % 3600 / 60)))m"
# the reset's local time, 24-hour HHhMMm, in Clawd's orange (BSD date -r, else
# GNU date -d); with no window yet, when one that starts now resets
hm=$(date -r $((now + left)) +%Hh%Mm 2>/dev/null || date -d "@$((now + left))" +%Hh%Mm 2>/dev/null)
[ -n "$hm" ] && out="$out ${orange}(at $hm)${reset}"
cch=$(echo "$input" | jq -r '(.context_window.current_usage // {}) | ((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)) as $t | if $t > 0 then ((.cache_read_input_tokens // 0) * 100 / $t | floor) else 0 end')
out="$out | pch $(esc "$c_pch")$(bar $cch)${reset} ${cch}%"

af="$mod/agents/$(echo "$input" | jq -r '.session_id // empty')"

# the panel's lines, before Clawd is added
panel() {
  printf '%s\n' "$model"
  [ -n "$modes" ] && printf '%s\n' "${modes# }"
  [ -f "$af" ] && cat "$af"
  printf '%s\n' "$out"
  [ -n "$res" ] && printf '%s\n' "$res"

  # line 6: git sha, branch, flags (+ staged, # untracked, ? unstaged),
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

# Clawd is the mod's option (userConfig `clodik`, on by default): the hooks
# module writes it to the config file next to this script
if grep -qx 'clodik=false' "$mod/config" 2>/dev/null; then
  panel
  exit 0
fi

# Clawd, Claude's mascot, at the right edge (vertically centered): as far from
# the edge as the status line is from the left one; next to the panel when the
# terminal width ($COLUMNS) is unknown or too narrow; the Claude Code version
# centered under its feet. While Claude Code is busy (the agents line's
# main loop is not idle) Clawd plays one of twelve animations, a new random one
# every few seconds, a frame per refresh (the status line runs once a second)
ver=$(echo "$input" | jq -r '.version // empty')
e=$(printf '\033')

# a pose on Clawd's 11-cell canvas: r0 is the spare line above it, r1-r3 its
# body (at rest in cells 1-9: cell 0 and 10 are room to move sideways); pcol is
# its color, Clawd orange but for the matrix rain (m1-m8), in the theme's green
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
# the clodikAnimation option (/daiver-prompt-view:clodik:animation): one of them, or random
animation=$(sed -n 's/^animation=//p' "$mod/config" 2>/dev/null)
case " $anims " in *" $animation "*) ;; *) animation='' ;; esac

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
# the visible width of a line: no color escapes, one cell per UTF-8 character
vis() { printf '%s' "$1" | sed "s/$e\[[0-9;]*m//g" | LC_ALL=C tr -d '\200-\277' | wc -c | tr -d ' '; }
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
pad=2 # the status line's left indent
# the canvas' first cell: the whole canvas (a step right included) ends pad
# cells before the right edge
col=$((w + 1))
case "$COLUMNS" in '' | *[!0-9]*) ;; *) [ $((COLUMNS - 2 * pad - 11)) -gt $col ] && col=$((COLUMNS - 2 * pad - 11)) ;; esac
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
