import { PermissionLevel, ResourceType } from '@prisma/client';
export declare const getFolderAncestors: (folderId: string) => Promise<string[]>;
export declare const getEffectivePermission: (userId: string, resourceId: string, resourceType: ResourceType) => Promise<any>;
export declare const hasPermission: (userId: string, resourceId: string, resourceType: ResourceType, requiredLevel: PermissionLevel) => Promise<boolean>;
//# sourceMappingURL=accessControl.d.ts.map