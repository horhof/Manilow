  define: &count, 0d20
  copy: 0d20, @count
  copy: 0d1
loop:
  double
  inc: @accum
  dec: @count
  jump zero: end, @count
  jump: loop
end:
  halt