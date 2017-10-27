  GOTO ProgramStart
SubRoutine:
  MUL 0d10;         ; Multiple the accumulator value.
  EXIT @accum
ProgramStart:
  COPY 0d5          ; Put 5 into the accumulator.
  ENTER SubRoutine
  ENTER SubRoutine
  HALT