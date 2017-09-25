startLoop:
  COPY 0d3, 0       # Run this loop 3 times.
  DEC 0             # Decrement the loop counter.
  JNZ startLoop, 0  # When addr 1 is zero, fall throughs
