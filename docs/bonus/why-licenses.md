# Why different licenses?

- [Introduction](#introduction)
- [Why MIT license for engine?](#why-mit-license-for-engine)
- [Why GPLv3 for the editor?](#why-gplv3-for-the-editor)

## Introduction

Those with curiosity mind might have noticed that Nahara's Motion have two
different licenses:

- **Nahara's Motion Engine**, which is the heart of Nahara's Motion, is licensed
  under "The MIT license";
- **Nahara's Motion Editor** is licensed under GPLv3;
- **This user manual** is licensed under CC-BY-SA 4.0.

## Why MIT license for engine?

The general idea is to spread the adoption of Nahara's Motion Engine by not
trying to impact the forks or modifications that uses the engine by allowing any
software to use the engine without opening up the source code. This makes the
engine suitable for use in interactive experiences like websites and games,
which are probably how the motion graphics engine is going to be used outside
the editor.

If the engine were to be licensed under copyleft licenses like GPLv3, people
would just find a different library that can do what Nahara's Motion is doing
instead, just so they can use the animations in their own software without
opening up the internals.

## Why GPLv3 for the editor?

Editor is much more different comparing to engine. From one side, we got the
library that can be used in any software, whether it is proprietary or not,
which is important if we care about the adoption of Nahara's Motion. From the
other side, we want to make sure that people have the freedom to do anything
they want with the editor, while making sure the freedom must be retained, even
with forks.

In reality, it doesn't really matter if the editor is licensed under either
copyleft or proprietary license when it comes to adoption of the engine. The
only thing people care about is creating the files needed for the engine.
Except... Nahara's Motion Editor isn't just the editor for the engine, it's also
the editor for creating motion graphics in general, and people should have the
freedom to do anything with the tool as long as the freedom can't be restricted
in any ways.
