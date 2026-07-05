# Architecture in Nahara's Motion

- [Objects](#objects)
- [Rendering](#rendering)
  - [Global-level and local-level renderers](#global-level-and-local-level-renderers)
  - [Render environment](#render-environment)
  - [Render target](#render-target)

## Objects

Nahara's Motion uses the tree-based system for objects (that is, the object
consists of multiple children, which are also objects). An object in the scene
does not have any information about its parent or children beforehand, which
allows the child to belong to any kind of object, thus making the scene system
flexible.

> If the child does not know anything about its parent, or the parent does not
> know anything about its children, how can the children affect the visuals of
> parent?

During rendering, the object receives the special struct called "render target"
from parent (or if the object is connected to scene root, it receives render
target from the scene instead), mutate the render target, and pass the render
target(s) to children, without ever knowing anything about the content of parent
or children. More information about rendering in the
[Render target section](#render-target).

## Rendering

### Global-level and local-level renderers

Nahara's Motion consists of 2 renderer levels: global (for all objects of the
same kind) and local (for each object).

- **Global-level** renderer manages the shared resources (eg: shaders, render
  pipelines or bind group layouts) for all objects of the same kind. This kind
  of renderer will only be created when there is at least one object of specific
  kind visible in the scene. Global-level renderer also produces local-level
  renderers.

- **Local-level** renderer manages the local resources that will only be used
  for rendering a specific object. This kind of renderer will be created for
  each object visible in the scene.

### Render environment

The render environment struct provides the resources needed for creating, well,
other resources related to rendering the scene in specific environment, such as
graphics, audio or editor. For example:

- **Graphics** environment exposes a handle to GPU device so the renderers can
  create GPU resources needed for rendering the objects;

- **Audio** environment exposes a handle to audio playback device so the
  renderers can create and mutate circular buffer to "render" the audio;

- **Editor** environment provides an interface for interacting with the editor,
  such as showing draggable handles or add new items to context menu.

### Render target

As briefly described in [Objects section](#objects), an object receives render
target from parent or scene root, mutates the render target (eg: changing the
value of specific struct field) and provide one or more render targets to
children. We call the act of mutating the render target "rendering".

After the render target is mutated by children, the object then query the values
in the render target's fields and use that to determine what to do with render
target provided from parent. For example, given the following scene tree:

- **Text**: "The quick brown fox"
  - **Text selector**: Word range #1 to #2 ("The quick")
    - **Transform modifier**: Translation `(0; 1000 - time)`

During render pass inside graphics environment, the following will happens:

1. **Text** object receives the graphics render target, which contains the
   framebuffer that the object can draw the result into;

1. **Text** create and pass selectable render target to **Text selector**, which
   upon selecting, will produce transformable render target that only affect the
   selection;

1. **Text selector** select the first 2 words from selectable render target,
   obtains the transformable render target associated with it and pass that
   target down to **Transform modifier**;

1. **Transform modifier** modify the transformation matrix on transformable
   render target;

1. **Text** iterate through characters, query the transformation related to it
   and render them to correct location into the framebuffer from graphics render
   target.
