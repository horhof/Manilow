```x86asm
TestAge:
            DEF      &studentAge, 0
            DEF      &minAge, 1
            GTE      @studentAge, @minAge
            ELSE     tooYoung
oldEnough:  PUSH     &studentOldEnough
            ENTER    printf
            GOTO     end
tooYoung:   PUSH     &studentOldEnough
            ENTER    printf
end:        EXIT
```