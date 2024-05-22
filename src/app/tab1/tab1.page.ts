import { Component, OnDestroy, OnInit } from '@angular/core';
import { PluginListenerHandle } from '@capacitor/core';
import { Motion, MotionEventResult } from '@capacitor/motion';
import { Haptics } from '@capacitor/haptics';
import { CapacitorFlash } from '@capgo/capacitor-flash';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit, OnDestroy {
  private accelHandler: PluginListenerHandle | null = null;
  public isDetectorActive = false;
  public audio: HTMLAudioElement = new Audio();
  private lastTriggerTime = 0;
  private debounceTime = 2000; // 2 seconds debounce time
  private lastEventCall: string = '';
  private email!: string;
  private fail: boolean = false;


  constructor(private auth: AuthService, private alertController: AlertController) { }

  ngOnInit(): void {
    this.auth.getUserLogged().subscribe(user => this.email = user?.email!);
  }

  play(direction: string) {
    this.audio.pause();
    this.audio = new Audio(`assets/audios/${direction}.mp3`);
    this.audio.volume = 1;  // Volume ranges from 0 to 1
    this.audio.play();
  }

  async toggleDetector() {

    if (this.fail === false)
      this.isDetectorActive = !this.isDetectorActive;

    if (this.isDetectorActive) {
      try {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== 'granted') {
            throw new Error('Permission not granted');
          }
        }
        this.accelHandler = await Motion.addListener('accel', (event: MotionEventResult) => {
          this.handleMotion(event);
        });
      } catch (e) {
        console.error('Permission denied or error occurred:', e);
      }
    } else {
      const alert = await this.alertController.create({
        header: 'Ingrese contraseña',
        inputs: [
          {
            name: 'password',
            type: 'password',
            placeholder: 'Contraseña'
          }
        ],
        buttons: [
          {
            text: 'Ingresar',
            handler: data => {
              this.auth.login(
                {
                  email: this.email,
                  password: data.password,
                }
              )
                .then(res => {
                  if (res != null) {
                    this.isDetectorActive = false;
                    this.fail = false;
                    this.stopListening();
                  } else {
                    this.isDetectorActive = true;
                    this.fail = true;
                    this.triggerAlarm();
                  }
                })
                .catch(err => {
                  this.isDetectorActive = true;
                  this.fail = true;
                  this.triggerAlarm();
                });

            }
          }
        ]
      });
      await alert.present();
    }
  }

  handleMotion(event: MotionEventResult) {
    const { x, y, z } = event.accelerationIncludingGravity;
    const currentTime = Date.now();

    if (currentTime - this.lastTriggerTime < this.debounceTime) {
      return;
    }

    if (Math.abs(y) > Math.abs(x)) {
      if (y > 5) {
        this.triggerVerticalAction();
      }
    } else {
      if (x > 5) {
        this.triggerRightAction();
      } else if (x < -5) {
        this.triggerLeftAction();
      }
    }
    if (Math.abs(z) > 5) {
      this.triggerHorizontalAction();
    }

    this.lastTriggerTime = currentTime;
  }

  triggerLeftAction() {
    if (this.lastEventCall !== 'left') {
      this.lastEventCall = 'left';
      this.play('left');
    }
  }

  triggerRightAction() {
    if (this.lastEventCall !== 'right') {
      this.lastEventCall = 'right';
      this.play('right');
    }
  }

  triggerVerticalAction() {
    if (this.lastEventCall !== 'vertical') {
      this.lastEventCall = 'vertical';
      this.play('vertical');
      CapacitorFlash.switchOn({ intensity: 1 }).then(() => setTimeout(() => CapacitorFlash.switchOff(), 5000));
    }
  }

  triggerHorizontalAction() {
    if (this.lastEventCall !== 'horizontal') {
      this.lastEventCall = 'horizontal';
      this.play('horizontal');
      Haptics.vibrate({ duration: 5000 });
    }
  }

  stopListening() {
    if (this.accelHandler) {
      this.accelHandler.remove();
      this.accelHandler = null;
      this.lastEventCall = '';
    }
  }

  triggerAlarm() {
    this.play('alarm');
    Haptics.vibrate({ duration: 5000 });
    CapacitorFlash.switchOn({ intensity: 1 }).then(() => setTimeout(() => {
      CapacitorFlash.switchOff();
      this.fail = false;
    }, 5000));
  }

  ngOnDestroy() {
    this.stopListening();
    Motion.removeAllListeners();
  }

  logOut() {
    setTimeout(() => {
      this.stopListening();
      this.auth.logout();
    }, 3000);
  }
}
