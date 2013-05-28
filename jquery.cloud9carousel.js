/*
 * Cloud 9 Carousel
 *   Cleaned up, refactored, and improved version of CloudCarousel 
 *
 * Copyright (c) 2013 by Ildar Sagdejev ( twitter: @tknomad )
 * Copyright (c) 2011 by R. Cecco ( http://www.professorcloud.com )
 * MIT License
 *
 * Forked from CloudCarousel V1.0.5 by R. Cecco <http://www.professorcloud.com>
 * Reflection code based on plugin by Christophe Beyls <http://www.digitalia.be>
 *
 * Please retain this copyright header in all versions of the software
 */

(function($) {
	// Creates a reflection underneath an image.
	// IE uses an image with IE specific filter properties, other browsers use the Canvas tag.
	function Reflection(img, reflHeight, opacity) {
		var	reflection, cntx, imageWidth = img.width, imageHeight = img.width, gradient, parent;

		parent = $(img.parentNode);
		this.element = reflection = parent.append("<canvas class='reflection' style='position:absolute' />").find(':last')[0];
        if ( !reflection.getContext && $.browser.msie) {
			this.element = reflection = parent.append("<img class='reflection' style='position:absolute' />").find(':last')[0];
			reflection.src = img.src;
			reflection.style.filter = "flipv progid:DXImageTransform.Microsoft.Alpha(opacity=" + (opacity * 100)
									+ ", style=1, finishOpacity=0, startx=0, starty=0, finishx=0, finishy="
									+ (reflHeight / imageHeight * 100) + ")";
        } else {
			cntx = reflection.getContext("2d");
			try {
				$(reflection).attr({width: imageWidth, height: reflHeight});
				cntx.save();
				cntx.translate(0, imageHeight-1);
				cntx.scale(1, -1);
				cntx.drawImage(img, 0, 0, imageWidth, imageHeight);
				cntx.restore();

				cntx.globalCompositeOperation = "destination-out";
				gradient = cntx.createLinearGradient(0, 0, 0, reflHeight);
				gradient.addColorStop(0, "rgba(255, 255, 255, " + (1 - opacity) + ")");
				gradient.addColorStop(1, "rgba(255, 255, 255, 1.0)");
				cntx.fillStyle = gradient;
				cntx.fillRect(0, 0, imageWidth, reflHeight);
			} catch(e) {
				return;
			}
		}

		// Store a copy of the alt and title attrs into the reflection
		$(reflection).attr({ 'alt': $(img).attr('alt'), title: $(img).attr('title')} );
	}

	// A wrapper object for items within the carousel.
	var	Item = function(imgIn, options) {
		this.image = imgIn;
		this.orgWidth = imgIn.width;
		this.orgHeight = imgIn.height;
		this.alt = imgIn.alt;
		this.title = imgIn.title;
 		this.reflection = null;
		this.options = options;

		// Encapsulate the image in a div.
		this.div = $(this.image).wrap('<div class="carousel-item" />').parent();
		$(this.div).css('position','absolute');
		this.image.style.width = "100%";

		if (this.options.reflHeight > 0) {
			this.reflection = new Reflection(this.image, this.options.reflHeight, this.options.reflOpacity);
		}
		$(this.image).css('position','absolute');  // Bizarre. This seems to reset image width to 0 on webkit!

		this.moveTo = function(x, y, scale) {
			var w = this.width = this.orgWidth * scale;
			var h = this.height = this.orgHeight * scale;
			this.x = x;
			this.y = y;
			this.scale = scale;

			var	container = this.image.parentNode;
			container.style.width = w + "px";
			container.style.height = h + "px";
			container.style.left = x + "px" ;
			container.style.top = y + "px";
			container.style.zIndex = "" + (scale * 100)>>0; // >>0 = Math.foor(). Firefox doesn't like fractional decimals in z-index.

			// The reflection is outside the image container so it doesn't resize automatically.
			if (this.reflection !== null) {
				var reflHeight = options.reflHeight * scale;
				var style = this.reflection.element.style;
				style.top = h + options.reflGap * scale + "px";
				if ($.browser.msie) {
					style.filter.finishy = (reflHeight / h * 100);
				} else {
					style.height = reflHeight + "px";
				}
			}
		}
	};

	var Carousel = function(container, images, options) {
		var	items = [];
		var ctx = this;
		this.items = items;
		this.controlTimer = 0;
		this.stopped = false;
		this.container = container;
		this.xRadius = options.xRadius;
		this.yRadius = options.yRadius;
		this.showFrontTextTimer = 0;
		this.autoRotateTimer = 0;
		if (options.xRadius === 0) {
			this.xRadius = ($(container).width()/2.3);
		}
		if (options.yRadius === 0) {
			this.yRadius = ($(container).height()/6);
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

		// Turn on relative position for container to allow absolutely positioned elements
		// within it to work.
		$(container).css( {position:'relative', overflow:'hidden'} );

		$(options.buttonLeft).css('display','inline');
		$(options.buttonRight).css('display','inline');

		// Setup the buttons.
		$(options.buttonLeft).bind('mouseup',this,function(event) {
			event.data.rotate(-1);
			return false;
		});
		$(options.buttonRight).bind('mouseup',this,function(event) {
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

			var	text = $(event.target).attr('alt');

			// If we have moved over a carousel item, then show the alt and title text.
			if ( text !== undefined && text !== null ) {
				clearTimeout(event.data.showFrontTextTimer);
				
				$(options.altBox).html( ($(event.target).attr('alt') ));
				$(options.titleBox).html( ($(event.target).attr('title') ));

				if ( options.bringToFront && event.type == 'click' ) {
					var	idx = $(event.target).data('itemIndex');
					var	frontIndex = event.data.frontIndex;
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
			var	context = event.data;
			clearTimeout(context.showFrontTextTimer);
			context.showFrontTextTimer = setTimeout( function(){context.showFrontText();}, 1000 );
			context.autoRotate();	// Start auto rotation.
		});

		// Prevent items from being selected as mouse is moved and clicked in the container.
		$(container).bind('mousedown',this,function(event) {
			event.data.container.focus();
			return false;
		});
		container.onselectstart = function () { return false; }; // For IE.

		this.innerWrapper = $(container).wrapInner('<div style="position:absolute;width:100%;height:100%;"/>').children()[0];

		// Shows the text from the front most item.
		this.showFrontText = function() {
			if ( items[this.frontIndex] !== undefined ) {
				$(options.titleBox).html($(items[this.frontIndex].image).attr('title'));
				$(options.altBox).html($(items[this.frontIndex].image).attr('alt'));
			}
		};

		this.go = function() {
			if(this.controlTimer !== 0) { return; }
			var	context = this;
			this.controlTimer = setTimeout( function(){context.update();},this.timeDelay );
		};

		this.stop = function() {
			clearTimeout(this.controlTimer);
			this.controlTimer = 0;
		};

		// Starts the rotation of the carousel. Direction is the number (+-) of carousel items to rotate by.
		this.rotate = function(direction) {
			this.frontIndex -= direction;
			this.frontIndex %= items.length;
			this.destRotation += ( Math.PI / items.length ) * ( 2*direction );
			this.showFrontText();
			this.go();
		};

		this.autoRotate = function() {
			if ( options.autoRotate !== 'no' ) {
				var	dir = (options.autoRotate === 'right') ? 1 : -1;
				this.autoRotateTimer = setInterval( function(){ctx.rotate(dir); }, options.autoRotateDelay );
			}
		};

		this.rotateItem = function(itemIndex, rotation) {
			var item = items[itemIndex];

			var	minScale = options.minScale;	// This is the smallest scale applied to the furthest item.
			var smallRange = (1-minScale) * 0.5;
			var sinVal = Math.sin(rotation);
			var scale = ((sinVal+1) * smallRange) + minScale;

			var x = this.xCentre + (( (Math.cos(rotation) * this.xRadius) - (item.orgWidth*0.5)) * scale);
			var y = this.yCentre + (( (sinVal * this.yRadius) ) * scale);

			item.moveTo(x, y, scale);
		}

		// Main loop function that rotates the carousel.
		this.update = function() {
			var	change = (this.destRotation - this.rotation);
			var	absChange = Math.abs(change);

			this.rotation += change * options.speed;
			if ( absChange < 0.001 ) { this.rotation = this.destRotation; }
			var	numItems = items.length;
			var	spacing = (Math.PI / numItems) * 2;
			var	radians = this.rotation;

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
				this.controlTimer = setTimeout( function(){context.update();},this.timeDelay);
			} else {
				// Otherwise just stop completely.
				this.stop();
			}
		};

		// Check if images have loaded. We need valid widths and heights for the reflections.
		this.checkImagesLoaded = function() {
			var	i;
			for(i=0; i<images.length; i++) {
				if ( (images[i].width === undefined) || ((images[i].complete !== undefined) && (!images[i].complete)) ) {
					return;
				}
			}
			for(i=0; i<images.length; i++) {
				 items.push(new Item( images[i], options ));
				 $(images[i]).data('itemIndex',i);
			}

			// If all images have valid widths and heights, we can stop checking.
			clearInterval(this.tt);
			this.showFrontText();
			this.autoRotate();
			this.update();
		};

		this.tt = setInterval( function(){ctx.checkImagesLoaded();}, 50 );
	};

	// The jQuery plugin.
	// Creates a Carousel object for each item in the selector.
	$.fn.CloudCarousel = function(options) {
		this.each( function() {
			options = $.extend( {}, {
				reflHeight: 0,
				reflOpacity: 0.5,
				reflGap: 0,
				minScale: 0.5,
				xPos: 0,
				yPos: 0,
				xRadius: 0,
				yRadius: 0,
				altBox: null,
				titleBox: null,
				FPS: 30,
				autoRotate: 'no',
				autoRotateDelay: 1500,
				speed: 0.2,
				mouseWheel: false,
				bringToFront: false
			}, options );

			$(this).data('cloudcarousel', new Carousel(this, $('.cloudcarousel',$(this)), options));
		} );
		return this;
	};
})(jQuery);