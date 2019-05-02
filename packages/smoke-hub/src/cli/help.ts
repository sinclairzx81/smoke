export function help() {
  const green  = '\x1b[32m'
  const esc    = '\x1b[0m'
  console.log(`Version 0.8.2

Examples: ${green}smoke-hub${esc} --port 5000
          ${green}smoke-hub${esc} --port 5000 --config ./ice.json
          ${green}smoke-hub${esc} --port 5000 --trace

Options:
  --port    The port to start this hub on (default is 5001)
  --config  The path to a JSON file containing the RTCConfiguration.
  --trace   If specified, will emit protocol messages to stdout.
  `)
}
  
