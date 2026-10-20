import React from 'react';
import { ActivityLog } from '../../types';
import {
  Upload,
  Share2,
  Eye,
  ShieldAlert,
  Clock,
  Trash2,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  logs: ActivityLog[];
  isLoading?: boolean;
}

export const RecentActivity: React.FC<Props> = ({ logs, isLoading }) => {
  const getActionConfig = (action: string) => {
    switch (action.toLowerCase()) {
      case 'file uploaded':
        return {
          icon: Upload,
          bgColor: 'bg-blue-50',
          textColor: 'text-brand-blue',
          borderColor: 'border-blue-200',
        };
      case 'file shared':
        return {
          icon: Share2,
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-600',
          borderColor: 'border-emerald-200',
        };
      case 'recipient accessed file':
        return {
          icon: Eye,
          bgColor: 'bg-cyan-50',
          textColor: 'text-cyan-600',
          borderColor: 'border-cyan-200',
        };
      case 'share revoked':
      case 'undo share (revoked)':
        return {
          icon: ShieldAlert,
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-600',
          borderColor: 'border-rose-200',
        };
      case 'share expired':
        return {
          icon: Clock,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-500',
          borderColor: 'border-slate-200',
        };
      case 'file deleted':
        return {
          icon: Trash2,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-600',
          borderColor: 'border-amber-200',
        };
      default:
        return {
          icon: Activity,
          bgColor: 'bg-slate-50',
          textColor: 'text-slate-600',
          borderColor: 'border-slate-200',
        };
    }
  };

  const formatTimestamp = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const isToday = new Date().toDateString() === date.toDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return isToday ? timeStr : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-slate-100 rounded-xl text-navy-800">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-900">Live Activity Audit Log</h3>
            <p className="text-xs text-slate-500">Real-time trace of sharing, undo events, and recipient access</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          {logs.length} events
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-3">
              <div className="w-9 h-9 bg-slate-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-navy-800">No activity recorded yet</p>
          <p className="text-xs text-slate-500 mt-1">Upload a file or share one to start the audit trail.</p>
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-6">
            {logs.slice(0, 10).map((log, idx) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;
              const isLast = idx === Math.min(logs.length, 10) - 1;

              return (
                <li key={log.id}>
                  <div className="relative pb-6">
                    {!isLast && (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl ${config.bgColor} ${config.textColor} border ${config.borderColor} shadow-xs`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-navy-900">
                            {log.action}
                          </p>
                          <time className="text-[11px] text-slate-400 whitespace-nowrap">
                            {formatTimestamp(log.created_at)}
                          </time>
                        </div>

                        {/* Metadata Details */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                          {log.metadata?.file_name && (
                            <span className="font-medium text-navy-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              📄 {log.metadata.file_name}
                            </span>
                          )}
                          {log.metadata?.recipient_email && (
                            <span className="text-slate-500">
                              to <strong className="text-navy-900">{log.metadata.recipient_email}</strong>
                            </span>
                          )}
                          {log.metadata?.grace_period_seconds && (
                            <span className="text-[10px] bg-blue-50 text-brand-blue px-1.5 py-0.5 rounded font-medium">
                              {log.metadata.grace_period_seconds}s Grace
                            </span>
                          )}
                          {log.metadata?.is_undo && (
                            <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-semibold">
                              Undo Guard Triggered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
