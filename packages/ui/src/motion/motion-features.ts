import { domAnimation } from 'motion/react';

// The split point `LazyMotion` loads on mount. It has to be its own module with a default export,
// and nothing may import it statically, or the bundler folds the feature bundle back into the
// entry chunk and the lazy import buys nothing. `domMax` is the other half — layout projection and
// drag — and it is the expensive one, so it stays out until a surface needs it.
export default domAnimation;
