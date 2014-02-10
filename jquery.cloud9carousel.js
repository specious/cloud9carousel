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
  var Item = function( image, mirrorOptions ) {
    image.item = this;
    this.image = image;
    this.fullWidth = image.width;
    this.fullHeight = image.height;
    this.alt = image.alt;
    this.title = image.title;

    $(image).css( 'position', 'absolute' );

    //
    // Generate reflection and wrap image and its reflection together in a div
    //
    if( mirrorOptions ) {
      this.reflection = $( $(this.image).reflect(mirrorOptions) ).next()[0];
      this.reflection.fullHeight = $(this.reflection).height();
      $(this.reflection).css('margin-top', mirrorOptions.gap + 'px');
      $(this.reflection).css('width', '100%');
      $(this.image).css('width', '100%');

      // Pass the item handle to the wrapper container
      this.image.parentNode.item = this.image.item;
    }

    this.moveTo = function( x, y, scale ) {
      this.width = this.fullWidth * scale;
      this.height = this.fullHeight * scale;
      this.x = x;
      this.y = y;
      this.scale = scale;

      var style = (mirrorOptions ? this.image.parentNode : this.image).style;
      style.width = this.width + "px";
      style.left = x + "px";
      style.top = y + "px";
      style.zIndex = "" + (scale * 100)|0;

      if( mirrorOptions ) {
        var hGap = mirrorOptions.gap * scale;

        style.height = this.height + (this.reflection.fullHeight * scale) + "px";
        this.reflection.style.marginTop = hGap + "px";
      } else
        style.height = this.height + "px";
    }
  }

  var Carousel = function( container, options ) {
    var self = this;
    this.items = [];
    this.options = options;
    this.xCentre = options.xPos;
    this.yCentre = options.yPos;
    this.xRadius = (options.xRadius === 0) ? container.width()/2.3 : options.xRadius;
    this.yRadius = (options.yRadius === 0) ? container.height()/6  : options.yRadius;
    this.rotation = this.destRotation = Math.PI/2; // put the first item in front
    this.frameDelay = 1000/options.FPS;
    this.frameTimer = 0;
    this.autoPlayTimer = 0;
    this.onLoaded = options.onLoaded;
    this.onRendered = options.onRendered;

    if( options.mirrorOptions ) {
      options.mirrorOptions = $.extend( {
        gap: 2
      }, options.mirrorOptions );
    }

    container.css( {position: 'relative', overflow: 'hidden'} );

    this.rotateItem = function( itemIndex, rotation ) {
      var item = this.items[itemIndex];
      var minScale = options.minScale; // scale of the farthest item
      var smallRange = (1-minScale) * 0.5;
      var sinVal = Math.sin(rotation);
      var scale = ((sinVal+1) * smallRange) + minScale;

      var x = this.xCentre + (( (Math.cos(rotation) * this.xRadius) - (item.fullWidth*0.5)) * scale);
      var y = this.yCentre + (( (sinVal * this.yRadius) ) * scale);

      item.moveTo( x, y, scale );
    }

    this.render = function() {
      var count = this.items.length;
      var spacing = (Math.PI / count) * 2;
      var radians = this.rotation;

      for( var i = 0; i < count; i++ ) {
        this.rotateItem( i, radians );
        radians += spacing;
      }

      if( typeof this.onRendered === 'function' )
        this.onRendered( this );
    }

    this.playFrame = function() {
      var change = this.destRotation - this.rotation;

      if( Math.abs(change) < 0.001 ) {
        this.rotation = this.destRotation;
        this.pause();
      } else {
        this.rotation += change * options.speed;
        this.scheduleNextFrame();
      }

      this.render();
    }

    this.scheduleNextFrame = function() {
      this.frameTimer = setTimeout( function() { self.playFrame() }, this.frameDelay );
    }

    this.itemsRotated = function() {
      return this.items.length * ((Math.PI/2) - this.rotation) / (2*Math.PI);
    }

    this.floatIndex = function() {
      var floatIndex = this.itemsRotated() % this.items.length;
      return ( floatIndex < 0 ) ? floatIndex + this.items.length : floatIndex;
    }

    this.nearestIndex = function() {
      return Math.round( this.floatIndex() ) % this.items.length;
    }

    this.nearestItem = function() {
      return this.items[this.nearestIndex()];
    }

    this.play = function() {
      if( this.frameTimer === 0 )
        this.scheduleNextFrame();
    }

    this.pause = function() {
      clearTimeout( this.frameTimer );
      this.frameTimer = 0;
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
      container.unbind( '.cloud9' );
    }

    this.autoPlay = function() {
      this.autoPlayTimer = setInterval(
        function() { self.go( self.options.autoPlay ) },
        this.options.autoPlayDelay
      );
    }

    this.enableAutoPlay = function() {
      // Stop auto-play on mouse over
      container.bind( 'mouseover.cloud9', function() {
        clearInterval( self.autoPlayTimer );
      } );

      // Resume auto-play when mouse leaves the container
      container.bind( 'mouseout.cloud9', function() {
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

      //
      // Optional mousewheel support (requires plugin: http://plugins.jquery.com/mousewheel)
      //
      if( options.mouseWheel ) {
        container.bind( 'mousewheel.cloud9', function( event, delta ) {
          self.go( delta );
          return false;
        } );
      }

      if( options.bringToFront ) {
        container.bind( 'click.cloud9', function( event ) {
          var hits = $(event.target).closest( '.' + options.itemClass );

          if( hits.length !== 0 ) {
            var idx = self.items.indexOf( hits[0].item );
            var count = self.items.length;
            var diff = idx - (self.floatIndex() % count);

            // Choose direction based on which way is shortest
            if( Math.abs(diff) > count / 2 )
              diff += (diff > 0) ? -count : count;

            self.destRotation = self.rotation;
            self.go( -diff );
          }
        });
      }
    }

    var images = container.find( '.' + options.itemClass );

    this.finishInit = function() {
      //
      // Wait until all images have completely loaded
      //
      for( var i = 0; i < images.length; i++ ) {
        var im = images[i];
        if( (im.width === undefined) || ((im.complete !== undefined) && !im.complete) ) {
          return;
        }
      }

      clearInterval( this.initTimer );

      // Init items
      for( i = 0; i < images.length; i++ )
        this.items.push( new Item( images[i], options.mirrorOptions ) );

      // Disable click-dragging of items
      container.bind( 'mousedown onselectstart', function() { return false } );

      if( this.options.autoPlay !== 0 ) this.enableAutoPlay();
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
        xPos: 0,
        yPos: 0,
        xRadius: 0,
        yRadius: 0,
        minScale: 0.5,
        mirrorOptions: false,
        FPS: 30,
        speed: 0.2,
        autoPlay: 0, // [ 0: off | number of items (integer recommended, positive is clockwise) ]
        autoPlayDelay: 4000,
        mouseWheel: false,
        bringToFront: false,
        itemClass: 'cloud9-item',
        handle: 'carousel'
      }, options );

      var self = $(this);

      self.data( options.handle, new Carousel( self, options ) );
    } );
  }
})( window.jQuery || window.Zepto );