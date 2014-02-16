# Cloud 9 Carousel

Cleaned up, refactored, and improved version of [CloudCarousel](http://webscripts.softpedia.com/script/Image-Galleries/Image-Tools/Cloud-Carousel-65275.html), a jQuery 3D image carousel originally released by [Professor Cloud](#authors).

## Features

- Just one JavaScript file
- Works with jQuery **or** Zepto
- Fast
- Easy to use
- *(optional)* Reflections (via [reflection.js](http://www.digitalia.be/software/reflectionjs-for-jquery))
- *(optional)* Mouse wheel support (via [mousewheel plugin](http://plugins.jquery.com/mousewheel/)) [see: [note](#known-issues)]
- *(optional)* Rotate clicked item to front
- *(optional)* Auto-play
- Smooth animation via [requestAnimationFrame](http://ie.microsoft.com/testdrive/Graphics/RequestAnimationFrame/) with fixed-FPS fallback mode
- CSS transforms (detects support automatically)
- Create multiple instances
- Handy callback events

## Live examples

### Basic demo

<a href="http://specious.github.io/cloud9carousel/">![Basic demo](http://specious.github.io/cloud9carousel/images/screenshots/demo-browsers.png "Cloud 9 Carousel live demo!")</a>

### Fine art gallery (advanced manipulation)

<a href="http://www.julemagne.com/">![Julemagne.com](http://specious.github.io/cloud9carousel/images/screenshots/julemagne.png "Julemagne.com")</a>

## Dependencies

- [jQuery](https://github.com/jquery/jquery) 1.3.0 or later **or** [Zepto](https://github.com/madrobby/zepto) 1.1.1 or later
- Optional mirror effect using the [reflection.js plugin](http://www.digitalia.be/software/reflectionjs-for-jquery) by Christophe Beyls (jQuery only)
- Optional mouse wheel support via the [mousewheel plugin](http://plugins.jquery.com/mousewheel/) (jQuery only)

## Documentation

### Basic usage

HTML:
```html
<div id="carousel">
  <img class="cloud9-item" src="images/1.png" alt="Item #1">
  <img class="cloud9-item" src="images/2.png" alt="Item #2">
  <img class="cloud9-item" src="images/3.png" alt="Item #3">
  <img class="cloud9-item" src="images/4.png" alt="Item #4">
  <img class="cloud9-item" src="images/5.png" alt="Item #5">
  <img class="cloud9-item" src="images/6.png" alt="Item #6">
</div>

<div id="buttons">
  <button class="left">
    ←
  </button>
  <button class="right">
    →
  </button>
</div>
```

CSS:
```css
#carousel .cloud9-item, #buttons button {
  cursor: pointer;
}
```

JavaScript:
```js
$("carousel").Cloud9Carousel( {
  buttonLeft: $("#buttons > .left"),
  buttonRight: $("#buttons > .right"),
  autoPlay: true,
  bringToFront: true
} )
```

### Advanced usage

See the [example code](https://github.com/specious/cloud9carousel/tree/gh-pages)

## Authors

- Upgrades by [Ildar Sagdejev](http://twitter.com/tknomad)
- Forked from CloudCarousel v1.0.5 by [Professor Cloud](http://www.professorcloud.com/) (R. Cecco)

## Known issues

- Due to lack of standartisation, "mousewheel" scrolling is ridiculously sensitive and unmanageable when using some track pads (such as on the MacBook Pro).  Unfortunately, since there appears to be no way to know directly what type of device is triggering the mousewheel events, it is not trivial to somehow normalise or "tame" the input from the track pad without also affecting the "1 tick per click" behaviour of the standard mouse wheel.  **darsain** has described the same phenomenon in [this discussion](https://github.com/darsain/sly/issues/67) at the sly.js project.  Ideas are [appreciated](https://github.com/specious/cloud9carousel/issues/1).

## License

Licensed under the [MIT License](http://en.wikipedia.org/wiki/MIT_License)