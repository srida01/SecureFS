
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
 'upload': 'var(--accent-purple)',
 'download': 'var(--accent-teal)',
 'delete': 'var(--accent-coral)',
 'view': 'var(--accent-lavender)',
 'edit': 'var(--accent-amber)',
 'share': 'var(--accent-teal)',
 'login': 'var(--accent-teal)',
 'logout': 'var(--accent-purple)',
 'denied': 'var(--accent-coral)',}
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
 const getActionColor = (action: string) => ACTION_COLORS[action] || 'var(--text-muted)';
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
         background: 'var(--surface)',
         borderRadius: 12,
         border: '1px solid var(--border)',
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
           borderBottom: '1px solid var(--border)',
           display: 'flex',
           justifyContent: 'space-between',
           alignItems: 'center',
         }}
       >
         <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 600 }}>
           📋 Audit Logs: {resourceName}
         </h2>
         <button
           onClick={onClose}
           style={{
             background: 'none',
             border: 'none',
             color: 'var(--text-secondary)',
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
               color: 'var(--text-secondary)',
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
               color: 'var(--text-muted)',
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
                     background: 'var(--bg-base)',
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
        ? 'var(--accent-teal)'
        : log.status === 'failure'
        ? 'var(--accent-coral)'
        : 'var(--text-muted)ext-muted)',
    fontSize: 12,
    marginLeft: 8,
  }}
>
  ({log.status})
</span>
                         <span
                           style={{
                             color: log.resourceType === 'file' ? 'var(--accent-teal)' : 'var(--accent-purple)',
                             fontSize: 12,
                             marginLeft: 8,
                           }}
                         >
                           {log.resourceType}
                         </span>
                       </div>
                       <div
                         style={{
                           color: 'var(--text-secondary)',
                           fontSize: 12,
                           textAlign: 'right',
                         }}
                       >
                         {formatDate(log.createdAt)}
                       </div>
                     </div>
                     <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                       By: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{log.actor.clerkUserId}</span>
                     </div>
                     {metadata && (
                       <div
                         style={{
                           color: 'var(--text-secondary)',
                           fontSize: 12,
                           marginTop: 8,
                           padding: 8,
                           background: 'var(--bg-page)',
                           borderRadius: 4,
                           fontFamily: 'monospace',
                           overflow: 'hidden',
                           textOverflow: 'ellipsis',
                         }}
                       >
                         <details>
                           <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
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
           borderTop: '1px solid var(--border)',
           textAlign: 'right',
         }}
       >
         <button
           onClick={onClose}
           style={{
             padding: '8px 16px',
             background: 'var(--border)',
             border: 'none',
             borderRadius: 6,
             color: 'var(--text-primary)',
             cursor: 'pointer',
             fontSize: 14,
             fontWeight: 500,
             transition: 'all 0.2s',
           }}
           onMouseOver={(e) => {
             e.currentTarget.style.background = 'var(--border-light)';
           }}
           onMouseOut={(e) => {
             e.currentTarget.style.background = 'var(--border)';
           }}
         >
           Close
         </button>
       </div>
     </div>
   </div>
 );
}