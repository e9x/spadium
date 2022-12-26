# Spadium

Spadium is a JavaScript browser library that creates an IFrame and manually fetches every asset for a given website, allowing it to be rendered locally without any external requests.

## TompHTTP

Spadium uses the [Bare server](https://github.com/tomphttp/specifications/blob/master/BareServer.md) in order to make network requests.

## Feature comparison

| Feature        | Spadium  | [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) |
| -------------- | -------- | ----------------------------------------------------------------- |
| Backend        | Document | ServiceWorker                                                     |
| Cookies        | ✅       | ✅                                                                |
| HTML rendering | ✅       | ✅                                                                |
| CSS rendering  | ✅       | ✅                                                                |
| Video playback | ⛔       | ✅                                                                |
| Audio playback | ✅       | ✅                                                                |
| JavaScript     | ⛔       | ✅                                                                |

## Demonstration

See [Spadium Lite](https://github.com/e9x/spadium-lite)
