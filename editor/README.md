# Nahara's Motion Editor

Motion graphics authoring tool for Nahara's Motion.

## Developer notes

### Renderer thread

The renderer thread (also known as UI thread) should only touch `preact` for user interface and worker/message channels
for communicating with workers.
