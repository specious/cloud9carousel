/*
 * Cloud 9 Carousel
 *   Cleaned up, refactored, and improved version of CloudCarousel
 *
 * Get the latest version on GitHub:
 *   http://specious.github.io/cloud9carousel/
 *
 * Copyright (c) 2014 by Ildar Sagdejev ( http://twitter.com/tknomad )
 * Copyright (c) 2011 by R. Cecco ( http://www.professorcloud.com )
 * MIT License
 *
 * Please retain this copyright header in all versions of the software
 *
 * Requires:
 *  - jQuery
 *
 * Optional:
 *  - reflection.js plugin by Christophe Beyls
 *     http://www.digitalia.be/software/reflectionjs-for-jquery
 *  - mousewheel plugin
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

    $(this.image).css('position', 'absolute');

    // Create item reflection, which puts the image and its reflection into
    // a new container div
    if (this.options.mirrorOptions) {
      this.reflection = $( $(this.image).reflect(options.mirrorOptions) ).next()[0];
      this.reflection.fullHeight = $(this.reflection).height();
      $(this.reflection).css('margin-top', options.mirrorOptions.gap + 'px');
      $(this.reflection).css('width', '100%');
      $(this.image).css('width', '100%');

      // Transfer the item handle to the new wrapper container
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
      container.style.zIndex = "" + (scale * 100)>>0; // >>0 = Math.foor()

      if (this.options.mirrorOptions) {
        var hMirror = this.reflection.fullHeight * scale;
        var hGap = options.mirrorOptions.gap * scale;

        container.style.height = this.height + hGap + hMirror + "px";
        this.reflection.style.marginTop = hGap + "px";
      }
    }
  };

  var Carousel = function( container, images, options ) {
    var items = [];
    var ctx = this;
    this.items = items;
    this.controlTimer = 0;
    this.container = container;
    this.xRadius = (options.xRadius === 0) ? $(container).width()/2.3 : options.xRadius;
    this.yRadius = (options.yRadius === 0) ? $(container).height()/6  : options.yRadius;
    this.autoRotateTimer = 0;
    this.onLoaded = options.onLoaded;
    this.onUpdated = options.onUpdated;

    if( options.mirrorOptions ) {
      options.mirrorOptions = $.extend( {
        gap: 2
      }, options.mirrorOptions );
    }

    this.xCentre = options.xPos;
    this.yCentre = options.yPos;

    // Start with the first item at the front.
    this.rotation = this.destRotation = Math.PI/2;
    this.timeDelay = 1000/options.FPS;

    this.innerWrapper = $(container).wrapInner('<div style="position:absolute;width:100%;height:100%;"/>').children()[0];

    // Turn on relative position for container to allow absolutely positioned elements
    // within it to work.
    $(container).css( {position:'relative', overflow:'hidden'} );

    $(options.buttonLeft).css('display','inline');
    $(options.buttonRight).css('display','inline');

    this.bindControls = function () {
      $(options.buttonLeft).bind( 'click', this, function(event) {
        event.data.rotate(-1);
        return false;
      } );

      $(options.buttonRight).bind( 'click', this, function(event) {
        event.data.rotate(1);
        return false;
      } );

      // You will need this plugin for the mousewheel to work: http://plugins.jquery.com/project/mousewheel
      if (options.mouseWheel) {
        $(container).bind('mousewheel',this,function(event, delta) {
          event.data.rotate(delta);
          return false;
        });
      }

      if( options.bringToFront ) {
        $(container).bind( 'click.cloud9', this, function( event ) {
          var item = $(event.target).closest( '.' + options.itemClass )[0].item;
          var idx = event.data.items.indexOf( item );

          var diff = (idx - event.data.floatIndex()) % images.length;
          if (Math.abs(diff) > images.length / 2)
            diff += (diff > 0 ? -images.length : images.length);

          event.data.rotate(-diff);
        });
      }

      // Stop auto rotation on mouse over
      $(container).bind( 'mouseover.cloud9', this, function(event) {
        clearInterval(event.data.autoRotateTimer);
      } );

      // Resume auto rotation on mouse out
      $(container).bind( 'mouseout.cloud9', this, function(event) {
        var context = event.data;
        context.autoRotate();
      } );

      // Prevent items from being selected by click-dragging inside the container
      $(container).bind( 'mousedown', this, function(event) {
        return false;
      } );

      // Same in IE
      container.onselectstart = function () {
        return false;
      };
    }

    this.go = function() {
      if(this.controlTimer !== 0) { return; }
      var context = this;
      this.controlTimer = setTimeout( function(){context.update();},this.timeDelay );
    };

    this.stop = function() {
      clearTimeout(this.controlTimer);
      this.controlTimer = 0;
    };

    // Deactivate the carousel
    this.halt = function() {
      this.stop();

      $(options.buttonLeft).unbind( 'click' );
      $(options.buttonRight).unbind( 'click' );
      $(container).unbind( '.cloud9' );
    }

    // Starts the rotation of the carousel. Direction is the number (+-) of carousel items to rotate by.
    this.rotate = function(direction) {
      this.destRotation += ( Math.PI / items.length ) * ( 2*direction );
      this.go();
    };

    this.autoRotate = function() {
      if( options.autoRotate !== false ) {
        var dir = (options.autoRotate === 'right') ? 1 : -1;
        this.autoRotateTimer = setInterval(
          function() { ctx.rotate(dir) },
          options.autoRotateDelay
        );
      }
    };

    this.rotateItem = function(itemIndex, rotation) {
      var item = items[itemIndex];
      var minScale = options.minScale;  // This is the smallest scale applied to the furthest item.
      var smallRange = (1-minScale) * 0.5;
      var sinVal = Math.sin(rotation);
      var scale = ((sinVal+1) * smallRange) + minScale;

      var x = this.xCentre + (( (Math.cos(rotation) * this.xRadius) - (item.fullWidth*0.5)) * scale);
      var y = this.yCentre + (( (sinVal * this.yRadius) ) * scale);

      item.moveTo(x, y, scale);
    }

    this.itemsRotated = function() {
      return this.items.length * ((Math.PI/2) - this.rotation ) / (2*Math.PI);
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

    // Main loop function that rotates the carousel.
    this.update = function() {
      var change = (this.destRotation - this.rotation);
      var absChange = Math.abs(change);

      this.rotation += change * options.speed;
      if ( absChange < 0.001 ) { this.rotation = this.destRotation; }
      var numItems = items.length;
      var spacing = (Math.PI / numItems) * 2;
      var radians = this.rotation;

      // Turn off display. This can reduce repaints/reflows when making style and position changes in the loop.
      // See http://dev.opera.com/articles/view/efficient-javascript/?page=3
      this.innerWrapper.style.display = 'none';

      for (var i = 0; i<numItems; i++) {
        this.rotateItem(i, radians);
        radians += spacing;
      }

      // Turn display back on.
      this.innerWrapper.style.display = 'block';

      var context = this;

      // If we have a preceptible change in rotation then loop again next frame.
      if ( absChange >= 0.001 ) {
        this.controlTimer = setTimeout(function() {context.update();}, this.timeDelay);
      } else {
        // Otherwise just stop completely.
        this.stop();
      }

      if( typeof this.onUpdated === 'function' )
        this.onUpdated( this );
    };

    // Check if images have loaded. We need valid widths and heights for the reflections.
    this.checkImagesLoaded = function() {
      for( var i = 0; i < images.length; i++ ) {
        var im = images[i];
        if ( (im.width === undefined) || ((im.complete !== undefined) && (!im.complete)) ) {
          return;
        }
      }

      for( i = 0; i < images.length; i++ )
        items.push(new Item( images[i], options ));

      // If all images have valid widths and heights, we can stop checking.
      clearInterval(this.tt);
      this.bindControls();
      this.autoRotate();
      this.update();

      if( typeof this.onLoaded === 'function' )
        this.onLoaded( this );
    };

    this.tt = setInterval( function(){ctx.checkImagesLoaded();}, 50 );
  };

  // The jQuery plugin.
  // Creates a carousel object for each item in the selector.
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