# YCode

[![Build YCode](https://github.com/nab138/YCode/actions/workflows/build.yml/badge.svg)](https://github.com/nab138/YCode/actions/workflows/build.yml)

iOS Development IDE for linux and windows, built with [Tauri](https://tauri.app/).

Coming soon...

## Installation

YCode is currently in development and not recommended for use. However, if you want to try it out, your feedback would be greatly appreciated!

**Windows is not supported yet. Work to support it is currently ongoing. Please do not open windows related issues at this time.**

You can download the latest build from [actions](https://github.com/nab138/YCode/actions/workflows/build.yml).

## How it works

- A darwin sdk is generated from a user provided copy of Xcode and darwin tools from [darwin-tools-linux-llvm](https://github.com/xtool-org/darwin-tools-linux-llvm)
- SPM uses the darwin sdk to build an executable which is packaged into an .app bundle.
- [apple-private-apis](https://github.com/SideStore/apple-private-apis) is used to login to the Apple Account. Heavy additions have been made to support actually accessing the Developer APIs
- [ZSign](https://github.com/zhlynn/zsign) is used to sign the IPA with the certificate and provisioning profile acquired from the Apple Account
- [idevice](https://github.com/jkcoxson/idevice) is used to install the IPA on the device.

- [xtool](https://xtool.sh) has been used as a reference for the implementation of the darwin sdk generation.
- [Sideloader](https://github.com/Dadoum/Sideloader) has been heavily used as a reference for the implementation of the Apple Developer APIs and sideloading process.

## Progress

**Installing App**

- [x] Login to Apple Account
- [x] Create lockdown connection with device (retrives name)
- [x] Register Device as a development devices
- [x] Create/Save Certificate for YCode
- [x] Create an App ID for the app
- [x] Create & manage an application group for the app
- [x] Acquire a provisioning profile for the app
- [x] Sign the app
- [x] Install the app!

**Coding App**

- [x] Rudimentary File Browser
- [x] Code editor (monaco editor)
- [x] Project Creation
- [x] Project Templates
- [x] SwiftPM support
- [ ] Swift LSP Support
- [ ] UI to change makefile settings
- [ ] Git integration
- [ ] Debugging (more research needed)

## What AI did

- Generated the logo
- Helped port some code from [Sideloader](https://github.com/Dadoum/Sideloader)
