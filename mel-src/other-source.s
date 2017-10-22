;======= ======== ========...
         define   &count, 0d20
         copy     0d20, @count
         copy     0d1
Loop
         double
         inc      @accum
         dec      @count
         if       end
         jump     loop
end:     halt