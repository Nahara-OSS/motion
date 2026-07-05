# Composition

- [Introduction](#introduction)
- [Managing compositions](#managing-compositions)
  - [In Compositions panel](#in-compositions-panel)
  - [In Outline panel](#in-outline-panel)
- [Using compositions](#using-compositions)
  - [Nesting scene](#nesting-scene)
  - [Rendering](#rendering)
  - [Outside the editor](#outside-the-editor)

## Introduction

A composition stores the visible states of all objects in the scene. A single
scene can have multiple compositions, and there can be at most one composition
activated at the same time. When the composition is activated, the visibility of
all objects changes to whatever state stored in that composition.

The idea of composition originates from the question: _"How does one store
multiple animations while keeping the same rig?"_. The rig is basically the
"frame" that can be manipulated using modifiers (usually with transform
modifiers). For a single animation, only a subset of modifiers is activated,
which controls which modifiers can affect the "frame".

The concept of composition is not just limited to Nahara's Motion; other
softwares like Krita also have compositions, where each composition stores the
visibility states of all layers in the document. It is effective when it comes
to producing game assets, and this concept can also be applied to Nahara's
Motion.

## Managing compositions

### In Compositions panel

The primary way of managing compositions is through Compositions panel, which
can be opened by clicking "Window" > "Compositions". In this panel, you can
select, activate, rename, reorder, add new, duplicate and delete compositions.

- Select the composition by clicking on the composition _once_;

- Activate the composition by doublie-clicking the composition;

- Rename the composition by right-clicking the composition and click "Rename",
  or select the composition and click "Edit" > "Rename";

- Reorder the composition by clicking the Up/Down arrow buttons, click "Edit" >
  "Move up/down" or hold mouse button and drag the composition;

- Add new composition by clicking "Add" > "New composition" button on menu bar
  and enter new composition name, which will create a new composition with all
  objects toggled on by default;

- Duplicate the composition by right-clicking the composition and click
  "Duplicate" or select the composition and click "Edit" > "Duplicate";

- Delete composition by right-clicking the composition and click "Delete", or
  delete multiple compositions by selecting multiple compositions (hold
  Ctrl/Shift while selecting) and click "Edit" > "Delete".

Additionally, the actions can be bound to key combination(s) in Settings window,
which can be opened by clicking "Window" > "Settings". It is important to note
that the keybindings will **only usable when the mouse pointer is hovering on
the Compositions panel**.

The order of compositions are used for determining the icon and index when using
the scene as child of another, as described in
[Nesting scene section](#nesting-scene).

### In Outline panel

In addition to compositions panel, there's also a small composition manager
embedded inside Outline panel, located at the right of panel's menu bar.

In default view mode, the composition manager button only shows the currently
active composition. In full view mode, the menu button is placed next to all
composition buttons. Clicking on the menu button shows the list of compositions
to select, as well as options to add new, duplicate or delete currently selected
composition, and option to show all compositions on the menu bar. Clicking on
composition buttons will activate the specific composition.

When "Show all compositions" is toggled, the objects in outline tree will show
multiple visibility checkboxes, each associated with a specific composition.
When this option is disabled, the objects in outline tree will only show the
visibility checkbox associated with currently selected composition.

## Using compositions

Besides from activating the composition for current scene, the compositions can
also be used for other purposes:

### Nesting scene

When using the scene as object in other scene, the object properties also
contains a field for selecting which composition to use. By default, the first
composition will be used. The property is also _animatable_, which can be
controlled using keyframes or math expression.

### Rendering

When using the render queue, you can queue a new job that renders the scene with
specific composition.

### Outside the editor

Compositions, together with markers, can be used outside the editor (like games
or interactive webpages for example) to dynamically switch the rig animation on
the fly. More information on using the compositions outside the editor can be
found inside the library's documentation.
