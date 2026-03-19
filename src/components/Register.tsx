import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { saveUserProfile, UserProfile } from '../services/dbService';
import { loadModels, getFaceDescriptor } from '../services/faceService';
import { toast } from 'react-hot-toast';
import { UserPlus, LogIn, Mail, Lock, User, Camera, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface RegisterProps {
  onToggle: () => void;
}

export default function Register({ onToggle }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadModels().then(() => setModelsLoaded(true));
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error('Could not access camera');
    }
  };

  const enrollFace = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (descriptor) {
        setFaceDescriptor(Array.from(descriptor));
        setFaceEnrolled(true);
        toast.success('Face enrolled successfully');
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      } else {
        toast.error('No face detected. Please try again.');
      }
    } catch (error) {
      toast.error('Face enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'employee' && !faceEnrolled) {
      toast.error('Please enroll your face first');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const profileData: UserProfile = {
        uid: userCredential.user.uid,
        name,
        email,
        role,
        createdAt: new Date().toISOString(),
      };
      
      if (faceDescriptor) {
        profileData.faceDescriptor = faceDescriptor;
      }

      await saveUserProfile(profileData);
      toast.success('Account created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Create Account</h1>
          <p className="text-stone-500 text-sm">Join our attendance system</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="employee">Employee / Intern</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {role === 'employee' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700">Face Enrollment</label>
              <div className="relative aspect-video bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center">
                {!faceEnrolled ? (
                  <>
                    <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                    {!videoRef.current?.srcObject && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 hover:text-emerald-600 transition-colors"
                      >
                        <Camera className="w-12 h-12 mb-2" />
                        <span className="text-sm font-medium">Start Camera</span>
                      </button>
                    )}
                    {videoRef.current?.srcObject && (
                      <button
                        type="button"
                        onClick={enrollFace}
                        disabled={loading || !modelsLoaded}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {modelsLoaded ? 'Capture Face' : 'Loading AI...'}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-emerald-600">
                    <ShieldCheck className="w-16 h-16 mb-2" />
                    <span className="font-medium">Face Enrolled!</span>
                    <button 
                      type="button" 
                      onClick={() => { setFaceEnrolled(false); setFaceDescriptor(null); }}
                      className="text-xs text-stone-500 underline mt-2"
                    >
                      Redo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggle}
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center justify-center gap-1 mx-auto"
          >
            <LogIn className="w-4 h-4" />
            Already have an account? Sign In
          </button>
        </div>
      </motion.div>
    </div>
  );
}
