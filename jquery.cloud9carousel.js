/*
 * Cloud 9 Carousel
 *   Cleaned up, refactored, and improved version of CloudCarousel
 *
 * Get the latest version from GitHub:
 *   http://specious.github.io/cloud9carousel/
 *
 * Copyright (c) 2013 by Ildar Sagdejev ( Twitter: @tknomad )
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
    }

    this.moveTo = function( x, y, scale ) {
      var w = this.width = this.fullWidth * scale;
      var h = this.height = this.fullHeight * scale;
      this.x = x;
      this.y = y;
      this.scale = scale;

      var container = (this.reflection === null) ? this.image : this.image.parentNode;
      container.style.width = w + "px";
      container.style.height = h + "px";
      container.style.left = x + "px";
      container.style.top = y + "px";
      container.style.zIndex = "" + (scale * 100)>>0; // >>0 = Math.foor()

      if (this.options.mirrorOptions) {
        var hMirror = this.reflection.fullHeight * scale;
        var hGap = options.mirrorOptions.gap * scale;

        container.style.height = h + hGap + hMirror + "px";
        this.reflection.style.marginTop = hGap + "px";
      }
    }
  };

  var Carousel = function( container, images, options ) {
    var items = [];
    var ctx = this;
    this.items = items;
    this.controlTimer = 0;
    this.stopped = false;
    this.container = container;
    this.xRadius = (options.xRadius === 0) ? $(container).width()/2.3 : options.xRadius;
    this.yRadius = (options.yRadius === 0) ? $(container).height()/6  : options.yRadius;
    this.showFrontTextTimer = 0;
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
    this.frontIndex = 0; // Index of the item at the front

    // Start with the first item at the front.
    this.rotation = this.destRotation = Math.PI/2;
    this.timeDelay = 1000/options.FPS;

    // Turn on the infoBox
    if(options.altBox !== null) {
      $(options.altBox).css('display','block');
      $(options.titleBox).css('display','block');
    }

    this.innerWrapper = $(container).wrapInner('<div style="position:absolute;width:100%;height:100%;"/>').children()[0];

    // Turn on relative position for container to allow absolutely positioned elements
    // within it to work.
    $(container).css( {position:'relative', overflow:'hidden'} );

    $(options.buttonLeft).css('display','inline');
    $(options.buttonRight).css('display','inline');

    this.bindControls = function () {
      // Setup the buttons.
      $(options.buttonLeft).bind('click',this,function(event) {
        event.data.rotate(-1);
        return false;
      });
      $(options.buttonRight).bind('click',this,function(event) {
        event.data.rotate(1);
        return false;
      });

      // You will need this plugin for the mousewheel to work: http://plugins.jquery.com/project/mousewheel
      if (options.mouseWheel) {
        $(container).bind('mousewheel',this,function(event, delta) {
          event.data.rotate(delta);
          return false;
        });
      }

      $(container).bind('mouseover click',this,function(event) {
        // Stop auto rotation if mouse over.
        clearInterval(event.data.autoRotateTimer);

        var text = $(event.target).attr('alt');

        // If we have moved over a carousel item, then show the alt and title text.
        if ( text !== undefined && text !== null ) {
          clearTimeout(event.data.showFrontTextTimer);

          $(options.altBox).html( ($(event.target).attr('alt') ));
          $(options.titleBox).html( ($(event.target).attr('title') ));

          if ( options.bringToFront && event.type == 'click' ) {
            var idx = $(event.target).data('itemIndex');
            var frontIndex = event.data.frontIndex;
                      var diff = (idx - frontIndex) % images.length;
                      if (Math.abs(diff) > images.length / 2) {
                          diff += (diff > 0 ? -images.length : images.length);
                      }

            event.data.rotate(-diff);
          }
        }
      });

      // If we have moved out of a carousel item (or the container itself),
      // restore the text of the front item in 1 second.
      $(container).bind('mouseout',this,function(event) {
        var context = event.data;
        clearTimeout(context.showFrontTextTimer);
        context.showFrontTextTimer = setTimeout( function(){context.showFrontText();}, 1000 );
        context.autoRotate(); // Start auto rotation.
      });

      // Prevent items from being selected as mouse is moved and clicked in the container.
      $(container).bind('mousedown',this,function(event) {
        event.data.container.focus();
        return false;
      });
      container.onselectstart = function () { return false; }; // For IE.
    }

    // Shows the text from the front most item.
    this.showFrontText = function() {
      if ( items[this.frontIndex] !== undefined ) {
        $(options.titleBox).html($(items[this.frontIndex].image).attr('title'));
        $(options.altBox).html($(items[this.frontIndex].image).attr('alt'));
      }
    };

    this.go = function() {
      if(this.controlTimer !== 0) { return; }
      var context = this;
      this.controlTimer = setTimeout( function(){context.update();},this.timeDelay );
    };

    this.stop = function() {
      clearTimeout(this.controlTimer);
      this.controlTimer = 0;
    };

    // Starts the rotation of the carousel. Direction is the number (+-) of carousel items to rotate by.
    this.rotate = function(direction) {
      this.frontIndex = (this.frontIndex - direction + items.length) % items.length;
      this.destRotation += ( Math.PI / items.length ) * ( 2*direction );
      this.showFrontText();
      this.go();
    };

    this.autoRotate = function() {
      if ( options.autoRotate !== 'no' ) {
        var dir = (options.autoRotate === 'right') ? 1 : -1;
        this.autoRotateTimer = setInterval( function(){ctx.rotate(dir); }, options.autoRotateDelay );
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
        if ( (images[i].width === undefined) || ((images[i].complete !== undefined) && (!images[i].complete)) ) {
          return;
        }
      }

      for( i = 0; i < images.length; i++ ) {
         items.push(new Item( images[i], options ));
         $(images[i]).data('itemIndex',i);
      }

      // If all images have valid widths and heights, we can stop checking.
      clearInterval(this.tt);
      this.bindControls();
      this.showFrontText();
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
        altBox: null,
        titleBox: null,
        itemClass: 'cloud9-item',
        FPS: 30,
        autoRotate: 'no',
        autoRotateDelay: 1500,
        speed: 0.2,
        mouseWheel: false,
        bringToFront: false
      }, options );

      $(this).data( 'cloud9carousel', new Carousel(this, $('.'+options.itemClass, $(this)), options) );
    } );
  };
})(jQuery);