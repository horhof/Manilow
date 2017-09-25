  COPY 0d6, 10  # Run this loop 6 times to get all the inputs.
                # The loop counter is at address 10.
run loop:
  IN
  OUT
  DEC 10        # Decrement the loop counter.
  JZ exit program, 10   # If we're at zero, end program.
  JUMP run loop     # ...else loop again.
exit program:
  HCF