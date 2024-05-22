import { Component, OnDestroy, OnInit } from '@angular/core';
import { PluginListenerHandle } from '@capacitor/core';
import { Motion, MotionEventResult } from '@capacitor/motion';
import { Haptics } from '@capacitor/haptics';
import { CapacitorFlash } from '@capgo/capacitor-flash';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { User } from '../interfaces/user';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit, OnDestroy {
  private accelHandler: PluginListenerHandle | null = null;
  public isDetectorActive = false;
  public audio: HTMLAudioElement = new Audio();
  private currentAction: string | null = null;
  private lastTriggerCall: string = '';
  private email: string = '';
  private usuario!: User;
  private timerId: any;

  constructor(private alertController: AlertController, private auth: AuthService, private userService: UserService) { }

  ngOnInit(): void {
    this.auth.getUser().then(u => {
      this.email = u?.email!
      this.userService.getUserByEmail(this.email).subscribe(user => {
        this.usuario = user;
      })
    })
  }

  play(direction: string) {
    this.audio.pause();
    this.audio = new Audio(`assets/audios/${direction}.mp3`);
    this.audio.volume = 1; // Volume ranges from 0 to 1
    this.audio.play();
  }

  async toggleDetector() {
    if (this.isDetectorActive) {
      const alert = await this.alertController.create({
        header: 'Ingrese contraseña para apagar la alarma',
        inputs: [
          {
            name: 'password',
            type: 'password',
            placeholder: 'Contraseña'
          }
        ],
        buttons: [
          {
            text: 'Submit',
            handler: data => {
              if (data.password === this.usuario.password) {
                this.deactivateDetector();
              } else {
                this.triggerAlarm();
              }
            }
          }
        ]
      });

      await alert.present();
    } else {
      this.activateDetector();
    }
  }

  activateDetector() {
    this.isDetectorActive = true;
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission().then((permission: any) => {
          if (permission === 'granted') {
            this.startListening();
          } else {
            console.error('Permission not granted');
          }
        });
      } else {
        this.startListening();
      }
    } catch (e) {
      console.error('Permission denied or error occurred:', e);
    }
  }

  startListening() {
    Motion.addListener('accel', (event: MotionEventResult) => {
      this.handleMotion(event);
    }).then(handler => {
      this.accelHandler = handler;
    });
  }

  deactivateDetector() {
    this.isDetectorActive = false;
    this.lastTriggerCall == '';
    this.stopListening();
  }

  handleMotion(event: MotionEventResult) {
    const { x, y, z } = event.accelerationIncludingGravity;

    if (Math.abs(y) > Math.abs(x)) {
      if (y > 5 && this.currentAction !== 'vertical') {
        this.currentAction = 'vertical';
        this.triggerVerticalAction();
      }
    } else if (Math.abs(z) > 5 && this.currentAction !== 'horizontal') {
      this.currentAction = 'horizontal';
      this.triggerHorizontalAction();
    } else {
      if (x > 5 && this.currentAction !== 'right') {
        this.currentAction = 'right';
        this.triggerRightAction();
      } else if (x < -5 && this.currentAction !== 'left') {
        this.currentAction = 'left';
        this.triggerLeftAction();
      }
    }
  }

  triggerLeftAction() {
    if (this.lastTriggerCall != 'left') {
      clearTimeout(this.timerId);
      this.lastTriggerCall = 'left';
      this.play('left');
      this.currentAction = null;
    }
  }

  triggerRightAction() {
    if (this.lastTriggerCall != 'right') {
      clearTimeout(this.timerId);
      this.lastTriggerCall = 'right';
      this.play('right');
      this.currentAction = null;
    }
  }

  triggerVerticalAction() {
    if (this.lastTriggerCall != 'vertical') {
      clearTimeout(this.timerId);
      this.lastTriggerCall = 'vertical';
      this.play('vertical');
      CapacitorFlash.switchOn({ intensity: 1 }).then(() => this.timerId = setTimeout(() => {
        CapacitorFlash.switchOff();
        this.currentAction = null;
      }, 5000));
    }
  }

  triggerHorizontalAction() {
    if (this.lastTriggerCall != 'horizontal') {
      clearTimeout(this.timerId);
      this.lastTriggerCall = 'horizontal';
      this.play('horizontal');
      Haptics.vibrate({ duration: 5000 }).then(() => {
        this.timerId = setTimeout(() => {
          this.currentAction = null;
        }, 5000);
      });
    }
  }

  triggerAlarm() {
    this.lastTriggerCall = 'alarm';
    this.play('alarm');
    Haptics.vibrate({ duration: 5000 });
    CapacitorFlash.switchOn({ intensity: 1 }).then(() => setTimeout(() => {
      CapacitorFlash.switchOff();
      this.audio.pause();
    }, 5000));
  }

  stopListening() {
    if (this.accelHandler) {
      this.accelHandler.remove();
      this.accelHandler = null;
    }
    this.currentAction = null;
    this.lastTriggerCall = '';
  }

  ngOnDestroy() {
    this.stopListening();
    Motion.removeAllListeners();
    clearTimeout(this.timerId);
  }


  logOut() {
    setTimeout(() => {
      this.stopListening();
      this.auth.logout();
    }, 3000);
  }
}
