# Spadium

Spadium is a JavaScript browser library that creates an IFrame and manually fetches every asset for a given website, allowing it to be rendered locally without any external requests.

## TompHTTP

Spadium uses the [Bare server](https://github.com/tomphttp/specifications/blob/master/BareServer.md) in order to make network requests.

## Feature comparison

| Feature        | Spadium                                    | [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Backend        | Document                                   | ServiceWorker                                                     |
| Cookies        | <input type="checkbox" disabled checked /> | <input type="checkbox" disabled checked />                        |
| HTML rendering | <input type="checkbox" disabled checked /> | <input type="checkbox" disabled checked />                        |
| CSS rendering  | <input type="checkbox" disabled checked /> | <input type="checkbox" disabled checked />                        |
| Video playback | <input type="checkbox" disabled  />        | <input type="checkbox" disabled checked />                        |
| Audio playback | <input type="checkbox" disabled checked /> | <input type="checkbox" disabled checked />                        |
| JavaScript     | <input type="checkbox" disabled />         | <input type="checkbox" disabled checked />                        |

## Demonstration

See [Spadium Lite](https://github.com/e9x/spadium-lite)
