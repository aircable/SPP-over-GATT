# Ionic 3 Hybrid Bluetooth Starter App


This is a hybrid Bluetooth starter app, written for Ionic 3 to run on Chrome (Web Bluetooth) and natively on iOS and Android. 
Both APIs are used to create a single source application. 

## SPP-over-GATT, Implementing Serial Port Profile

As an example we implemented high speed data transfer, using the GATT protocol. 
It is called SPP-over-GATT, Serial Port Profile over GATT. Basically one characteristic acts as a notifier for incoming data 
and can be written to for transfer. 

In addition we added a security protocol, similar to the standard Bluetooth PIN code. 
For information about the Serial-to-Bluetooth hardware find the AIRcable MiniMesh [here](https://goo.gl/RAjU5X).

## Javascript Library xterm.js

A terminal screen lets the user type commands (just characters) to send data and see data from the serial port.

We used the Javascript library [xterm.js](https://github.com/sourcelair/xterm.js) to display data in a simple terminal. 

## Make It Your Own

Take that source code and modify the way the data is displayed to create your own hybrid Bluetooth application.
Mainly, the Web Bluetooth code is in the ble provider implementation, while the DevicePage has the native Bluetooth implementation. 
Both files have to match, implementing the Bluetooth functionality of the hardware you connect to. Unfortunately both
APIs are so different that it is separate in two different locations.
We check using the Platform object if Cordova is present. This switches between the two implementations. See tab.ts.

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

Building for iOS and compile the icon/splash screen:

```bash
$ ionic cordova build ios --prod
$ ionic cordova resources
```

Then you can use Xcode to compile the app and run on device. 
Two hints: first change the TEAM and change the BUILD setting to use only the Developer credentials automatically.

## Testing on iOS

Configure your iPhone to allow Safari's Web Inispector. Then run Safari on OSX and use the developer tools to see debug messages
from the Ionic app running on the iOS device.

## iTune Store

The app has bee accepted by Apple to the iTune Store for iOS devices. You need to provide icons and splash screen,
which are included here as Photoshop files and then a number of screenshorts are the required resolution.
Install if from [here](https://itunes.apple.com/app/id1287601602).

## Progressive Web App

Build the app as a PWA to install on your web server. Copy the www directory to your server. There is a starter preview.html
file there, that makes the screen look like an iPhone, similar to the ionic serve command.

```bash
$ ionic build browser --prod
```