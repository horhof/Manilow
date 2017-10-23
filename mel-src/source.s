  jump: ProgramStart
SubRoutine:
  mul: 0d10;          Multiple the accumulator value.
  return: @accum
ProgramStart:
  copy: 0d5;          Put 5 into the accumulator.
  call: SubRoutine
  call: SubRoutine
  halt