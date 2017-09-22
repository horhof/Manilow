  COPY 0d3, 20  # Run this loop 3 times.
startLoop:
  IN
  OUT
  DEC 20       # Decrement the loop counter.
  JNZ 2, 20    # When addr 1 is zero, fall through.