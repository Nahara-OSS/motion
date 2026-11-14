# Details

## What are the notable changes?

### New GPLv3 license

_TODO: Nahara-chan at a court (oh no...)._

While rewriting Nahara's Motion from the ground up, we also decided to make the editor licensed under GPLv3, as opposed
to MIT license like in debut version. To users, this changes nothing at a glance:

- We are still distributing Nahara's Motion free-of-charge.

- Your copyright/ownership on your creations (motion graphics, videos, assets, etc) remains intact when they are created
  inside Nahara's Motion Editor. This includes past versions (MIT-licensed) and this rewrite (GPLv3).

- This change only affect derivatives (a.k.a "forks") of Nahara's Motion Editor, or software directly depending on
  Nahara's Motion Editor.

  - Editor forks are now required to keep the same GPLv3 license.
  - "Plugins" and "mods" must also be licensed under GPLv3.

- This change does not affect Nahara's Motion Engine, as it is still using the old license (MIT license).

If you only speak in legal words, head over to [this legal text](./editor/LICENSE) to review the new license for
Nahara's Motion Editor.

Before you panic, **Nahara's Motion Engine is still licensed under MIT license**. We are not planning to change this
anytime soon (even if we did, it has to be LGPLv3). You can still include the engine inside your apps or games. You can
even make proprietary authoring tool that is directly competing with us while still using the same foundation (we are
fully aware of this).

### GPU acceleration to 11

Okay, we actually have "GPU acceleration" in a sense that we are using the renderer that is built-in inside web
browsers. It wasn't great though, so now we are looking to move towards to a more... _fancy_ graphics system.

With the new system, you can now do shader effects, cool filters, 120 FPS playback, 2D mesh deform and more. Sounds
exciting? Because it is.

_It's actually just transitioning from Canvas 2D to WebGPU, don't think about it too much._

## What's new in this rewrite?

### Component system

The biggest advancement since ~~the invention of light bulbs~~ debut: components!!!

_TODO: Puzzle piece artwork or whatever._

Think of component as nested scene system: you can make your own component, look at component, disect the component,
include component inside another component or ~~eat the component~~. Some components behave a little bit differently
based on whatever inputs you throw at them, but overall, it is a great tool for organizing your scene.

### Expression in property

Onec upon a time, ~~monster and human~~ constant values and keyframes live in hamorny. Until one day, a new primitive
just spawned out of thin air. And that primitive is called _expression_.

Love it or hate it, you are going to write math expression and let the computer do the thinking for you, because
appearently calculating $42 * 1000$ requires way too much brain power for you.

### Module system

Projects are now packages, and packages now contain assets and modules (similar to npm). This means you can now reuse
your scenes and assets from a project in another one.

_TODO: Nahara-chan carrying boxes (packages)._

A new registry system allows you to import packages from the internet to your project, all without having to copy and
paste content around.

_TODO: Nahara-chan buying cardboard boxes at a marketplace (really? cardboard boxes?)._

Oh, did we forgot to mention that you can add your own registry? You can even add your own login method as well, so
integration with premium asset store is going to be crazy. :speaking_head::fire::fire:
