import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { UserProfile, AttendanceRecord, logAttendance, getSettings } from '../services/dbService';
import { loadModels, getFaceDescriptor, compareFaces } from '../services/faceService';
import { getCurrentLocation, calculateDistance } from '../services/locationService';
import { toast } from 'react-hot-toast';
import Layout from './Layout';
import { Camera, MapPin, Clock, CheckCircle2, XCircle, Loader2, History, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function EmployeeDashboard({ profile }: { profile: UserProfile }) {
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    loadModels().then(() => setModelsLoaded(true));

    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setHistory(records);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast.error('Could not access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const handleAttendance = async (type: 'in' | 'out') => {
    if (!videoRef.current) return;
    setLoading(true);
    
    try {
      // 1. Face Recognition
      const currentDescriptor = await getFaceDescriptor(videoRef.current);
      if (!currentDescriptor || !profile.faceDescriptor) {
        toast.error('Face not recognized. Please look directly at the camera.');
        setLoading(false);
        return;
      }

      const isMatch = compareFaces(Array.from(currentDescriptor), profile.faceDescriptor);
      if (!isMatch) {
        toast.error('Face verification failed. Unauthorized user.');
        setLoading(false);
        return;
      }

      // 2. Location Check
      const position = await getCurrentLocation();
      const settings = await getSettings();
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        settings.allowedLocation.lat,
        settings.allowedLocation.lng
      );

      const isWithinRange = distance <= settings.allowedRadius;

      // 3. Log Attendance
      await logAttendance({
        uid: profile.uid,
        userName: profile.name,
        timestamp: new Date().toISOString(),
        type,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        isWithinRange
      });

      toast.success(`Successfully timed ${type}! ${!isWithinRange ? '(Out of range)' : ''}`);
      stopCamera();
    } catch (error: any) {
      toast.error(error.message || 'Attendance logging failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout profile={profile}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Action Card */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-stone-900">Attendance Check</h2>
              </div>
              <div className="text-sm font-medium text-stone-500">
                {format(new Date(), 'EEEE, MMMM do')}
              </div>
            </div>

            <div className="p-6">
              <div className="relative aspect-video bg-stone-900 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-emerald-500/30 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-emerald-500 rounded-full opacity-50 animate-pulse" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-stone-400">
                    <Camera className="w-16 h-16 mb-4 opacity-20" />
                    <button
                      onClick={startCamera}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-emerald-700 transition-colors shadow-lg"
                    >
                      Activate Camera
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAttendance('in')}
                  disabled={!cameraActive || loading || !modelsLoaded}
                  className="flex flex-col items-center justify-center p-6 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    {loading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <CheckCircle2 className="w-6 h-6 text-white" />}
                  </div>
                  <span className="font-bold text-emerald-900">Time In</span>
                  <span className="text-xs text-emerald-600 mt-1">Verify & Log</span>
                </button>

                <button
                  onClick={() => handleAttendance('out')}
                  disabled={!cameraActive || loading || !modelsLoaded}
                  className="flex flex-col items-center justify-center p-6 bg-stone-50 border border-stone-200 rounded-2xl hover:bg-stone-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-12 h-12 bg-stone-600 rounded-full flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    {loading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <XCircle className="w-6 h-6 text-white" />}
                  </div>
                  <span className="font-bold text-stone-900">Time Out</span>
                  <span className="text-xs text-stone-500 mt-1">Verify & Log</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Location Info */}
          <div className="bg-emerald-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-emerald-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold">Location Lock Active</h3>
                <p className="text-emerald-100 text-sm">Your coordinates are verified upon check-in.</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">
                SECURE
              </div>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-stone-500" />
                <h2 className="font-bold text-stone-900">Recent Logs</h2>
              </div>
            </div>

            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-stone-400 italic text-sm">
                  No logs found for today
                </div>
              ) : (
                history.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${record.type === 'in' ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                      <div>
                        <p className="text-sm font-bold text-stone-900 uppercase">
                          Time {record.type}
                        </p>
                        <p className="text-xs text-stone-500">
                          {format(new Date(record.timestamp), 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.isWithinRange ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          On-site
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">
                          <XCircle className="w-3 h-3" />
                          Off-site
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <div className="bg-stone-900 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold">FaceID Security</h3>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Our AI-powered face recognition ensures that only you can log your attendance. 
              Make sure you are in a well-lit area for the best results.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
