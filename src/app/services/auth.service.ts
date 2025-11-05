import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  user,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  updateDoc,
  deleteDoc,
  where
} from '@angular/fire/firestore';
import { Observable, from, of, BehaviorSubject, switchMap, map } from 'rxjs';
import { User, UserRole, UserCredentials, UserRegistration } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  user$ = user(this.auth);

  constructor() {
    // Observa mudanças no estado de autenticação do Firebase
    this.user$.pipe(
      switchMap(firebaseUser => {
        if (firebaseUser) {
          return this.getUserData(firebaseUser.uid).pipe(
            switchMap(userData => {
              // Se o usuário não tem documento no Firestore, cria um
              if (!userData) {
                console.log('⚠️ [AUTH] Usuário sem documento no Firestore, criando...');
                return this.createUserDocument(firebaseUser);
              }
              return of(userData);
            })
          );
        } else {
          return of(null);
        }
      })
    ).subscribe({
      next: (userData) => {
        this.currentUserSubject.next(userData);
      },
      error: (error) => {
        console.error('❌ [AUTH] Erro no observable de autenticação:', error);
        this.currentUserSubject.next(null);
      }
    });
  }

  /**
   * Realiza login com email e senha
   */
  async login(credentials: UserCredentials): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password
      );

      const userData = await this.getUserData(userCredential.user.uid).toPromise();

      if (!userData) {
        throw new Error('Dados do usuário não encontrados');
      }

      if (!userData.active) {
        await this.logout();
        throw new Error('Usuário inativo. Entre em contato com o administrador.');
      }

      return userData;
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Registra um novo usuário (apenas admin pode chamar)
   */
  async register(registration: UserRegistration): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        registration.email,
        registration.password
      );

      // Atualiza o perfil do usuário
      await updateProfile(userCredential.user, {
        displayName: registration.displayName
      });

      // Cria documento do usuário no Firestore
      const userData: User = {
        uid: userCredential.user.uid,
        email: registration.email,
        displayName: registration.displayName,
        role: registration.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      };

      await setDoc(doc(this.firestore, 'users', userData.uid), userData);

      return userData;
    } catch (error: any) {
      console.error('Erro no registro:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Realiza logout
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSubject.next(null);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  /**
   * Envia email de reset de senha
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error('Erro ao enviar email de reset:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Obtém dados do usuário do Firestore
   */
  getUserData(uid: string): Observable<User | null> {
    return from(getDoc(doc(this.firestore, 'users', uid))).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return docSnap.data() as User;
        }
        return null;
      })
    );
  }

  /**
   * Cria documento do usuário no Firestore se não existir
   */
  private createUserDocument(firebaseUser: any): Observable<User> {
    console.log('🔍 [AUTH] Criando documento do usuário:', firebaseUser.email);

    const userData: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email,
      role: firebaseUser.email === 'evac.contratos@gmail.com' ? UserRole.ADMIN : UserRole.COMUM,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };

    console.log('📤 [AUTH] Dados do usuário:', userData);

    return from(setDoc(doc(this.firestore, 'users', userData.uid), userData)).pipe(
      map(() => {
        console.log('✅ [AUTH] Documento do usuário criado com sucesso');
        return userData;
      })
    );
  }

  /**
   * Obtém o usuário atual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Verifica se o usuário é administrador
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Verifica se o usuário tem uma role específica
   */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Lista todos os usuários (apenas admin)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }

  /**
   * Atualiza dados do usuário (apenas admin ou próprio usuário)
   */
  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  /**
   * Ativa ou desativa um usuário (apenas admin)
   */
  async toggleUserStatus(uid: string, active: boolean): Promise<void> {
    try {
      await this.updateUser(uid, { active });
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      throw error;
    }
  }

  /**
   * Deleta um usuário (apenas admin)
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  /**
   * Trata erros de autenticação
   */
  private handleAuthError(error: any): Error {
    let message = 'Erro ao processar solicitação';

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Usuário não encontrado';
        break;
      case 'auth/wrong-password':
        message = 'Senha incorreta';
        break;
      case 'auth/email-already-in-use':
        message = 'Email já está em uso';
        break;
      case 'auth/weak-password':
        message = 'Senha muito fraca. Use no mínimo 6 caracteres';
        break;
      case 'auth/invalid-email':
        message = 'Email inválido';
        break;
      case 'auth/too-many-requests':
        message = 'Muitas tentativas. Tente novamente mais tarde';
        break;
      case 'auth/network-request-failed':
        message = 'Erro de conexão. Verifique sua internet e tente novamente.';
        break;
      case 'auth/invalid-credential':
        message = 'Email ou senha incorretos';
        break;
      default:
        message = error.message || message;
    }

    return new Error(message);
  }
}
