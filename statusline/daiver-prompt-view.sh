#!/bin/sh
# daiver-prompt-view: the status line under the prompt.
# Reads the status line JSON on stdin and prints:
#   1. model -> [session] (sid:…) <stime:…> <automemory:on|off|?> <in:…·out:…·cost:…>
#   2. modes: effort, outputstyle, thinkmode, fastmode
#   3. the agents lines, which the mod writes for this session
#   4. ctx / lmt / rst / pch bars
#   5. git sha, branch, flags, +added/-removed lines | directory
# with Clawd, Claude's mascot, at the right edge of the terminal
# Requires jq. Usage in statusLine.command: sh <path>/daiver-prompt-view.sh
#
# The status line runs once a second in every open session, so the script
# keeps its processes few: one jq for the whole input, the config and the
# agents lines read by the shell itself, one awk for Clawd and the frame, and
# the last drawing kept per session (render/<session_id>) and printed again
# while nothing it shows has changed (git at most 5 seconds late)

input=$(cat)
modes=''

esc() { printf '\033[%sm' "$1"; }
reset=$(esc 0)
bold=$(esc 1)
unbold=$(esc 22)
e=$(printf '\033')

# the mod's folder: config, theme, agents lines and auto memory, written by the
# hooks module
mod="$HOME/.claude/daiver-prompt-view"

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

# a token count in short, 950, 74k, 1.2M (hv), as the jq definition below
hum() {
  if [ "$1" -ge 1000000 ]; then
    q=$(($1 / 100000))
    if [ $((q % 10)) -eq 0 ]; then hv="$((q / 10))M"; else hv="$((q / 10)).$((q % 10))M"; fi
  elif [ "$1" -ge 1000 ]; then
    hv="$(($1 / 1000))k"
  else
    hv=$1
  fi
}
human='def h: if . >= 1000000 then ((. / 100000 | floor) / 10 | tostring) + "M" elif . >= 1000 then (. / 1000 | floor | tostring) + "k" else (floor | tostring) end;'

# every field of the input in one jq run, as shell assignments
rawdir='' mname='' sidfull='' sid='' tp='' dur=0 cost=0 effort='' ostyle='' thinking='' fast='' session='' ver='' ctx=0 five=0 rst='' week='' wrst='' csz='0' cch=0
eval "$(printf '%s' "$input" | jq -r "$human"'
  @sh "rawdir=\(.workspace.current_dir // .cwd // "" | tostring)",
  @sh "mname=\(.model.display_name | tostring)",
  @sh "sidfull=\(.session_id // "" | tostring)",
  @sh "sid=\(.session_id // "" | tostring | .[0:8])",
  @sh "tp=\(.transcript_path // "" | tostring)",
  @sh "dur=\(.cost.total_duration_ms // 0 | tonumber? // 0 | floor)",
  @sh "cost=\(.cost.total_cost_usd // 0 | tostring)",
  @sh "effort=\(.effort.level // "" | tostring)",
  @sh "ostyle=\(.output_style.name // "" | tostring)",
  @sh "thinking=\(.thinking.enabled | tostring)",
  @sh "fast=\(.fast_mode | tostring)",
  @sh "session=\(.session_name // "" | tostring)",
  @sh "ver=\(.version // "" | tostring)",
  @sh "ctx=\(.context_window.used_percentage // 0 | tonumber? // 0 | floor)",
  @sh "five=\(.rate_limits.five_hour.used_percentage // 0 | tostring)",
  @sh "rst=\(.rate_limits.five_hour.resets_at // "" | tostring)",
  @sh "week=\(.rate_limits.seven_day.used_percentage // "" | tostring)",
  @sh "wrst=\(.rate_limits.seven_day.resets_at // "" | tostring)",
  @sh "csz=\(((.context_window.current_usage // {}) | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0) | h)
    + ((.context_window.context_window_size // 0) | if . > 0 then "/" + h else "" end))",
  @sh "cch=\((.context_window.current_usage // {}) | ((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)) as $t | if $t > 0 then ((.cache_read_input_tokens // 0) * 100 / $t | floor) else 0 end)"' 2>/dev/null)"

# the colors of the active theme (the `theme` option, /daiver-prompt-view:view:theme):
# c_<name>='<SGR params>' lines the hooks module writes from its themes; with
# none yet, no colors
c_gray='' c_white='' c_orange='' c_session='' c_ctx='' c_ctxSize='' c_lmt='' c_fable='' c_rst='' c_pch='' c_sha='' c_branch='' c_flags='' c_added='' c_removed='' c_matrix='' c_frame='' c_effort='' c_ostyle=''
# this session's copy (themes/<session_id>.sh), else the shared one
th="$mod/themes/$sidfull.sh"
[ -n "$sidfull" ] && [ -f "$th" ] || th="$mod/theme.sh"
[ -f "$th" ] && . "$th"
# a theme.sh written before the context's size had a color of its own: the
# reset time's, until the mod writes the theme again
[ -z "$c_ctxSize" ] && c_ctxSize=$c_orange
gray=$(esc "$c_gray")
white=$(esc "$c_white")
orange=$(esc "$c_orange")

# the options the hooks module writes to config (key=value lines), read once,
# from this session's copy (configs/<session_id>: every session writes its own,
# so an option changed in one session does not flicker in another), else the
# shared config:
# usage (statusline:show-usage), weekReset (statusline:show-week-reset), borders and statuslineBorders
# (chat:show-borders, chat:show-statusline-borders), borderStyle
# (chat:border-style), clodik, animate and animation (clodik:*), padding
o_usage='' o_wreset='' o_borders='' o_slborders='' o_style='' o_clodik='' o_animate='' o_animation='' o_padding=''
cf="$mod/configs/$sidfull"
[ -n "$sidfull" ] && [ -f "$cf" ] || cf="$mod/config"
if [ -f "$cf" ]; then
  while IFS= read -r l || [ -n "$l" ]; do
    case "$l" in
      usage=false) o_usage=false ;;
      weekReset=true) o_wreset=true ;;
      borders=false) o_borders=false ;;
      statuslineBorders=false) o_slborders=false ;;
      borderStyle=line) o_style=line ;;
      clodik=false) o_clodik=false ;;
      animate=true) o_animate=true ;;
      animation=*) o_animation=${l#animation=} ;;
      padding=*) o_padding=${l#padding=} ;;
    esac
  done < "$cf"
fi

dir=$rawdir
case "$dir" in "$HOME"*) dir="~${dir#"$HOME"}" ;; esac
now=$(date +%s)

# line 1: model -> [session] (sid:…) <stime:…> <automemory:on|off|?> <in:…·out:…·cost:…>
mname="${white}$mname${reset}"
model=''
[ -n "$sid" ] && model="${gray}(${bold}sid:${unbold}$sid)${reset} $model"

# session time: from the transcript's birth time, else the session's duration
st0=''
[ -n "$tp" ] && [ -f "$tp" ] && st0=$(stat -f %B "$tp" 2>/dev/null)
if [ -n "$st0" ] && [ "$st0" -gt 0 ] 2>/dev/null; then
  el=$((now - st0))
else
  el=$((dur / 1000))
fi
[ $el -lt 0 ] && el=0
stm="$((el / 3600))h$(printf '%02d' $((el % 3600 / 60)))m"
model="${model}${gray}<${bold}stime:${unbold}$stm>${reset} "

# auto memory: the status line's input has no such field, the hooks module
# writes it for this session (on, off, unknown); no file, no segment
am=''
[ -n "$sidfull" ] && { IFS= read -r am < "$mod/automemory/$sidfull"; } 2>/dev/null
case "$am" in
  on | off) model="${model}${gray}<${bold}automemory:${unbold}$am>${reset} " ;;
  # nothing could be read (a plugin above refused it): unknown, never a guess
  unknown) model="${model}${gray}<${bold}automemory:${unbold}?>${reset} " ;;
esac

# the session's tokens and cost, last on the line: input (new, written to and
# read from the cache) and output tokens of every request so far (k thousands,
# M millions) and the cost in dollars at API prices, subagents included; zeros
# before the first request. The input's context_window.total_*_tokens are the
# last request's alone, so the sums come from the transcript and the
# subagents' ones beside it (<session>/subagents/agent-*.jsonl): each response
# once (it has a row per content block, all with its usage, the rows of one
# response side by side). Read incrementally: tokens/<session_id> holds, after
# a `v2` line, one tab-separated line per file: its path, the lines read so
# far (whole lines only: a row being written waits for the next run), the
# sums of the responses before the last one, and the last response's id and
# usage (its later rows replace it). Only the lines a file grew by are read
# (sed: BSD tail and head take a second on 30 MB), and each file's line is
# saved as soon as it is read, so a run cut short by the next tick (refreshInterval 1, ten subagents writing) keeps its progress;
# summing every transcript again each tick took longer than a tick and the
# status line never finished. A file that shrank is read again from its
# start. Names braced: bash 3.2 as sh takes the dot's first byte for part of
# a bare $name. While no transcript changed size and none was added since the
# last sum, the sum is taken as it is from tokens/<session_id>.sum (the sizes
# and paths, one stat run, then the sums): nothing is read. The
# statuslineUsage option off (statusline:show-usage, `usage=` in config): no
# segment, nothing summed
if [ "$o_usage" != false ]; then
  tsum='0 0'
  if [ -n "$tp" ] && [ -f "$tp" ]; then
    tc="$mod/tokens/${sidfull:-none}"
    set -- "$tp"
    for f in "${tp%.jsonl}"/subagents/*.jsonl; do [ -f "$f" ] && set -- "$@" "$f"; done
    tsig=$(stat -n -f '%z:%N|' "$@" 2>/dev/null) || tsig=''
    ssig='' ssum=''
    [ -n "$tsig" ] && [ -f "$tc.sum" ] && { IFS= read -r ssig; IFS= read -r ssum; } < "$tc.sum"
    case "$ssum" in [0-9]*' '[0-9]*) ;; *) ssig='' ;; esac
  fi
  if [ -n "$tp" ] && [ -f "$tp" ] && [ -n "$tsig" ] && [ "$ssig" = "$tsig" ]; then
    tsum=$ssum
  elif [ -n "$tp" ] && [ -f "$tp" ]; then
    tab=$(printf '\t')
    mkdir -p "$mod/tokens"
    # a cache in the old format (one line of sizes and sums) is dropped, and
    # the leftovers of runs cut short are cleared
    [ -f "$tc" ] && [ "$(head -n 1 "$tc")" != 'v2' ] && rm -f "$tc"
    find "$mod/tokens" -name "${tc##*/}.*" ! -name '*.sum' -mmin +1 -exec rm -f {} + 2>/dev/null
    [ -f "$tc" ] || echo v2 > "$tc"
    tdone=1
    # only the files whose size changed since the last whole sum (all of them
    # with no sum yet) are looked at: wc and awk on each of a hundred
    # subagents' transcripts took longer than a tick, the run was cut short by
    # the next one and the status line stood still while subagents worked
    changed=$(DPV_OLD=$ssig DPV_NEW=$tsig awk 'BEGIN {
      n = split(ENVIRON["DPV_OLD"], a, "|"); for (i = 1; i <= n; i++) if (a[i] != "") o[a[i]] = 1
      m = split(ENVIRON["DPV_NEW"], b, "|")
      for (i = 1; i <= m; i++) if (b[i] != "" && !(b[i] in o)) { sub(/^[0-9]+:/, "", b[i]); print b[i] }
    }')
    tset=$tsig
    [ -n "$tsig" ] || { changed='' tset=''; for f in "$@"; do changed="$changed$f
" tset="${tset}0:$f|"; done; }
    while IFS= read -r f <&3; do
      [ -n "$f" ] && [ -f "$f" ] || continue
      # whole lines only: wc -l counts the newlines, a row still being
      # written has none yet
      n=$(wc -l < "$f" | tr -d ' ')
      off='' bin='' bout='' lid='' lin='' lout=''
      ent=$(awk -F "$tab" -v p="$f" '$1 == p { print $2; exit }' "$tc" 2>/dev/null)
      read -r off bin bout lid lin lout <<EOF
$ent
EOF
      case "${off}x${bin}x${bout}x${lin}x${lout}" in *[!0-9x]*|*xx*|x*|*x) off=0 bin=0 bout=0 lid=- lin=0 lout=0 ;; esac
      [ "$n" -lt "$off" ] && off=0 bin=0 bout=0 lid=- lin=0 lout=0
      if [ "$n" -gt "$off" ]; then
        res=$(sed -n "$((off + 1)),${n}p" "$f" | grep '"usage"' |
          jq -Rrn --argjson bin "$bin" --argjson bout "$bout" --arg lid "${lid:--}" --argjson lin "$lin" --argjson lout "$lout" '
            reduce (inputs | fromjson? | select(.type == "assistant" and .message.usage)
              | [(.message.id // "-"), (.message.usage | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)), (.message.usage.output_tokens // 0)]) as $r
              ({bin: $bin, bout: $bout, lid: $lid, lin: $lin, lout: $lout};
               if $r[0] == .lid then .lin = $r[1] | .lout = $r[2]
               else .bin += .lin | .bout += .lout | .lid = $r[0] | .lin = $r[1] | .lout = $r[2] end)
            | "\(.bin) \(.bout) \(.lid) \(.lin) \(.lout)"' 2>/dev/null)
        case "$res" in
          *[0-9]' '[0-9]*' '*' '[0-9]*' '[0-9]*)
            read -r bin bout lid lin lout <<EOF
$res
EOF
            off=$n
            { awk -F "$tab" -v p="$f" '$1 != p' "$tc"; printf '%s\t%s %s %s %s %s %s\n' "$f" "$off" "$bin" "$bout" "$lid" "$lin" "$lout"; } > "$tc.$$" && mv "$tc.$$" "$tc" ;;
          # not read this time: the sum is not kept, the next run reads again
          *) tdone='' ;;
        esac
      fi
    done 3<<EOF
$changed
EOF
    # the sums of every transcript of the session, in one pass over the cache
    tsum=$(DPV_SET=$tset awk -F "$tab" 'BEGIN {
      n = split(ENVIRON["DPV_SET"], a, "|")
      for (i = 1; i <= n; i++) if (a[i] != "") { sub(/^[0-9]+:/, "", a[i]); s[a[i]] = 1 }
    }
    ($1 in s) { split($2, v, " "); t += v[2] + v[5]; o += v[3] + v[6] }
    END { printf "%d %d", t, o }' "$tc" 2>/dev/null)
    case "$tsum" in [0-9]*' '[0-9]*) ;; *) tsum='0 0' ;; esac
    # every file read to its last whole line: the sum kept with the sizes
    [ -n "$tdone" ] && [ -n "$tsig" ] && printf '%s\n%s\n' "$tsig" "$tsum" > "$tc.sum.$$" && mv -f "$tc.sum.$$" "$tc.sum"
  fi
  hum "${tsum% *}"; tin=$hv
  hum "${tsum#* }"; tout=$hv
  cash=$(printf '%.2f' "$cost")
  model="${model}${gray}<${bold}in:${unbold}${tin}·${bold}out:${unbold}${tout}·${bold}cost:${unbold}\$${cash}>${reset} "
fi

# line 2: modes; the effort level and the output style in their theme colors
[ -n "$effort" ] && modes="$modes (${bold}effort${unbold}:$(esc "$c_effort")$effort${reset})"
[ -n "$ostyle" ] && modes="$modes (${bold}outputstyle${unbold}:$(esc "$c_ostyle")$ostyle${reset})"
case "$thinking" in
  true) modes="$modes (${bold}thinkmode${unbold}:thinking)" ;;
  false) modes="$modes (${bold}thinkmode${unbold}:non-thinking)" ;;
esac
case "$fast" in true | false) modes="$modes (${bold}fastmode${unbold}:$fast)" ;; esac

model="$(esc "$c_session")[${bold}$session${unbold}]${reset} $model"
model="$mname -> ${model% }"

# the limits are the account's, but each session only knows them from its own
# last response, so an idle session shows an old figure; every session keeps
# the newest it has seen in one shared file (limits: `five rst week wrst`) and
# draws that: of two figures for a window, the later window wins (a reset more
# than an hour, or a day for the week, apart), within the same window the
# higher (a window's use only grows); written only when it changes
# a percentage as an integer in ten-thousandths of a point, 43.5 -> 435000
lnum() {
  li=${1%%.*} lfr=''
  case "$1" in *.*) lfr=${1#*.} ;; esac
  lfr="${lfr}0000"
  lfr=${lfr%"${lfr#????}"}
  case "$li$lfr" in '' | *[!0-9]*) ln=0 ;; *) ln="$li$lfr" ;; esac
}
lmerge() { # $1 $2 mine (pct reset), $3 $4 shared, $5 the gap of a new window
  mp=$1 mr=$2
  case "$4" in '' | *[!0-9]*) return ;; esac
  case "$mr" in '' | *[!0-9]*) mp=$3 mr=$4; return ;; esac
  if [ $(($4 - mr)) -gt "$5" ]; then
    mp=$3 mr=$4
  elif [ $((mr - $4)) -le "$5" ]; then
    lnum "$mp"; la=$ln
    lnum "$3"
    [ "$ln" -gt "$la" ] && mp=$3
    [ "$4" -gt "$mr" ] && mr=$4
  fi
}
lf="$mod/limits"
lfive='' lrst='' lweek='' lwrst=''
[ -f "$lf" ] && read -r lfive lrst lweek lwrst < "$lf" 2>/dev/null
lmerge "$five" "$rst" "$lfive" "$lrst" 3600
five=$mp rst=$mr
lmerge "${week:--}" "$wrst" "${lweek:--}" "$lwrst" 86400
case "$mp" in -) week='' ;; *) week=$mp ;; esac
wrst=$mr
lline="$five ${rst:--} ${week:--} ${wrst:--}"
if [ -n "$rst" ] && [ "$lline" != "$lfive ${lrst:--} ${lweek:--} ${lwrst:--}" ]; then
  [ -d "$mod" ] || mkdir -p "$mod"
  printf '%s\n' "$lline" > "$lf.$$" 2>/dev/null && mv -f "$lf.$$" "$lf" 2>/dev/null
fi
case "$wrst" in -) wrst='' ;; esac

# the usage block, two lines between two rules: context and prompt cache hits,
# then the 5-hour limit and its reset; all four from the start: with no rate limits yet (no response in this session) or a 5-hour
# window that has already reset, nothing is used and a whole window is ahead;
# with no request yet the cache is 0%
five=$(printf '%.0f' "$five")
left=18000
if [ -n "$rst" ]; then
  left=$((rst - now))
  [ $left -le 0 ] && five=0 left=18000
  [ $left -gt 18000 ] && left=18000
fi
# the context's size in tokens beside its percentage: the last request's input
# (new, written to and read from the cache) over the window's size, as 74k/200k
# (1.2M over a million); 0 before the first request, the size alone left out
# when the input does not carry it; in the theme's ctxSize color
sctx="ctx $(esc "$c_ctx")$(bar $ctx)${reset} ${ctx}% $(esc "$c_ctxSize")(${csz})${reset}"
slmt="lmt $(esc "$c_lmt")$(bar $five)${reset} ${five}%"
# the weekly limit beside it, in parentheses: its percentage and its reset's
# date and local time, dd-mm-yyyy HH:MM (BSD date -r, else GNU date -d); a week that has already
# reset is 0% with no date; the date only with the statuslineWeekReset option
# on (statusline:show-week-reset, `weekReset=` in config); no weekly limit in
# the input, no parentheses
if [ -n "$week" ]; then
  week=$(printf '%.0f' "$week" 2>/dev/null) || week=0
  wd=''
  case "$wrst" in
    '' | *[!0-9]*) ;;
    *)
      if [ "$wrst" -le "$now" ]; then
        week=0
      elif [ "$o_wreset" = true ]; then
        wd=$(date -r "$wrst" '+%d-%m-%Y %H:%M' 2>/dev/null || date -d "@$wrst" '+%d-%m-%Y %H:%M' 2>/dev/null)
      fi ;;
  esac
  slmt="$slmt $(esc "$c_lmt")(${week}%${wd:+ -> $wd})${reset}"
fi
# the weekly Fable limit, in brackets of its own in the theme's fable color, as
# (fable:23%): the mod reads it from the plan's usage into the shared file
# fable (`pct resets_at asked_at`); a window that has already reset is 0%, its
# reset date and time with the same option as the week's; no Fable access
# (`-`) or no file yet, no brackets
ffile="$mod/fable"
fpct='' frst=''
[ -f "$ffile" ] && read -r fpct frst _ < "$ffile" 2>/dev/null
case "$fpct" in '' | -) ;; *)
  fpct=$(printf '%.0f' "$fpct" 2>/dev/null) || fpct=0
  fd=''
  case "$frst" in
    '' | *[!0-9]*) ;;
    *)
      if [ "$frst" -le "$now" ]; then
        fpct=0
      elif [ "$o_wreset" = true ]; then
        fd=$(date -r "$frst" '+%d-%m-%Y %H:%M' 2>/dev/null || date -d "@$frst" '+%d-%m-%Y %H:%M' 2>/dev/null)
      fi ;;
  esac
  slmt="$slmt $(esc "$c_fable")(fable:${fpct}%${fd:+ -> $fd})${reset}" ;;
esac
srst="rst $(esc "$c_rst")$(bar $(((18000 - left) * 100 / 18000)))${reset} $((left / 3600))h$(printf '%02d' $((left % 3600 / 60)))m"
# the reset's local time, 24-hour HH:MM, in Clawd's orange (BSD date -r, else
# GNU date -d); with no window yet, when one that starts now resets
hm=$(date -r $((now + left)) +%H:%M 2>/dev/null || date -d "@$((now + left))" +%H:%M 2>/dev/null)
[ -n "$hm" ] && srst="$srst ${orange}(at $hm)${reset}"
# the weekly Fable limit's reset after it, in the theme's fable color, as
# (fable:27-11-2026 02:00): its local date and time, dd-mm-yyyy HH:MM, whatever
# statuslineWeekReset says; none with no Fable brackets or a reset already past
case "$fpct" in '' | -) ;; *)
  case "$frst" in
    '' | *[!0-9]*) ;;
    *)
      if [ "$frst" -gt "$now" ]; then
        frd=$(date -r "$frst" '+%d-%m-%Y %H:%M' 2>/dev/null || date -d "@$frst" '+%d-%m-%Y %H:%M' 2>/dev/null)
        [ -n "$frd" ] && srst="$srst $(esc "$c_fable")(fable:$frd)${reset}"
      fi ;;
  esac ;;
esac
spch="pch $(esc "$c_pch")$(bar $cch)${reset} ${cch}%"
# the block: a rule (RS, \036, alone on its line) above and below, drawn by
# the frame's awk from the frame's left border to its right one; in each line
# the second column (after US, \037) starts at the same cell
rs=$(printf '\036') us=$(printf '\037')
out="$rs
$sctx$us | $spch
$slmt$us | $srst
$rs"

# line 3: the agents lines, which the mod writes for this session. With none
# yet (the session's start hook has not run, or the mod is not loaded): the
# mod's idle line (an idle main loop, zeros everywhere), in the theme's colors;
# with not even that, the same line drawn here. Read by the shell, its first
# line kept for Clawd
af="$mod/agents/$sidfull"
[ -n "$sidfull" ] && [ -f "$af" ] && [ -s "$af" ] || af="$mod/agents.idle"
agents='' first=''
if [ -s "$af" ]; then
  while IFS= read -r l || [ -n "$l" ]; do
    [ -z "$agents" ] && first=$l
    agents="$agents$l
"
  done < "$af"
fi
[ -z "$agents" ] && agents="${gray}⚙ ${bold}main${unbold}:${white}idle${gray} │ ${bold}agents${unbold}:0 (${bold}sub${unbold}:0 ${bold}sh${unbold}:0 ${bold}mon${unbold}:0) -> ${bold}pending${unbold}:0 ${bold}running${unbold}:0 ${bold}waiting${unbold}:0 ${bold}idle${unbold}:0${reset}
"

# the panel's lines, before Clawd is added
panel() {
  printf '%s\n' "$model"
  [ -n "$modes" ] && printf '%s\n' "${modes# }"
  printf '%s' "$agents"
  printf '%s\n' "$out"

  # line 5: git sha, branch, flags (+ staged, # untracked, ? unstaged),
  # +added/-removed lines of the diff against HEAD (+N/-N with none) | directory
  if [ -n "$dir" ]; then
    branch=''
    if git -C "$rawdir" --no-optional-locks rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      branch=$(git -C "$rawdir" --no-optional-locks branch --show-current 2>/dev/null)
      [ -z "$branch" ] && branch=$(git -C "$rawdir" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
      sha=$(git -C "$rawdir" --no-optional-locks rev-parse --short=8 HEAD 2>/dev/null)
      [ -n "$sha" ] && sha="${gray}($(esc "$c_sha")$sha${gray})${reset} "
      st=$(git -C "$rawdir" --no-optional-locks status --porcelain 2>/dev/null)
      flags=''
      case "
$st" in *"
"[MADRCTU]*) flags="$flags+" ;; esac
      case "
$st" in *"
??"*) flags="$flags#" ;; esac
      case "
$st" in *"
"?[MADRCTU]*) flags="$flags?" ;; esac
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

# the status line's indent on each side: Claude Code's own 2 columns plus
# statusLine.padding, which is added to them (so -1 leaves 1 column, -2 none;
# a positive one widens the indent). The mod sets the padding from its
# statuslinePadding option and writes it to its config (`padding=`); with no
# such line, the one in settings.json
case "$o_padding" in
  [0-9] | [0-9][0-9] | -[0-9] | -[0-9][0-9]) pad=$((o_padding + 2)); [ "$pad" -lt 0 ] && pad=0 ;;
  *) pad=$(jq -r '((.statusLine.padding // 0) + 2) | floor | if . < 0 then 0 else . end' "$HOME/.claude/settings.json" 2>/dev/null) ;;
esac
case "$pad" in '' | *[!0-9]*) pad=2 ;; esac
# the frame around the whole status line, in the theme's frame color: as wide
# as the terminal less the indent on both sides when $COLUMNS is known, else
# as wide as the widest line; `inner` is the room between its borders
inner=''
case "$COLUMNS" in '' | *[!0-9]*) ;; *) [ "$COLUMNS" -gt $((2 * pad + 13)) ] && inner=$((COLUMNS - 2 * pad - 2)) ;; esac
# the borders option (/daiver-prompt-view:chat:show-borders) or the status
# line's own (chat:show-statusline-borders) off: no frame. The borderStyle
# option (/daiver-prompt-view:chat:border-style): `line` a solid rounded frame,
# else `dashed`, one with open corners (as the transcript's dashed frames are
# drawn)
framed=1
[ "$o_borders" = false ] || [ "$o_slborders" = false ] && framed=0
if [ "$o_style" = line ]; then
  fh='─' fv='│' ftl='╭' ftr='╮' fbl='╰' fbr='╯'
else
  fh='╌' fv='╎' ftl=' ' ftr=' ' fbl=' ' fbr=' '
fi

# Clawd is the mod's option (userConfig `clodik`, on by default): the hooks
# module writes it to the config file next to this script.
# Clawd, Claude's mascot, at the right edge (vertically centered): as far from
# the edge as the status line is from the left one; next to the panel when the
# terminal width ($COLUMNS) is unknown or too narrow; the Claude Code version
# centered under its feet. While Claude Code is busy (the agents line's
# main loop is not idle) Clawd plays one of twelve animations, a new random one
# every few seconds, a frame per refresh (the status line runs once a second)

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

busy=''
clawdrows=''
if [ "$o_clodik" != false ]; then
  # the clodikAnimation option (/daiver-prompt-view:clodik:animation): one of
  # them, or random (empty here); none, or one unknown: matrix, the default
  animation=$o_animation
  case " $anims random " in *" $animation "*) ;; *) animation=matrix ;; esac
  [ "$animation" = random ] && animation=''

  # the clodikAnimate option (/daiver-prompt-view:clodik:animate): animate
  # whether busy or not; else while the agents line's main loop is not idle
  # (its first line, the color escapes taken out by the shell)
  if [ "$o_animate" = true ]; then
    busy=1
  else
    s=$first t=''
    while :; do
      case "$s" in
        *"$e["*) t="$t${s%%"$e["*}" s=${s#*"$e["} s=${s#*m} ;;
        *) t="$t$s"; break ;;
      esac
    done
    case "$t" in *main:idle*) ;; *main:*) busy=1 ;; esac
  fi

  if [ -n "$busy" ]; then
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
  # Clawd's rows, each in its color, the version centered under its feet
  for r in r0 r1 r2 r3; do
    eval "v=\$$r"
    [ -n "$v" ] && v="${pcol}$v${reset}"
    clawdrows="$clawdrows$v
"
  done
  [ -n "$ver" ] && clawdrows="$clawdrows${pcol}$(printf '%*s' $(((11 - ${#ver}) / 2)) '')${gray}$ver${reset}
"
fi

# the last drawing is printed again while everything it shows is the same
# (busy Clawd moves every second, so it is drawn anew then); git is not in
# the key, so the drawing is redone at least every 5 seconds
SEP='--daiver-prompt-view--'
key="$COLUMNS|$pad|$framed|$o_style|$c_frame|$c_gray|$c_white|$c_sha|$c_branch|$c_flags|$c_added|$c_removed|$rawdir
$model
$modes
$agents$out
$clawdrows"
rc=''
if [ -z "$busy" ] && [ -n "$sidfull" ]; then
  rc="$mod/render/$sidfull"
  if [ -f "$rc" ]; then
    cts='' ck='' co=''
    {
      IFS= read -r cts
      while IFS= read -r l; do
        [ "$l" = "$SEP" ] && break
        ck="$ck$l
"
      done
      while IFS= read -r l || [ -n "$l" ]; do co="$co$l
"; done
    } < "$rc"
    case "$cts" in
      '' | *[!0-9]*) ;;
      *)
        if [ "$ck" = "$key
" ] && [ $((now - cts)) -ge 0 ] && [ $((now - cts)) -lt 5 ]; then
          printf '%s' "$co"
          exit 0
        fi ;;
    esac
  fi
fi

# Clawd beside the panel and the frame around both, drawn in one awk run:
# the visible width of a line is its length without color escapes, one cell
# per UTF-8 character (the continuation bytes not counted). Clawd has a block
# of his own at the right, its left side a line of the frame from the top
# border to the bottom one. The usage block's rules run across the panel, from
# the left border to Clawd's block (or the right border), and leave the cell at
# either end blank, so each block reads as rounded, as the frame's corners do
draw='
function vis(s) { gsub(/\033\[[0-9;]*m/, "", s); gsub(/[\200-\277]/, "", s); return length(s) }
function sp(k,  o) { o = ""; while (k-- > 0) o = o " "; return o }
function rule(k,  o) { o = ""; while (k-- > 0) o = o ENVIRON["DPV_FH"]; return o }
{ L[++n] = $0 }
END {
  inner = ENVIRON["DPV_INNER"]
  framed = ENVIRON["DPV_FRAMED"] == "1"
  fc = ENVIRON["DPV_FC"]; rs = ENVIRON["DPV_RESET"]; fv = fc ENVIRON["DPV_FV"] rs
  # the usage block: its second column at the same cell in every line (US the
  # mark), its rules (RS alone on a line)
  cw = 0
  for (i = 1; i <= n; i++) {
    if (L[i] == "\036") { R[i] = 1; L[i] = "" }
    else if ((k = index(L[i], "\037")) > 0) { v = vis(substr(L[i], 1, k - 1)); if (v > cw) cw = v }
  }
  for (i = 1; i <= n; i++) if ((k = index(L[i], "\037")) > 0) L[i] = substr(L[i], 1, k - 1) sp(cw - vis(substr(L[i], 1, k - 1))) substr(L[i], k + 1)
  while (n > 0 && L[n] == "" && !R[n]) n--
  w = 0
  for (i = 1; i <= n; i++) if (!R[i]) { V[i] = vis(L[i]); if (V[i] > w) w = V[i] }
  clawd = ENVIRON["DPV_CLAWD"] != ""
  if (clawd) {
    # Clawd, h rows (3, 4 with the version), with a spare line above it, at
    # least one, so Clawd sits off the prompt (and has room to jump)
    split(ENVIRON["DPV_CLAWD"], C, "\n")
    h = (C[5] != "") ? 4 : 3
    while (n <= h) { L[++n] = ""; V[n] = 0 }
    top = int((n - h + 1) / 2) # an odd spare line goes above, off the prompt
    for (i = 1; i <= n; i++) { a = i - 1 - top; K[i] = (a >= -1 && a < h) ? C[a + 2] : "" }
    # the panel: as wide as the room left of Clawd, a blank cell before his
    # block line, never narrower than its widest line; his canvas, 11 cells,
    # after that line
    pw = w + 1
    if (inner != "" && inner - 12 > pw) pw = inner - 12
    fw = pw + 12
  } else {
    pw = w
    if (inner != "" && inner + 0 > pw) pw = inner + 0
    fw = pw
  }
  if (framed) print fc ENVIRON["DPV_FTL"] rule(fw) ENVIRON["DPV_FTR"] rs
  for (i = 1; i <= n; i++) {
    if (R[i]) {
      # the rule: a blank cell before Clawd block line; the frame borders
      # beside it are left blank below
      body = clawd ? fc rule(pw - 1) rs " " : fc rule(pw) rs
    } else body = L[i] sp(pw - V[i])
    if (clawd) body = body (framed ? fv : " ") K[i] sp(11 - vis(K[i]))
    if (!framed) { sub(/ +$/, "", body); print body; continue }
    if (R[i]) print " " body (clawd ? fv : " ")
    else print fv body fv
  }
  if (framed) print fc ENVIRON["DPV_FBL"] rule(fw) ENVIRON["DPV_FBR"] rs
}'
res=$(panel | DPV_INNER=$inner DPV_CLAWD=$clawdrows DPV_FRAMED=$framed DPV_FC=$(esc "$c_frame") DPV_RESET=$reset \
  DPV_FH=$fh DPV_FV=$fv DPV_FTL=$ftl DPV_FTR=$ftr DPV_FBL=$fbl DPV_FBR=$fbr LC_ALL=C awk "$draw"; printf x)
res=${res%x}
printf '%s' "$res"

# kept for the next run while Clawd stands still
if [ -n "$rc" ]; then
  [ -d "$mod/render" ] || mkdir -p "$mod/render"
  { printf '%s\n' "$now"; printf '%s\n' "$key"; printf '%s\n' "$SEP"; printf '%s' "$res"; } > "$rc.$$" 2>/dev/null && mv -f "$rc.$$" "$rc" 2>/dev/null
fi
exit 0
