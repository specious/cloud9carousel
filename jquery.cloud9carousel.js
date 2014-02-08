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
 *  - jQuery 1.3.0 or later
 *
 * Optional:
 *  - Reflection support via reflection.js plugin by Christophe Beyls
 *     http://www.digitalia.be/software/reflectionjs-for-jquery
 *  - Mousewheel support via mousewheel plugin
 *     http://plugins.jquery.com/mousewheel/
 */

(function($) {
  var Item = function( image, options ) {
    this.image = image;
    this.image.item = this;
    this.fullWidth = image.width;
    this.fullHeight = image.height;
    this.alt = image.alt;
    this.title = image.title;
    this.reflection = null;
    this.options = options;

    $(this.image).css( 'position', 'absolute' );

    //
    // Generate item reflection and wrap image and reflection in a new div
    //
    if( this.options.mirrorOptions ) {
      this.reflection = $( $(this.image).reflect(options.mirrorOptions) ).next()[0];
      this.reflection.fullHeight = $(this.reflection).height();
      $(this.reflection).css('margin-top', options.mirrorOptions.gap + 'px');
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

      var container = (this.reflection === null) ? this.image : this.image.parentNode;
      container.style.width = this.width + "px";
      container.style.height = this.height + "px";
      container.style.left = x + "px";
      container.style.top = y + "px";
      container.style.zIndex = "" + (scale * 100)|0;

      if( this.options.mirrorOptions ) {
        var hMirror = this.reflection.fullHeight * scale;
        var hGap = options.mirrorOptions.gap * scale;

        container.style.height = this.height + hGap + hMirror + "px";
        this.reflection.style.marginTop = hGap + "px";
      }
    }
  };

  var Carousel = function( container, images, options ) {
    var self = this;
    this.items = [];
    this.container = container;
    this.xCentre = options.xPos;
    this.yCentre = options.yPos;
    this.xRadius = (options.xRadius === 0) ? $(container).width()/2.3 : options.xRadius;
    this.yRadius = (options.yRadius === 0) ? $(container).height()/6  : options.yRadius;
    this.rotation = this.destRotation = Math.PI/2; // put the first item in front
    this.frameDelay = 1000/options.FPS;
    this.renderTimer = 0;
    this.autoRotateTimer = 0;
    this.onLoaded = options.onLoaded;
    this.onRendered = options.onRendered;

    if( options.mirrorOptions ) {
      options.mirrorOptions = $.extend( {
        gap: 2
      }, options.mirrorOptions );
    }

    this.innerWrapper = $(container).wrapInner('<div style="position:absolute;width:100%;height:100%;"/>').children()[0];

    $(container).css( {position:'relative', overflow:'hidden'} );

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

    this.rotate = function() {
      var count = this.items.length;
      var spacing = (Math.PI / count) * 2;
      var radians = this.rotation;

      for( var i = 0; i < count; i++ ) {
        this.rotateItem( i, radians );
        radians += spacing;
      }
    }

    this.scheduleNextFrame = function() {
      this.renderTimer = setTimeout( function() { self.render() }, this.frameDelay );
    }

    this.stop = function() {
      clearTimeout(this.renderTimer);
      this.renderTimer = 0;
    };

    this.render = function() {
      var change = this.destRotation - this.rotation;

      if( Math.abs(change) < 0.001 ) {
        this.rotation = this.destRotation;
        this.stop();
      } else {
        this.rotation += change * options.speed;
        this.scheduleNextFrame();
      }

      this.rotate();

      if( typeof this.onRendered === 'function' )
        this.onRendered( this );
    };

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

    //
    // Spin the carousel.  Count is the number (+-) of carousel items to rotate
    //
    this.go = function( count ) {
      this.destRotation += (2 * Math.PI / this.items.length) * count;

      if( this.renderTimer === 0 )
        this.scheduleNextFrame();
    };

    //
    // Deactivate the carousel
    //
    this.halt = function() {
      this.stop();
      clearInterval( this.autoRotateTimer );
      $(options.buttonLeft).unbind( 'click' );
      $(options.buttonRight).unbind( 'click' );
      $(container).unbind( '.cloud9' );
    }

    this.autoRotate = function() {
      if( options.autoRotate !== false ) {
        var dir = (options.autoRotate === 'right') ? 1 : -1;
        this.autoRotateTimer = setInterval(
          function() { self.go( dir ) },
          options.autoRotateDelay
        );
      }
    };

    this.bindControls = function() {
      $(options.buttonLeft).bind( 'click', function() {
        self.go( -1 );
        return false;
      } );

      $(options.buttonRight).bind( 'click', function() {
        self.go( 1 );
        return false;
      } );

      //
      // Optional mousewheel support (requires plugin: http://plugins.jquery.com/mousewheel)
      //
      if( options.mouseWheel ) {
        $(container).bind( 'mousewheel.cloud9', function( event, delta ) {
          self.go( delta );
          return false;
        } );
      }

      if( options.bringToFront ) {
        $(container).bind( 'click.cloud9', function( event ) {
          var hits = $(event.target).closest( '.' + options.itemClass );

          if( hits.length !== 0 ) {
            var idx = self.items.indexOf( hits[0].item );
            var count = self.items.length;

            var diff = (idx - self.floatIndex()) % count;

            // Choose direction based on which way is shortest
            if( Math.abs(diff) > count / 2 )
              diff += (diff > 0) ? -count : count;

            self.go( -diff );
          }
        });
      }

      // Stop auto rotation on mouse over
      $(container).bind( 'mouseover.cloud9', function() {
        clearInterval( self.autoRotateTimer );
      } );

      // Resume auto rotation on mouse out
      $(container).bind( 'mouseout.cloud9', function() {
        self.autoRotate();
      } );

      // Prevent items from being selected by click-dragging inside the container
      $(container).bind( 'mousedown', function() { return false } );

      // Same in IE
      container.onselectstart = function() { return false };
    }

    this.finishInit = function() {
      //
      // Wait until all images have completely loaded
      //
      for( var i = 0; i < images.length; i++ ) {
        var im = images[i];
        if( (im.width === undefined) || ((im.complete !== undefined) && (!im.complete)) ) {
          return;
        }
      }

      for( i = 0; i < images.length; i++ )
        this.items.push( new Item( images[i], options ) );

      // If all images have valid widths and heights, we can stop checking
      clearInterval(this.tt);
      this.bindControls();
      this.autoRotate();
      this.render();

      if( typeof this.onLoaded === 'function' )
        this.onLoaded( this );
    };

    this.tt = setInterval( function() { self.finishInit() }, 50 );
  };

  //
  // The jQuery plugin
  //
  $.fn.Cloud9Carousel = function( options ) {
    return this.each( function() {
      options = $.extend( {}, {
        xPos: 0,
        yPos: 0,
        xRadius: 0,
        yRadius: 0,
        minScale: 0.5,
        mirrorOptions: false,
        itemClass: 'cloud9-item',
        FPS: 30,
        speed: 0.2,
        autoRotate: false,
        autoRotateDelay: 1500,
        mouseWheel: false,
        bringToFront: false
      }, options );

      $(this).data( 'cloud9carousel', new Carousel(this, $('.'+options.itemClass, $(this)), options) );
    } );
  };
})(jQuery);