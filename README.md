# Cloud 9 Carousel

Cleaned up, refactored, and improved version of [CloudCarousel](http://webscripts.softpedia.com/script/Image-Galleries/Image-Tools/Cloud-Carousel-65275.html), a jQuery 3D image carousel originally released by [Professor Cloud](#authors).

## Try the **demo**!

<a href="http://specious.github.io/cloud9carousel/">![http://specious.github.io/cloud9carousel/](http://specious.github.io/cloud9carousel/images/screenshots/demo-browsers.png "Cloud 9 Carousel live demo!")</a>

## Live examples

<a href="http://www.julemagne.com/">![Julemagne.com](http://specious.github.io/cloud9carousel/images/screenshots/julemagne.png "Julemagne.com")</a>

## Features

- Just one JavaScript file
- Works with jQuery **or** Zepto
- Fast
- Easy to use
- *(optional)* Reflections (via [reflection.js](http://www.digitalia.be/software/reflectionjs-for-jquery))
- *(optional)* Mouse wheel support (via [mousewheel plugin](http://plugins.jquery.com/mousewheel/))
- *(optional)* Rotate clicked item to front
- *(optional)* Auto-play
- Create multiple instances

## Dependencies

- [jQuery](https://github.com/jquery/jquery) 1.3.0 or later **or** [Zepto](https://github.com/madrobby/zepto) 1.1.1 or later
- Optional mirror effect using the [reflection.js plugin](http://www.digitalia.be/software/reflectionjs-for-jquery) by Christophe Beyls (jQuery only)
- Optional mouse wheel support via the [mousewheel plugin](http://plugins.jquery.com/mousewheel/) (jQuery only)

## Documentation

### Basic usage

HTML:
```
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
```
#carousel .cloud9-item, #buttons button {
  cursor: pointer;
}
```

JavaScript:
```
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

## License

Licensed under the [MIT License](http://en.wikipedia.org/wiki/MIT_License)