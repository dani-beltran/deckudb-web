Review the pull request changes against the base branch. Inspect the relevant implementation,
tests, and configuration before reaching conclusions. Do not modify repository files or execute
project scripts, binaries, hooks, or tests; use read-only inspection and Git commands only.

Focus on actionable problems introduced by the pull request, especially:

- correctness and behavioral regressions
- security, privacy, and secret-handling risks
- data loss, race conditions, and error-handling gaps
- API or configuration compatibility breaks
- missing tests for meaningful new behavior

For each finding, include its severity (`P0` through `P3`), a concise title, the affected file and
line or smallest useful line range, and a short explanation of the impact and a concrete trigger.
Do not report style preferences, speculative concerns, praise, or a general change summary. Avoid
duplicate findings. If there are no actionable findings, say exactly: `No actionable findings.`
