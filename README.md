# rp-mathjax

[MathJax](https://mathjax.org/) plugin for [ractive-player](https://www.npmjs.com/package/ractive-player).

## Usage

```tsx
import {MJX} from "rp-mathjax";

function Quadratic() {
  return (
    <div>
      The value of <MJX>x</MJX> is given by the quadratic formula
      <MJX display>{String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`}</MJX>
    </div>
  );
}
```
