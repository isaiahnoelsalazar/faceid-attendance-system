import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { UserProfile, AttendanceRecord, Settings, getSettings, saveSettings, handleFirestoreError, OperationType } from '../services/dbService';
import { toast } from 'react-hot-toast';
import Layout from './Layout';
import { ClipboardList, Download, Settings as SettingsIcon, MapPin, Users, Search, Filter, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';

export default function AdminDashboard({ profile }: { profile: UserProfile }) {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setLogs(records);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
      setLoading(false);
    });

    getSettings().then(setSettings);

    return () => unsubscribe();
  }, []);

  const exportToExcel = () => {
    const data = logs.map(log => ({
      'Employee Name': log.userName,
      'Type': log.type.toUpperCase(),
      'Date': format(new Date(log.timestamp), 'yyyy-MM-dd'),
      'Time': format(new Date(log.timestamp), 'hh:mm:ss a'),
      'Location (Lat)': log.location.lat,
      'Location (Lng)': log.location.lng,
      'Status': log.isWithinRange ? 'ON-SITE' : 'OFF-SITE'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Exported successfully');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await saveSettings(settings);
      setIsEditingSettings(false);
      toast.success('Settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout profile={profile}>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500 font-medium">Total Logs</p>
              <p className="text-2xl font-bold text-stone-900">{logs.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500 font-medium">On-Site Today</p>
              <p className="text-2xl font-bold text-stone-900">
                {logs.filter(l => l.isWithinRange && format(new Date(l.timestamp), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500 font-medium">Off-Site Logs</p>
              <p className="text-2xl font-bold text-stone-900">
                {logs.filter(l => !l.isWithinRange).length}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-stone-900">Attendance Logs</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-48"
                    />
                  </div>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-stone-900">{log.userName}</p>
                            <p className="text-[10px] text-stone-500">{format(new Date(log.timestamp), 'MMM dd, yyyy')}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${log.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-stone-600">
                            {format(new Date(log.timestamp), 'hh:mm a')}
                          </td>
                          <td className="px-6 py-4">
                            {log.isWithinRange ? (
                              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                On-site
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs font-medium text-red-600">
                                <XCircle className="w-4 h-4" />
                                Off-site
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-stone-500" />
                  <h2 className="font-bold text-stone-900">Location Lock</h2>
                </div>
                {!isEditingSettings && (
                  <button
                    onClick={() => setIsEditingSettings(true)}
                    className="text-emerald-600 text-sm font-bold hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {settings && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      disabled={!isEditingSettings}
                      value={settings.allowedLocation.lat}
                      onChange={(e) => setSettings({ ...settings, allowedLocation: { ...settings.allowedLocation, lat: parseFloat(e.target.value) } })}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      disabled={!isEditingSettings}
                      value={settings.allowedLocation.lng}
                      onChange={(e) => setSettings({ ...settings, allowedLocation: { ...settings.allowedLocation, lng: parseFloat(e.target.value) } })}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Radius (Meters)</label>
                    <input
                      type="number"
                      disabled={!isEditingSettings}
                      value={settings.allowedRadius}
                      onChange={(e) => setSettings({ ...settings, allowedRadius: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                    />
                  </div>

                  {isEditingSettings && (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingSettings(false)}
                        className="flex-1 bg-stone-100 text-stone-600 py-2 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              )}

              <div className="mt-6 p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-stone-900">Current Lock</p>
                    <p className="text-[10px] text-stone-500 mt-1">
                      Employees must be within {settings?.allowedRadius}m of these coordinates to be marked "On-site".
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-stone-900 rounded-2xl p-6 text-white">
              <h3 className="font-bold mb-2">Admin Tip</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                You can set the location lock to your office coordinates. 
                Any logs outside this radius will be flagged as "Off-site" in the reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
