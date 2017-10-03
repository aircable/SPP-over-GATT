Ionic 3 Serial Port Profile over GATT Application

# SPP-over-GATT

This is a hybrid Bluetooth application, written to run on Chrome, iOS and Android as either a progressive web app or natively.

It uses Bluetooth GATT to connect to the AIRcable MiniMesh which implements a serial port profile.

A terminal screen lets the user type commands (just characters), send data and see data from the serial port.

## Connect to AIRcable's Serial MiniMesh

The AIRcable MiniMesh is a Bluetooth BLE to Serial DB9 adapter. 

*You are welcome to contribute to the project.* No everything is perfect yet.
For example please help to get the [xterm.js](https://github.com/sourcelair/xterm.js) better integrated. 
Some style things are a bit weird, e.g. the use of <ion-textbox> which makes it look good, but does not exist.
Also additional features contributions are welcome.


### With the Ionic CLI:

Make sure you have [Node.js](https://nodejs.org) and Ionic installed:
```bash
$ sudo npm install -g cordova ionic
```

Then just cd into the `SPP-over-GATT` directory and run:
```bash
$ ionic serve -lc
```

Testing on iOS:

```bash
$ ionic cordova build ios
```

Then use Xcode to compile app and run on device.