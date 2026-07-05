# Nahara's Motion Engine

Engine for motion graphics.

## Compatibility

- **Graphics**: Nahara's Motion uses WebGPU as graphics API, so the compatibility heavily relies on where WebGPU is
  supported.
  - **Deno**: Fully supported since 2.0
  - **Chromium**: Partially supported
    - Fully supported on Windows x64, macOS and Android since 121
    - Fully supported on Linux with Intel iGPU and NVIDIA since 147
    - Locked behind a flag otherwise
  - **Firefox**: Partially supported
    - Fully supported on Windows and macOS since 147
    - Only available in nighly branch otherwise
  - **Safari**: Fully supported since 26
- **Audio**: The audio system is tied to Web Audio API for the time being.
  - **Deno**: Not supported yet
  - **Chromium**/**Firefox**/**Safari**: Fully supported

## License

Nahara's Motion Engine is licensed under [MIT license][license].

[license]: ./LICENSE
