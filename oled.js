var i2c = require('i2c-bus')
var i2cBus = i2c.openSync(1)
var Oled = require('oled-i2c-bus')
var font = require('oled-font-5x7')

module.exports = function(RED) {
	var displays = {}
	
	'---------------------------------- Function ----------------------------------'
	function OledFunction(fn) {
		return function(n) {
			var self = this
			RED.nodes.createNode(self, n)
			self.display = displays[n.display]
			self.on('input', function(msg) {
				self.display[fn](msg.payload)
				self.display.update()
			})
		}
	}

	'---------------------------------- Check ----------------------------------'
	function check(display, node) {
		if (node.clear) {
			display.clearDisplay()
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
			address: parseInt('0x'+config.address),
		}
		displays[self.id] = new Oled(i2cBus, self.config)

		if (config.flip)
			displays[self.id].SEG_REMAP = 0xA0

		check(displays[self.id], { clear: true })
	}

	'---------------------------------- Pixel ----------------------------------'
	function Pixel(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			check(self.display, n)
			try {
				var p = msg.payload
				self.display.drawPixel(msg.payload)
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
			check(self.display, n)
			try {
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
			check(self.display, n)
			try {
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
			check(self.display, n)
			try {
				if (typeof msg.payload === 'object') {
					var p = msg.payload
					if (p.x || p.y) {
						self.display.setCursor(p.x || 1, p.y || 1)
					}
					self.display.writeString(
						font,
						p.size || n.size || 1, p.text || '',
						p.color || n.color || 1,
						typeof p.wrapping === 'undefined' ? n.wrapping : p.wrapping
					)
				} else {
					self.display.setCursor(1, 1)
					self.display.writeString(font, 1, msg.payload, 1, true)
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
			check(self.display, n)
			try {
				var p = msg.payload
				if (typeof p !== 'undefined') {
					if (typeof p === 'boolean' && !p) {
						self.display.stopScroll()
					}
					else if (typeof p === 'object') {
					self.display.startScroll(p.direction || 'left', p.start || 0, p.stop || 128)
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
			check(self.display, n)
			try {
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

	'---------------------------------- Wifi ----------------------------------'
	function Wifi(n) {
		var self = this
		RED.nodes.createNode(self, n)
		self.display = displays[n.display]
		self.on('input', function(msg) {
			check(self.display, n)
			try {
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
}
