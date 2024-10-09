# Coming up with the plan for WebGL(2) renderer
## Architecture
For every container that have a collection of objects, its children will renders to its render target (which is framebuffer). That framebuffer will be rendered to the parent's render target (after going through the modifiers chain).

## Example
Given a scene tree below:

- Scene framebuffer
- `container1`: `Container extends ISceneContainerObject`
  + Modifiers chain
  + Framebuffer
  + `box1`: `Box2D extends ISceneObject`
  + `text1`: `Text2D extends ISceneObject`
  + `container2`: `Container extends ISceneContainerObject`
    + Modifiers chain
    + Framebuffer
    + `box2`: `Box2D extends ISceneObject`

The scene will be rendered as follow:

- Resize `container2` framebuffer to match its current size
- Render `box2` to `container2` framebuffer
- Apply modifiers on `container2` framebuffer
- Render `box1` to `container1` framebuffer
- Render `text1` to `container1` framebuffer
- Render `container2` to `container1` framebuffer (slapping `container2` framebuffer as texture to `container1`)
- Apply modifiers on `container1` framebuffer
- Render `container1` to scene framebuffer (slapping `container1` framebuffer as texture to scene framebuffer)

## How is it better than Canvas 2D?
- Advanced blending mode: Blend the result of container
- Shader support: Write shader in GLSL or make the shader by connecting nodes