var edimax = require("edimax-smartplug"),
		Promise = require("bluebird"),
		EventEmitter = require('events').EventEmitter;


module.exports = function(RED) {

	RED.httpAdmin.get('/smartplug/devices', function(req, res, next) {
		edimax.discoverDevices({
			timeout: 5000,
			address: "255.255.255.255"
		}).then(function(results) {
			res.end(JSON.stringify(results));
		}).catch(function(e) {
			res.end(JSON.stringify(e));
		});
	});

	function SmartplugDeviceNode(n) {
		RED.nodes.createNode(this,n);
		var node = this;
		var isError = false;
		node.host = n.host;
		node.name = n.name;
		node.heartbeat = n.heartbeat ? n.heartbeat * 1000 : 5000;

		node.options = {
			timeout: parseFloat(n.timeout * 1000),
			name: node.name,
			host: node.host
		};

		//Set credentials
		if(this.credentials)
		{
			node.options.username = this.credentials.username;
			node.options.password = this.credentials.password;
		}

		//Emit status changes to all child nodes
		node.setStatus = function(status) {
			if (status !== node.status.text) {
				node.log("Status changed: "+ node.status.text + "-->" + status);
				if(status === "connected") {
					node.status = {fill:"green",shape:"dot",text:"connected"};
				} else if (status === "disconnected") {
					node.status = {fill:"red",shape:"ring",text:"disconnected"};
				} else if (status === "initializing") {
					node.status = {fill:"yellow",shape:"ring",text:"initializing"};
				}
				node.emit("statusChanged", node.status);
			}
		};
		node.setStatus("initializing");

		//Check connection
		function checkConnection() {
			edimax.getDeviceInfo(node.options).then(function(result) {
				//We received a valid answer, device is connected
				isError = false;
				node.setStatus("connected");
			}).catch(function(e) {
				//Error, means device is not reachable
				if(!isError) {
					isError = true;
					node.error(e);
				}
				node.setStatus("disconnected");
			}).done();
		}
		node.timer = setInterval(checkConnection, node.heartbeat);

		node.on("close", function() {
			if(node.timer) {
				clearInterval(node.timer);
			}
		});

	}
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

		node.enDeviceInfo = n.deviceinfo;
		node.enSchedule = n.schedule;
		node.enStatus = n.status;
		node.enCost = n.cost;
		node.costFactor = n.costFactor;
		node.costUnit = n.costUnit;

		node.status(node.device.status); // Initialize status
		node.interval = n.interval;
		node.topic = n.topic;
		node.timer = {};

		function repeating() {

			node.timer = setTimeout(repeating, node.interval);

			// Cancel if not connected
			if(node.device.status.text !== "connected") {
				return;
			}

			var promises = {};

			if (node.enDeviceInfo){
				 promises['deviceinfo'] = edimax.getDeviceInfo(node.device.options);
			}
			if (node.enSchedule) {
				promises['schedule'] = edimax.getSchedule(node.device.options);
			}
			if (node.enStatus) {
				promises['status'] = edimax.getStatusValues(true, node.device.options);
			}

			Promise.props(promises).then(function(result) {
				if(node.enStatus && node.enCost) {
					result.cost = {
						day: result.status.day * node.costFactor,
						week: result.status.week * node.costFactor,
						month: result.status.month * node.costFactor,
						unit: node.costUnit
					};
				}
				node.send({
					topic: node.topic,
					payload: result
				});
			}).catch(function(e) {
				node.error(e);
				node.device.setStatus('disconnected');
			})
		}

		// Callback when the status of the connection changed
		function refreshStatus(status) {
			node.status(status);
		}
		node.device.on("statusChanged", refreshStatus);

		//Clear timer and remove listener when the node is deleted
		node.on("close", function(){
			if(node.timer) {
				clearTimeout(node.timer);
			}
			node.device.removeListener("statusChanged", refreshStatus);
		});

		repeating();

	}
	RED.nodes.registerType("smartplug-in", SmartplugInNode);

	function SmartplugOutNode(n) {
		RED.nodes.createNode(this,n);
		var node = this;
		node.device = RED.nodes.getNode(n.device);
		node.status(node.device.status); // Initialize status
		node.response = n.response;
		node.topic = n.topic;

		node.on("input", function(msg) {

			var statement = false;

			//Cancel if not connected
			if(node.device.status.text !== "connected")
			{
				return;
			}

			if(typeof msg.payload === 'boolean') {
				statement = msg.payload;
			} else if (typeof msg.payload === 'string') {
				if (msg.payload.toLowerCase() === 'on' || msg.payload.toLowerCase() === 'true') {
					statement = true;
				} else if (msg.payload.toLowerCase() === 'off' || msg.payload.toLowerCase() === 'false') {
					statement = false;
				}
				else {
					node.error("Invalid Payload");
					return;
				}
			} else {
				node.error("Invalid payload type");
				return;
			}

			edimax.setSwitchState(statement, node.device.options).then(function(result) {
				if(node.response) {
					edimax.getSwitchState(node.device.options).then(function (state) {
						msg.payload = state;
						node.send(msg);
					}).catch(function(e) {
						node.error(e,{});
					});
				}
				node.device.setStatus("connected");
			}).catch(function(e) {
				node.device.setStatus("disconnected");
			});

		});

		// Callback when the status of the connection changed
		function refreshStatus(status) {
			node.status(status);
		}
		node.device.on("statusChanged", refreshStatus);

		//Clear timer and remove listener when the node is deleted
		node.on("close", function(){
			node.device.removeListener("statusChanged", refreshStatus);
		});

	}
	RED.nodes.registerType("smartplug-out", SmartplugOutNode);
};
