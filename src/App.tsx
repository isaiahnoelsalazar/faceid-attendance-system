import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { UserProfile, saveUserProfile } from './services/dbService';
import { Toaster, toast } from 'react-hot-toast';
import Login from './components/Login';
import Register from './components/Register';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import { Loader2, UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to profile:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const handleCreateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isDefaultAdmin = user.email === 'isaiahnoelsalazar474@gmail.com';
      const profileData: UserProfile = {
        uid: user.uid,
        email: user.email!,
        name: user.displayName || user.email!.split('@')[0],
        role: isDefaultAdmin ? 'admin' : 'employee',
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(profileData);
      toast.success('Profile created successfully!');
    } catch (error: any) {
      toast.error('Failed to create profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-stone-500 font-medium">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <Toaster position="top-right" />
      
      {!user ? (
        showRegister ? (
          <Register onToggle={() => setShowRegister(false)} />
        ) : (
          <Login onToggle={() => setShowRegister(true)} />
        )
      ) : !profile ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 p-6 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <UserPlus className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Setting up your profile...</h2>
          <p className="text-stone-600 max-w-md mb-8">
            We're finalizing your account details. This usually takes just a moment.
            If you've just registered, your profile is being created.
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleCreateProfile}
              className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              Complete Profile Setup
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white border border-stone-200 text-stone-700 font-semibold py-3 rounded-xl hover:bg-stone-50 transition-colors"
            >
              Refresh Page
            </button>
            
            <button
              onClick={() => auth.signOut()}
              className="w-full text-stone-500 text-sm hover:text-stone-700 transition-colors"
            >
              Sign Out & Try Again
            </button>
          </div>

          <div className="mt-12 p-4 bg-amber-50 border border-amber-100 rounded-xl text-left max-w-md">
            <h3 className="text-amber-800 font-semibold text-sm mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Still stuck?
            </h3>
            <p className="text-amber-700 text-xs leading-relaxed">
              If this screen persists, it might mean your profile wasn't fully created during registration. 
              Try clicking <strong>"Complete Profile Setup"</strong> above or <strong>Sign Out</strong> and register again.
            </p>
          </div>
        </div>
      ) : profile.role === 'admin' ? (
        <AdminDashboard profile={profile} />
      ) : (
        <EmployeeDashboard profile={profile} />
      )}
    </div>
  );
}
