import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { DevicePage } from './device';
import { TerminalPage } from '../terminal/terminal';

@NgModule({
  declarations: [
    DevicePage,
  ],
  imports: [
    IonicPageModule.forChild( DevicePage ),
  ],
  exports: [
    DevicePage,
  ]
})
export class DevicePageModule {}
