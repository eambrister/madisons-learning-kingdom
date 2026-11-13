import {firebaseConfig} from './config.js';
let auth,db,A,F;export async function connect(callback){if(!firebaseConfig)return false;const B=await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js');A=await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');F=await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');const app=B.initializeApp(firebaseConfig);auth=A.getAuth(app);db=F.getFirestore(app);A.onAuthStateChanged(auth,callback);return true}
export const user=()=>auth?.currentUser;
export async function login(email,password,create=false){if(!auth)throw Error('Firebase is not configured.');return create?A.createUserWithEmailAndPassword(auth,email,password):A.signInWithEmailAndPassword(auth,email,password)}
export async function logout(){await A.signOut(auth)}
export async function load(){if(!user())return null;const snap=await F.getDoc(F.doc(db,'parents',user().uid));return snap.exists()?snap.data():null}
export async function save(state){if(!user())return;const ref=F.doc(db,'parents',user().uid);await F.runTransaction(db,async tx=>{const old=await tx.get(ref);const events={...(old.exists()?old.data().events:{}),...state.events};tx.set(ref,{...state,events})})}
