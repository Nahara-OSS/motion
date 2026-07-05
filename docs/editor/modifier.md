# Modifier

- [Introduction](#introduction)
- [Wait... they are just objects?](#wait-they-are-just-objects)

## Introduction

The concept of modifier allows the objects to have its visual altered by a set
of modifiers, which are evaluated from bottom to top of the tree. The modifiers
are treated just like regular objects, and these have the same properties that a
normal object would have (start time, end time, visibility state and more).

## Wait... they are just objects?

Yes.

Nahara's Motion does not give modifiers any special treatments, and so you can
use them like regular objects. However, modifiers does not renders anything by
itself when placed at the root of the scene; you still have to place the
modifiers inside an existing object.

This might be confusing to some people, and so the editor would show a warning
icon when you tried to place the modifier at wrong location, even though it
still produce a valid scene tree.
