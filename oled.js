
var fs = require('fs');
var PNG = require('pngjs').PNG;
var i2c = require('i2c-bus');
var Oled = require('oled-rpi-i2c-bus');
var font = require('oled-font-pack');

var timers = [];
myInterval = null;
var exec = require('child_process').exec;

exec('sudo systemctl status RGB_Cooling_HAT_C_1 | grep " Active: active (running)" | wc -l',
    function (error, stdout, stderr) {
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (stdout != 0) {
             console.error('RGB_Cooling_HAT_C_1 service running. node-red-contrib-oled may be working wrong. please stop it.');
        }
    });
exec('sudo systemctl status RGB_Cooling_HAT_C | grep " Active: active (running)" | wc -l',
    function (error, stdout, stderr) {
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (stdout != 0) {
             console.error('RGB_Cooling_HAT_C service running. node-red-contrib-oled may be working wrong. please stop it.'); 
        }
    });

exec('sudo systemctl status RGB_Cooling_HAT | grep " Active: active (running)" | wc -l',
    function (error, stdout, stderr) {
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (stdout != 0) {
             console.error('RGB_Cooling_HAT service running. node-red-contrib-oled may be working wrong. please stop it.');
        }
    });

exec('sudo ps -ef | grep temp_control  | wc -l',
    function (error, stdout, stderr) {
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (stdout != 1) {
             console.error('RGB_Cooling_HAT running. node-red-contrib-oled may be working wrong. please stop it.');
        }
    });

module.exports = function(RED) {
	var displays = {}
	
	'---------------------------------- Function ----------------------------------'
	function OledFunction(fn) {
		return function(n) {
			var self = this
			RED.nodes.createNode(self, n)
			self.display = displays[n.display]
			self.on('input', function(msg) {
				try{
					self.display[fn](msg.payload)
					self.display.update()
				}
				catch(e){
					self.error(e);
				}
			})
		}
	}

	'---------------------------------- Check ----------------------------------'
	function check(display, node) {
		if (node.clear) {
			display.clearDisplay();
			display.setCursor(1, 1)
			display.update()
		}
	}

	'---------------------------------- Config ----------------------------------'
	function OledConfig(config) {
		var self = this
		RED.nodes.createNode(self, config)
		self.config = {
			width: parseInt(config.width),
			height: parseInt(config.height),
			address: config.address.includes('0x') ? parseInt('0x' + config.address) : parseInt(config.address),
			driver:config.driver,
			i2cBus:parseInt(config.i2cBus)
		}
		try{
			displays[self.id] = new Oled(i2c.openSync(self.config.i2cBus), self.config)
			check(displays[self.id], { clear: true })
		}catch(e){
			self.error(e);
		}
	}

	'---------------------------------- Pixel ----------------------------------'
	function Pixel(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				var p = msg.payload
				self.display.drawPixel(msg.payload,true)
			} catch (err) {
				self.error(err)
			}
		})
	}

	'---------------------------------- Line ----------------------------------'
	function Line(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				var p = msg.payload
				self.display.drawLine(p.x0,p.y0,p.x1,p.y1,p.color,true)
			} catch (err) {
				self.error(err)
			}
		})
	}

	'---------------------------------- Rectangle ----------------------------------'
	function FillRectangle(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				var p = msg.payload
				self.display.fillRect(p.x,p.y,p.w,p.h,p.color,true)
			} catch (err) {
				self.error(err)
			}
		})
	}

	'---------------------------------- String ----------------------------------'
	function String(n) {
		var self = this
		RED.nodes.createNode(self, n)

		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				if (typeof msg.payload === 'object') {
					var p = msg.payload
					var f = p.hasOwnProperty("font") ? p.font:  "oled_5x7";
					if (p.x || p.y) {
						self.display.setCursor(p.x || 1, p.y || 1)
					}
					self.display.writeString(
						font[f],
						p.size || n.size || 1, p.text || '',
						p.color || n.color || 1,
						typeof p.wrapping === 'undefined' ? n.wrapping : p.wrapping,
						true
					)
				} else {
					self.display.setCursor(1, 1)
					self.display.writeString(font.oled_5x7, 1, msg.payload, 1, true)
				}
			} catch (err) {
				self.error(err)
			}
		})
	}

	'---------------------------------- Scroll ----------------------------------'
	function Scroll(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				//console.log('Scroll ' + "parms: "  + msg.payload);
				var p = msg.payload
				if (typeof p !== 'undefined') {
					if (typeof p === 'boolean' && !p) {
						self.display.stopScroll()
					}
					else if (typeof p === 'object') {
					self.display.startScroll(p.direction || 'left', p.start || 0, p.stop || 128)
					//console.log('Startscroll ' + "direccion : "  + p.direction +  " start: "  + p.start + " stop  "  + p.stop + " payload  " + msg.payload.direction);
					} 
				}	
			} catch (err) {
				self.error(err)
			}
		})
	}

	'---------------------------------- Battery ----------------------------------'
	function Battery(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				var p = msg.payload
				self.display.drawLine(p.x,p.y,p.x+16,p.y,1)
				self.display.drawLine(p.x,p.y+8,p.x+16,p.y+8,1)
				self.display.drawLine(p.x,p.y,p.x,p.y+8,1)
				self.display.drawPixel([[p.x+17,p.y+1,1],[p.x+17,p.y+7,1]])
				self.display.drawLine(p.x+18,p.y+1,p.x+18,p.y+7,1)
				
				if (p.p >= 70) {
					self.display.fillRect(p.x+2,p.y+2,3,5,1,true)
					self.display.fillRect(p.x+7,p.y+2,3,5,1,true)
					self.display.fillRect(p.x+12,p.y+2,3,5,1,true)}

				if (p.p >= 40 && p.p < 70) {
					self.display.fillRect(p.x+2,p.y+2,3,5,1,true)
					self.display.fillRect(p.x+7,p.y+2,3,5,1,true)
					self.display.fillRect(p.x+12,p.y+2,3,5,0,true)}

				if (p.p >= 10 && p.p < 40) {
					self.display.fillRect(p.x+2,p.y+2,3,5,1,true)
					self.display.fillRect(p.x+7,p.y+2,3,5,0,true)
					self.display.fillRect(p.x+12,p.y+2,3,5,0,true)}

				if (p.p < 10) {
					self.display.fillRect(p.x+2,p.y+2,3,5,0,true)
					self.display.fillRect(p.x+7,p.y+2,3,5,0,true)
					self.display.fillRect(p.x+12,p.y+2,3,5,0,true)}

			} catch (err) {
				self.error(err)
			}
		})
	}
	
	'---------------------------------- Bluetooth ----------------------------------'
	function Bluetooth(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function (msg) {
			try {
				check(self.display, n)
				var p = msg.payload
				self.display.drawLine(p.x + 5, p.y +1 , p.x + 5, p.y + 11, 1)
				self.display.drawLine(p.x +2 , p.y + 3, p.x + 9, p.y + 8, 1)
				self.display.drawLine(p.x + 2, p.y + 9, p.x +8 , p.y + 3, 1)
				self.display.drawLine(p.x + 5, p.y + 1, p.x + 9, p.y + 3, 1)
				self.display.drawLine(p.x + 5, p.y + 11, p.x + 8, p.y + 9, 1)
			} catch (err) {
				self.error(err)
			}
		})
	}

	'---------------------------------- Wifi ----------------------------------'
	function Wifi(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				var p = msg.payload
				self.display.drawLine(p.x,p.y,p.x+8,p.y,1)
				self.display.drawLine(p.x,p.y,p.x+4,p.y+4,1)
				self.display.drawLine(p.x+8,p.y,p.x+4,p.y+4,1)
				self.display.drawLine(p.x+4,p.y,p.x+4,p.y+9,1)
				
				if (p.p >= 70) {
					self.display.fillRect(p.x+6,p.y+8,2,2,1,true)
					self.display.fillRect(p.x+10,p.y+6,2,4,1,true)
					self.display.fillRect(p.x+14,p.y+4,2,6,1,true)}

				if (p.p >= 40 && p.p < 70) {
					self.display.fillRect(p.x+6,p.y+8,2,2,1,true)
					self.display.fillRect(p.x+10,p.y+6,2,4,1,true)
					self.display.fillRect(p.x+14,p.y+4,2,6,0,true)}

				if (p.p >= 10 && p.p < 40) {
					self.display.fillRect(p.x+6,p.y+8,2,2,1,true)
					self.display.fillRect(p.x+10,p.y+6,2,4,0,true)
					self.display.fillRect(p.x+14,p.y+4,2,6,0,true)}

				if (p.p < 10) {
					self.display.fillRect(p.x+6,p.y+8,2,2,0,true)
					self.display.fillRect(p.x+10,p.y+6,2,4,0,true)
					self.display.fillRect(p.x+14,p.y+4,2,6,0,true)}

			} catch (err) {
				self.error(err)
			}
		})
	}

	'---------------------------------- drawPNGImage ----------------------------------'
	function Image(n) {
		var self = this
		var dirresources = __dirname + "/resources/";
		//console.log(dirresources);
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			try {
				check(self.display, n)
				//console.log("Oled timers actives: " + timeoutCollection.getAll());
				init = true;
				var p = msg.payload
				//var files = fs.readdirSync('.');
				//files.forEach(function(element) {
  				//		console.log("ficheros en pwd " + element );
 				//	 });
				//console.log("entra en Image(n) " + files );
				
				if (typeof p.image === 'string' && !p.image.includes("/")) {
						tryImage = p.image;
						p.image = dirresources + p.image;
					}
				try {
					if (! fs.statSync(p.image).isFile())  {
						//console.log("file " + p.image + "not exist.");
					}
					} catch (err) {
						p.image = dirresources + "notafile.png";
						//console.log("new file catch " + p.image);
						p.x = 0;
						p.y = 17;
						self.display.clearDisplay();
						self.error(err)
						self.display.writeString(
							font.oled_5x7,
							1, tryImage ,
							1,
							typeof p.wrapping === 'undefined' ? n.wrapping : p.wrapping
					)
				}
				if (typeof p.clear === 'boolean' && p.clear) {
						self.display.clearDisplay();

					}
				if (typeof p.reset === 'boolean' && p.reset) {
						timers.forEach(function(entry){
    					//console.log("myInterval cancelado  " + entry);
						clearInterval(entry);
						entry = null;
						});
						numTimers = 0;
						timers = [];
						self.display.clearDisplay();
						if (typeof pdxb === 'number'){pdxb = null}
						if (typeof pdyb === 'number'){pdyb = null}
						return

					}
				try {
					fs.createReadStream(p.image)
					.pipe(new PNG({ filterType: 4 }))
					.on('parsed', function () {
						if (typeof p.animated === 'boolean' && p.animated) {
							var pdxb = 1;
							var pdyb = -1;
							let myInterval = setInterval(() => { drawPseudo(this, self.display, pdxb, pdyb ) }, 10);
							timers.push(myInterval);
							numTimers += 1;
						}
						else {
							self.display.drawRGBAImage(this, p.x || Math.floor((self.display.WIDTH - this.width) / 2), p.y || Math.floor((self.display.HEIGHT - this.height) / 2));
						}
						});
				} catch (err) {
				self.error(err)
				}
			} catch (err) {
				self.error(err)
			}
		})
	}

	function drawPseudo(image, display, pdxb, pdyb ) {
		var x = 0;
		var y = 0;
		var dx = 0;
		var dy = 0;
		var init;
		var image;
		if ( typeof this.init === "undefined" || this.init === true || this.image !== image) { 
			this.init = false;
			this.image = image;
			this.x = 1;
			this.y = 1;
			this.dx = pdxb;
			this.dy = pdyb; 
			//console.log("entra drawPseudo this.x " + this.x + " this.y " + this.y + " this.dx " + this.dx + " this.dy " + this.dy);
       } 
	
    	display.clearDisplay();
		display.fillRect(0,0,display.WIDTH , display.HEIGHT ,1,true)
		display.fillRect(1,1,display.WIDTH - 2, display.HEIGHT - 2 ,0,true)
		display.drawRGBAImage(image, this.x, this.y);
    	if(this.x + this.dx > display.WIDTH  - image.width || this.x  < 1) {
        	this.dx = -this.dx;
    	}
    	if(this.y + this.dy > display.HEIGHT - image.height|| this.y  < 1) {
        	this.dy = -this.dy;
    	}
    
    	this.x += this.dx;
    	this.y += this.dy;
}


	'---------------------------------- Registration ----------------------------------'
	RED.nodes.registerType('Clear', OledFunction('clearDisplay'))
	RED.nodes.registerType('Dimmed', OledFunction('dimDisplay'))
	RED.nodes.registerType('Invertion', OledFunction('invertDisplay'))
	RED.nodes.registerType('Turn-off', OledFunction('turnOffDisplay'))
	RED.nodes.registerType('Turn-on', OledFunction('turnOnDisplay'))
	RED.nodes.registerType('oled-config', OledConfig)
	RED.nodes.registerType('Pixel', Pixel)
	RED.nodes.registerType('Line', Line)
	RED.nodes.registerType('FillRectangle', FillRectangle)
	RED.nodes.registerType('String', String)
	RED.nodes.registerType('Scroll', Scroll)
	RED.nodes.registerType('Battery', Battery)
	RED.nodes.registerType('Wifi', Wifi)
	RED.nodes.registerType('Bluetooth', Bluetooth)
	RED.nodes.registerType('Image', Image)

}
