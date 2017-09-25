  COPY 0d6, 10       # Run this loop 6 times to get all the inputs.
                     # The loop counter is at address 10.
startLoop:
  IN
  OUT
  DEC 10             # Decrement the loop counter.
  JNZ startLoop, 10  # When loop counter is zero, end program.
  HCF