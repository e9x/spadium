<h1 align="center">Spadium</h1>

<p align="center"><img src="./spade.svg" alt="spade" height="100"></p>

Spadium is a JavaScript browser library that creates an IFrame and manually fetches every asset for a given website, allowing it to be rendered locally without any external requests.

## TompHTTP

Spadium uses the [Bare server](https://github.com/tomphttp/specifications/blob/master/BareServer.md) in order to make network requests.

## Feature comparison

| Feature        | Spadium              | [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) |
| -------------- | -------------------- | ----------------------------------------------------------------- |
| Backend        | Document             | ServiceWorker                                                     |
| Cookies        | :white_check_mark:   | :white_check_mark:                                                |
| HTML rendering | :white_check_mark:   | :white_check_mark:                                                |
| CSS rendering  | :white_check_mark:   | :white_check_mark:                                                |
| Video playback | :white_large_square: | :white_check_mark:                                                |
| Audio playback | :white_check_mark:   | :white_check_mark:                                                |
| JavaScript     | :white_large_square: | :white_check_mark:                                                |

## Demonstration

See [Spadium Lite](https://github.com/e9x/spadium-lite)
