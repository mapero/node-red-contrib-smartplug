[![npm version](https://badge.fury.io/js/node-red-contrib-smartplug.svg)](https://badge.fury.io/js/node-red-contrib-smartplug)
[![Build Status](https://travis-ci.org/bashGroup/node-red-contrib-smartplug.svg?branch=master)](https://travis-ci.org/bashGroup/node-red-contrib-smartplug)

[![NPM](https://nodei.co/npm/node-red-contrib-smartplug.png?compact=true)](https://nodei.co/npm/node-red-contrib-smartplug/)


# Edimax Smartplug for Node-RED

Easily integrate your edimax smartplug into your node-RED flow.
## Installation
Just install this plugin in your Node-RED folder by using npm:

```bash
npm install node-red-contrib-smartplug
```

Or if you have installed Node-RED globally use:

```bash
npm install -g node-red-contrib-smartplug
```

## Usage
This packages brings two nodes to your node-RED palette:

The input node polls the status of your Edimax Smartplug device and injects the result to your flow.

The output node lets you change the state of your Edimax Smartplug by sending **true** respectively **false** to the input. It is able to inject the new state to the flow as output.

## Contributing
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

## Credits
Jochen Scheib

[![Paypal](https://mapero.github.io/paypal.png)](https://www.paypal.me/JochenScheib/2)

## License
MIT
