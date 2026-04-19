
import React, { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  action: string;
  resourceId: string;
  resourceType: string;
  status: string;
  createdAt: string;
  actor: {
   clerkUserId: string;
 };
 metadata?: string;
}

interface Props {
 isOpen: boolean;
 onClose: () => void;
 logs: AuditLog[];
 resourceName: string;
 isLoading?: boolean;
}

const ACTION_ICONS: Record<string, string> = {
 'upload': '📤',
 'download': '📥',
 'delete': '🗑',
 'view': '👁',
 'edit': '✏',
 'share': '🔗',
 'login': '🔓',
 'logout': '🔒',
 'denied': '⛔',
}
;
const ACTION_COLORS: Record<string, string> = {
 'upload': '#3b82f6',
 'download': '#10b981',
 'delete': '#ef4444',
 'view': '#8b5cf6',
 'edit': '#f59e0b',
 'share': '#06b6d4',
 'login': '#10b981',
 'logout': '#6366f1',
 'denied': '#ef4444',}
;
export default function AuditLogsModal({ isOpen, onClose, logs, resourceName, isLoading }: Props) {
 if (!isOpen) return null;
 const formatDate = (dateString: string) => {
   const date = new Date(dateString);
   return date.toLocaleString('en-US', {
     month: 'short',
     day: 'numeric',
     year: 'numeric',
     hour: '2-digit',
     minute: '2-digit',
     second: '2-digit',
   });
 };
 const getActionColor = (action: string) => ACTION_COLORS[action] || '#64748b';
 const getActionIcon = (action: string) => ACTION_ICONS[action] || '📋';
 const getMetadata = (metadata?: string) => {
   if (!metadata) return null;
   try {
     return JSON.parse(metadata);
   } catch {
     return null;
   }
 };
 return (
   <div
     style={{
       position: 'fixed',
       inset: 0,
       background: 'rgba(0,0,0,0.6)',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       zIndex: 1000,
     }}
     onClick={onClose}
   >
     <div
       style={{
         background: '#0f172a',
         borderRadius: 12,
         border: '1px solid #334155',
         maxWidth: 700,
         width: '90%',
         maxHeight: '80vh',
         overflow: 'hidden',
         display: 'flex',
         flexDirection: 'column',
         boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
       }}
       onClick={(e) => e.stopPropagation()}
     >
       {/* Header */}
       <div
         style={{
           padding: 20,
           borderBottom: '1px solid #334155',
           display: 'flex',
           justifyContent: 'space-between',
           alignItems: 'center',
         }}
       >
         <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18, fontWeight: 600 }}>
           📋 Audit Logs: {resourceName}
         </h2>
         <button
           onClick={onClose}
           style={{
             background: 'none',
             border: 'none',
             color: '#94a3b8',
             cursor: 'pointer',
             fontSize: 24,
           }}
         >
           ✕
         </button>
       </div>
       {/* Content */}
       <div
         style={{
           flex: 1,
           overflowY: 'auto',
           padding: 16,
         }}
       >
         {isLoading ? (
           <div
             style={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               height: 300,
               color: '#94a3b8',
             }}
           >
             ⏳ Loading audit logs...
           </div>
         ) : logs.length === 0 ? (
           <div
             style={{
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               height: 300,
               color: '#64748b',
             }}
           >
             <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
             <div style={{ fontSize: 16, fontWeight: 600 }}>No audit logs found</div>
           </div>
         ) : (
           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
             {logs.map((log, idx) => {
               const metadata = getMetadata(log.metadata);
               return (
                 <div
                   key={log.id}
                   style={{
                     background: '#1e293b',
                     border: `2px solid ${getActionColor(log.action)}`,
                     borderRadius: 8,
                     padding: 12,
                     display: 'flex',
                     gap: 12,
                     transition: 'all 0.2s',
                   }}
                 >
                   <div
                     style={{
                       fontSize: 24,
                       minWidth: 32,
                       display: 'flex',
                       alignItems: 'center',
                     }}
                   >
                     {getActionIcon(log.action)}
                   </div>
                   <div style={{ flex: 1, minWidth: 0 }}>
                     <div
                       style={{
                         display: 'flex',
                         justifyContent: 'space-between',
                         alignItems: 'flex-start',
                         marginBottom: 8,
                       }}
                     >
                       <div>
                         <span
                           style={{
                             color: getActionColor(log.action),
                             fontWeight: 600,
                             fontSize: 14,
                             textTransform: 'uppercase',
                           }}
                         >
                           {log.action}
                         </span>
                         <span
  style={{
    color:
      log.status === 'success'
        ? '#10b981'
        : log.status === 'failure'
        ? '#ef4444'
        : '#64748b',
    fontSize: 12,
    marginLeft: 8,
  }}
>
  ({log.status})
</span>
                         <span
                           style={{
                             color: log.resourceType === 'file' ? '#3b82f6' : '#8b5cf6',
                             fontSize: 12,
                             marginLeft: 8,
                           }}
                         >
                           {log.resourceType}
                         </span>
                       </div>
                       <div
                         style={{
                           color: '#94a3b8',
                           fontSize: 12,
                           textAlign: 'right',
                         }}
                       >
                         {formatDate(log.createdAt)}
                       </div>
                     </div>
                     <div style={{ color: '#cbd5e1', fontSize: 13 }}>
                       By: <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{log.actor.clerkUserId}</span>
                     </div>
                     {metadata && (
                       <div
                         style={{
                           color: '#94a3b8',
                           fontSize: 12,
                           marginTop: 8,
                           padding: 8,
                           background: '#0f172a',
                           borderRadius: 4,
                           fontFamily: 'monospace',
                           overflow: 'hidden',
                           textOverflow: 'ellipsis',
                         }}
                       >
                         <details>
                           <summary style={{ cursor: 'pointer', color: '#cbd5e1' }}>
                             View Details
                           </summary>
                           <pre
                             style={{
                               margin: '8px 0 0 0',
                               overflow: 'auto',
                               maxHeight: 150,
                               whiteSpace: 'pre-wrap',
                               wordBreak: 'break-word',
                             }}
                           >
                             {JSON.stringify(metadata, null, 2)}
                           </pre>
                         </details>
                       </div>
                     )}
                   </div>
                 </div>
               );
             })}
           </div>
         )}
       </div>
       {/* Footer */}
       <div
         style={{
           padding: 16,
           borderTop: '1px solid #334155',
           textAlign: 'right',
         }}
       >
         <button
           onClick={onClose}
           style={{
             padding: '8px 16px',
             background: '#334155',
             border: 'none',
             borderRadius: 6,
             color: '#e2e8f0',
             cursor: 'pointer',
             fontSize: 14,
             fontWeight: 500,
             transition: 'all 0.2s',
           }}
           onMouseOver={(e) => {
             e.currentTarget.style.background = '#475569';
           }}
           onMouseOut={(e) => {
             e.currentTarget.style.background = '#334155';
           }}
         >
           Close
         </button>
       </div>
     </div>
   </div>
 );
}