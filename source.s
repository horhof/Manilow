  define: &count, 0d20
  copy: 0d20, @count
  copy: 0d1
loop:
  double
  dec: @count
  jump zero: end, @count
  jump: loop
end:
  halt