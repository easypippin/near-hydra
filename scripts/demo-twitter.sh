#!/usr/bin/env bash
# Twitter-optimized demo: short, big, dramatic. ~8 seconds.
set -e

HYDRA="node $(cd "$(dirname "$0")/.." && pwd)/packages/cli/dist/index.js"

type_line() {
  printf '\033[1;32m❯\033[0m '
  for (( i=0; i<${#1}; i++ )); do
    printf '%s' "${1:$i:1}"
    sleep 0.04
  done
  printf '\n'
}

clear
sleep 0.3

# Single command, max wow. Skip the derive — go straight to the 10-chain spill.
type_line "near-hydra account balance-all near"
sleep 0.2
$HYDRA account balance-all near
sleep 2.5
