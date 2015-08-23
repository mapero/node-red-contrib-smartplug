var edimax = require("edimax-smartplug");

module.exports = function(RED) {

	function SmartplugDeviceNode(n) {
		RED.nodes.createNode(this,n);
		var node = this;
		node.host = n.host;
		node.retry = n.retry * 1000;

		node.options = {
			timeout: parseFloat(n.timeout * 1000),
			name: 'edimax',
			host: node.host
		};

		if(this.credentials)
		{
			node.options.username = this.credentials.username;
			node.options.password = this.credentials.password;
		}

	};
	RED.nodes.registerType("smartplug-device", SmartplugDeviceNode, {
		credentials: {
			username: {type: "text"},
			password: {type: "password"}
		}
	});

	function SmartplugInNode(n) {
		RED.nodes.createNode(this,n);
		var node = this;
		node.device = RED.nodes.getNode(n.device);
		node.interval = n.interval;
		node.topic = n.topic;
		node.timer = {};

		node.promises = [];
		node.indexes = [];
		if (n.deviceinfo){
			 node.promises.push(edimax.getDeviceInfo(node.device.options));
			 node.indexes.push("deviceinfo");
		}
		if (n.schedule) {
			node.promises.push(edimax.getSchedule(node.device.options));
			node.indexes.push("schedule");
		}
		if (n.status) {
			node.promises.push(edimax.getStatusValues(true, node.device.options));
			node.indexes.push("status");
		}

		function repeating() {
			Promise.all(node.promises).then(function(result) {
				var msg = new Object();
				for (var index in result) {
					msg[node.indexes[index]] = result[index];
				}
				node.send({topic: node.topic ? node.topic : undefined, payload: msg});
				node.timer = setTimeout(repeating, node.interval);
			}).catch(function(e) {
				node.error(e,{});
				node.timer = setTimeout(repeating, node.device.retry);
			});

		}

		node.on("close", function(){
			clearTimeout(node.timer);
		});

		repeating();

	};
	RED.nodes.registerType("smartplug-in", SmartplugInNode);

	function SmartplugOutNode(n) {
		RED.nodes.createNode(this,n);
		var node = this;
		node.device = RED.nodes.getNode(n.device);
		node.response = n.response;
		node.topic = n.topic;

		node.on("input", function(msg) {
			if(typeof msg.payload === 'boolean') {
				edimax.setSwitchState(msg.payload, node.device.options).then(function(result) {
					if(node.response) {
						edimax.getSwitchState(node.device.options).then(function (state) {
							node.send({topic: node.topic, payload: state});
						}).catch(function(e) {
							node.error(e,{});
						});
					}
				}).catch(function(e) {
					node.error(e,{});
				});

			}
		});

	};
	RED.nodes.registerType("smartplug-out", SmartplugOutNode);
}
