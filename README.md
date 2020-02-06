# non-deterministic-source

Quick examples

```
const integer_from = n => amb(n, integer_from(n + 1)); integer_from(1);
// Result: 1, 2, 3, 4, ...
```

```
const f = amb(1, 2, 3); const g = amb(5, 6, 7); f;
// Result: 1, 1, 1, 2, 2, 2, 3, 3, 3
```

```
const f = amb(1, 2, 3); const g = amb(5, 6, 7); g;
// Result: 5, 6, 7, 5, 6, 7, 5, 6, 7
```

