/*
 * Cloud 9 Carousel
 *   Cleaned up, refactored, and improved version of CloudCarousel
 *
 * See the demo and get the latest version on GitHub:
 *   http://specious.github.io/cloud9carousel/
 *
 * Copyright (c) 2014 by Ildar Sagdejev ( http://twitter.com/tknomad )
 * Copyright (c) 2011 by R. Cecco ( http://www.professorcloud.com )
 * MIT License
 *
 * Please retain this copyright header in all versions of the software
 *
 * Requires:
 *  - jQuery 1.3.0 or later -OR- Zepto 1.1.1 or later
 *
 * Optional (jQuery only):
 *  - Reflection support via reflection.js plugin by Christophe Beyls
 *     http://www.digitalia.be/software/reflectionjs-for-jquery
 *  - Mousewheel support via mousewheel plugin
 *     http://plugins.jquery.com/mousewheel/
 */

;(function($) {
  //
  // Detect CSS transform support
  //
  var transform = (function() {
    var vendors = ['webkit', 'moz', 'ms'];
    var style   = document.createElement( "div" ).style;
    var trans   = 'transform' in style ? 'transform' : undefined;

    for( var i = 0, count = vendors.length; i < count; i++ ) {
      var prop = vendors[i] + 'Transform';
      if( prop in style ) {
        trans = prop;
        break;
      }
    }

    return trans;
  })();

  var Item = function( image, options ) {
    image.item = this;
    this.image = image;
    this.fullWidth = image.width;
    this.fullHeight = image.height;
    this.alt = image.alt;
    this.title = image.title;

    image.style.position = 'absolute';
    image = $(image);

    if( options.mirror ) {
      // Wrap image in a div together with its generated reflection
      this.reflection = image.reflect( options.mirror ).next()[0];

      var $reflection = $(this.reflection);
      this.reflection.fullHeight = $reflection.height();
      $reflection.css('margin-top', options.mirror.gap + 'px');
      $reflection.css('width', '100%');
      image.css('width', '100%');

      // The item element now contains the image and reflection
      this.element = this.image.parentNode;
      this.element.item = this.image.item;
    } else
      this.element = this.image;

    if( transform && options.transforms )
      this.element.style[transform + "Origin"] = "0 0";

    this.moveTo = function( x, y, scale ) {
      this.width = this.fullWidth * scale;
      this.height = this.fullHeight * scale;
      this.x = x;
      this.y = y;
      this.scale = scale;

      var style = this.element.style;
      style.zIndex = "" + (scale * 100) | 0;

      if( transform && options.transforms ) {
        style[transform] = "translate(" + x + "px, " + y + "px) scale(" + scale + ")";
      } else {
        // The gap between the image and its reflection doesn't resize automatically
        if( options.mirror )
          this.reflection.style.marginTop = (options.mirror.gap * scale) + "px";

        style.width = this.width + "px";
        style.left = x + "px";
        style.top = y + "px";
      }
    }
  }

  var time = (function() {
    return !window.performance || !window.performance.now ?
      function() { return +new Date() } :
      function() { return performance.now() };
  })();

  //
  // Detect requestAnimationFrame() support
  //
  // Support legacy browsers:
  //   http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  //
  var cancelFrame = window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
  var requestFrame = window.requestAnimationFrame;

  (function() {
    var vendors = ['webkit', 'moz', 'ms'];

    for( var i = 0, count = vendors.length; i < count && !cancelFrame; i++ ) {
      cancelFrame = window[vendors[i]+'CancelAnimationFrame'] || window[vendors[i]+'CancelRequestAnimationFrame'];
      requestFrame = requestFrame && window[vendors[i]+'RequestAnimationFrame'];
    }
  }());

  var Carousel = function( element, options ) {
    var self = this;
    var $container = $(element);
    this.items = [];
    this.xOrigin = (options.xOrigin === null) ? $container.width()  * 0.5 : options.xOrigin;
    this.yOrigin = (options.yOrigin === null) ? $container.height() * 0.1 : options.yOrigin;
    this.xRadius = (options.xRadius === null) ? $container.width()  / 2.3 : options.xRadius;
    this.yRadius = (options.yRadius === null) ? $container.height() / 6   : options.yRadius;
    this.farScale = options.farScale;
    this.rotation = this.destRotation = Math.PI/2; // start with the first item in front
    this.speed = options.speed;
    this.smooth = options.smooth;
    this.fps = options.fps;
    this.timer = 0;
    this.autoPlayAmount = options.autoPlay;
    this.autoPlayDelay = options.autoPlayDelay;
    this.autoPlayTimer = 0;
    this.onLoaded = options.onLoaded;
    this.onRendered = options.onRendered;

    this.itemOptions = {
      transforms: options.transforms
    }

    if( options.mirror ) {
      this.itemOptions.mirror = $.extend( { gap: 2 }, options.mirror );
    }

    $container.css( { position: 'relative', overflow: 'hidden' } );

    // Rotation:
    //  *      0 : right
    //  *   Pi/2 : front
    //  *   Pi   : left
    //  * 3 Pi/2 : back
    this.rotateItem = function( itemIndex, rotation ) {
      var item = this.items[itemIndex];
      var sin = Math.sin(rotation);
      var farScale = this.farScale;
      var scale = farScale + ((1-farScale) * (sin+1) * 0.5);

      item.moveTo(
        this.xOrigin + (scale * ((Math.cos(rotation) * this.xRadius) - (item.fullWidth * 0.5))),
        this.yOrigin + (scale * sin * this.yRadius),
        scale
      );
    }

    this.render = function() {
      var count = this.items.length;
      var spacing = 2 * Math.PI / count;
      var radians = this.rotation;

      for( var i = 0; i < count; i++ ) {
        this.rotateItem( i, radians );
        radians += spacing;
      }

      if( typeof this.onRendered === 'function' )
        this.onRendered( this );
    }

    this.playFrame = function() {
      var rem = self.destRotation - self.rotation;
      var now = time();
      var dt = (now - self.lastTime) * 0.002;
      self.lastTime = now;

      if( Math.abs(rem) < 0.003 ) {
        self.rotation = self.destRotation;
        self.pause();
      } else {
        // Rotate asymptotically closer to the destination
        self.rotation = self.destRotation - rem / (1 + (self.speed * dt));
        self.scheduleNextFrame();
      }

      self.render();
    }

    this.scheduleNextFrame = function() {
      this.lastTime = time();

      this.timer = this.smooth && cancelFrame ?
        requestFrame( self.playFrame ) :
        setTimeout( self.playFrame, 1000 / this.fps );
    }

    this.itemsRotated = function() {
      return this.items.length * ((Math.PI/2) - this.rotation) / (2*Math.PI);
    }

    this.floatIndex = function() {
      var count = this.items.length;
      var floatIndex = this.itemsRotated() % count;

      // Make sure float-index is positive
      return (floatIndex < 0) ? floatIndex + count : floatIndex;
    }

    this.nearestIndex = function() {
      return Math.round( this.floatIndex() ) % this.items.length;
    }

    this.nearestItem = function() {
      return this.items[this.nearestIndex()];
    }

    this.play = function() {
      if( this.timer === 0 )
        this.scheduleNextFrame();
    }

    this.pause = function() {
      this.smooth && cancelFrame ? cancelFrame( this.timer ) : clearTimeout( this.timer );
      this.timer = 0;
    }

    //
    // Spin the carousel.  Count is the number (+-) of carousel items to rotate
    //
    this.go = function( count ) {
      this.destRotation += (2 * Math.PI / this.items.length) * count;
      this.play();
    }

    this.deactivate = function() {
      this.pause();
      clearInterval( this.autoPlayTimer );
      options.buttonLeft.unbind( 'click' );
      options.buttonRight.unbind( 'click' );
      $container.unbind( '.cloud9' );
    }

    this.autoPlay = function() {
      this.autoPlayTimer = setInterval(
        function() { self.go( self.autoPlayAmount ) },
        this.autoPlayDelay
      );
    }

    this.enableAutoPlay = function() {
      // Stop auto-play on mouse over
      $container.bind( 'mouseover.cloud9', function() {
        clearInterval( self.autoPlayTimer );
      } );

      // Resume auto-play when mouse leaves the container
      $container.bind( 'mouseout.cloud9', function() {
        self.autoPlay();
      } );

      this.autoPlay();
    }

    this.bindControls = function() {
      options.buttonLeft.bind( 'click', function() {
        self.go( -1 );
        return false;
      } );

      options.buttonRight.bind( 'click', function() {
        self.go( 1 );
        return false;
      } );

      if( options.mouseWheel ) {
        $container.bind( 'mousewheel.cloud9', function( event, delta ) {
          self.go( (delta > 0) ? 1 : -1 );
          return false;
        } );
      }

      if( options.bringToFront ) {
        $container.bind( 'click.cloud9', function( event ) {
          var hits = $(event.target).closest( '.' + options.itemClass );

          if( hits.length !== 0 ) {
            var idx = self.items.indexOf( hits[0].item );
            var count = self.items.length;
            var diff = idx - (self.floatIndex() % count);

            // Choose direction based on which way is shortest
            if( 2 * Math.abs(diff) > count )
              diff += (diff > 0) ? -count : count;

            self.destRotation = self.rotation;
            self.go( -diff );
          }
        } );
      }
    }

    var images = $container.find( '.' + options.itemClass );

    this.finishInit = function() {
      //
      // Wait until all images have completely loaded
      //
      for( var i = 0; i < images.length; i++ ) {
        var im = images[i];
        if( (im.width === undefined) || ((im.complete !== undefined) && !im.complete) )
          return;
      }

      clearInterval( this.initTimer );

      // Init items
      for( i = 0; i < images.length; i++ )
        this.items.push( new Item( images[i], this.itemOptions ) );

      // Disable click-dragging of items
      $container.bind( 'mousedown onselectstart', function() { return false } );

      if( this.autoPlayAmount !== 0 ) this.enableAutoPlay();
      this.bindControls();
      this.render();

      if( typeof this.onLoaded === 'function' )
        this.onLoaded( this );
    };

    this.initTimer = setInterval( function() { self.finishInit() }, 50 );
  }

  //
  // The jQuery plugin
  //
  $.fn.Cloud9Carousel = function( options ) {
    return this.each( function() {
      options = $.extend( {
        xOrigin: null,        // null: automatically calculated
        yOrigin: null,
        xRadius: null,
        yRadius: null,
        farScale: 0.5,        // scale of the farthest item
        mirror: false,
        transforms: true,    // enable CSS transforms
        smooth: true,         // enable smooth animation via requestAnimationFrame()
        fps: 30,              // fixed frames per second (if smooth animation is off)
        speed: 4,             // positive number
        autoPlay: 0,          // [ 0: off | number of items (integer recommended, positive is clockwise) ]
        autoPlayDelay: 4000,
        mouseWheel: false,
        bringToFront: false,
        itemClass: 'cloud9-item',
        handle: 'carousel'
      }, options );

      $(this).data( options.handle, new Carousel( this, options ) );
    } );
  }
})( window.jQuery || window.Zepto );