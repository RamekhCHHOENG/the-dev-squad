# TODO

## Next Up

- Finish Squad View polish:
  - tighten the left rail and team list
  - reduce badge noise in the center header
  - keep improving the chat transcript so it feels closer to a real terminal/chat hybrid
- Add clearer execution-path visibility everywhere:
  - show `HOST`, `ISOLATED ALPHA`, or `HOST FALLBACK` consistently in both Office View and Squad View
  - surface that state more clearly in supervisor chat updates
- Add isolated-auth preflight:
  - detect Docker/subscription auth readiness before Coder or Tester starts
  - tell the Supervisor up front when host fallback will be used
- Keep hardening the Docker runner:
  - continue investigating why real isolated Claude turns are still unreliable in the app runner path
  - preserve host fallback until isolated mode is truly dependable
- Improve supervisor-native recovery:
  - make approval and failure flows read more like manager guidance
  - keep reducing cases where users need to inspect raw pipeline details

## v0.4.0 Gate

- Real isolated mode that is reliable enough to expose as a supported user-facing mode
- Runner abstraction fully proven in real build sessions
- Better containment story than the current host-fallback alpha path

## Keep Honest

- Fast and Strict are the public supported modes today
- Docker isolation is built and integrated, but still alpha
- Manual mode still relies on Claude permission prompts rather than pipeline guardrails
