#!/usr/bin/env bash
# Demo for the asciinema/agg recording. Keep it tight and visually striking.
set -e

HYDRA="node $(cd "$(dirname "$0")/.." && pwd)/packages/cli/dist/index.js"

type_line() {
  printf '\033[1;36m$\033[0m '
  for (( i=0; i<${#1}; i++ )); do
    printf '%s' "${1:$i:1}"
    sleep 0.03
  done
  printf '\n'
}

clear
sleep 0.6

type_line "near-hydra address derive -c bitcoin -p near"
$HYDRA address derive -c bitcoin -p near
sleep 1.2

type_line "near-hydra account balance-all near"
$HYDRA account balance-all near
sleep 2.0
