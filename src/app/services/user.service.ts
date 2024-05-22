import { Injectable } from '@angular/core';
import { User } from '../interfaces/user';
import { Firestore, addDoc, collection, doc, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { onSnapshot, query } from 'firebase/firestore';


@Injectable({
  providedIn: 'root'
})
export class UserService {

  private dataRef = collection(this.firestore, 'users');

  constructor(private firestore: Firestore) { }

  createUser(user: User) {
    if (user === null) return Promise.reject();
    const docs = doc(this.dataRef);
    user.id = docs.id;
    return setDoc(docs, user);
  }

  getUserByEmail(email: string): Observable<User> {
    return new Observable<User>((observer) => {
      onSnapshot(this.dataRef, (snap) => {
        snap.docChanges().forEach(x => {
          const data = x.doc.data() as User;
          if (data.email === email) {
            observer.next(data);
          }
        });
      });
    });
  }

}
