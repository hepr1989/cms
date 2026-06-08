import { useEffect, useState, useCallback, useMemo } from 'react';
import { Select, Tree, message, Spin, Card, Empty } from 'antd';
import type { FolderVO } from '@/types';
import type { FolderPermissionVO } from '@/types/permission';
import { getAllFoldersFlat } from '@/api/folder';
import * as userApi from '@/api/user';
import { batchUpdatePermissions, getUserPermissions } from '@/api/permission';
import type { UserVO } from '@/types/auth';

// 模块级缓存，防止 StrictMode 二次挂载时重复请求
let permUsersLoading = false;
let permUsersCache: UserVO[] | null = null;
let foldersLoading = false;
let foldersCache: FolderVO[] | null = null;

interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
}

/** 从扁平列表构建栏目树（一次 API 调用，前端构建树结构） */
function buildTreeFromFlat(folders: FolderVO[]): TreeNode[] {
  const map = new Map<string, TreeNode & { parentCode: string }>();
  const roots: TreeNode[] = [];

  // 第一遍：创建所有节点
  for (const f of folders) {
    map.set(f.folderCode, {
      key: f.folderCode,
      title: f.title,
      parentCode: f.parentFolderCode,
      children: undefined,
    });
  }

  // 第二遍：建立父子关系
  for (const [, node] of map) {
    const parent = node.parentCode !== '-1' ? map.get(node.parentCode) : null;
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default function PermissionConfigPage() {
  const [users, setUsers] = useState<UserVO[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadTree();
  }, []);

  const loadUsers = async () => {
    if (permUsersLoading) {
      if (permUsersCache) setUsers(permUsersCache.filter(u => u.role !== 'ADMIN'));
      return;
    }
    permUsersLoading = true;
    try {
      const data = await userApi.listUsers() as unknown as UserVO[];
      permUsersCache = data;
      setUsers(data.filter(u => u.role !== 'ADMIN'));
    } catch {
      message.error('加载用户列表失败');
    } finally {
      permUsersLoading = false;
    }
  };

  /** 一次 API 调用获取所有栏目，前端构建树 */
  const loadTree = async () => {
    if (foldersLoading) {
      if (foldersCache) setTreeData(buildTreeFromFlat(foldersCache));
      return;
    }
    foldersLoading = true;
    setTreeLoading(true);
    try {
      const folders = await getAllFoldersFlat() as unknown as FolderVO[];
      foldersCache = folders;
      setTreeData(buildTreeFromFlat(folders));
    } catch {
      message.error('加载栏目树失败');
    } finally {
      foldersLoading = false;
      setTreeLoading(false);
    }
  };

  const loadPermissions = async (username: string) => {
    setLoading(true);
    try {
      const perms = await getUserPermissions(username) as unknown as FolderPermissionVO[];
      setCheckedKeys(perms.map(p => p.folderCode));
    } catch {
      message.error('加载权限失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (username: string) => {
    setSelectedUser(username || null);
    if (username) {
      loadPermissions(username);
    } else {
      setCheckedKeys([]);
    }
  };

  const handleCheck = useCallback(async (checked: any) => {
    if (!selectedUser) return;
    const keys = Array.isArray(checked) ? checked : checked.checked;
    const prevKeys = new Set(checkedKeys);
    const newKeys = new Set(keys);

    const added = keys.filter((k: string) => !prevKeys.has(k));
    const removed = checkedKeys.filter(k => !newKeys.has(k));

    if (added.length === 0 && removed.length === 0) return;

    setLoading(true);
    try {
      // 一次请求批量处理，避免 N+1 API 调用
      await batchUpdatePermissions({
        username: selectedUser,
        grantCodes: added,
        revokeCodes: removed,
      });
      setCheckedKeys(keys);
      message.success('权限已更新');
    } catch (err: any) {
      message.error(err.message || '权限操作失败');
      loadPermissions(selectedUser);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, checkedKeys]);

  const userOptions = useMemo(
    () => users.map(u => ({ label: u.username, value: u.username })),
    [users]
  );

  return (
    <div style={{ padding: 24 }}>
      <h2>权限配置</h2>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>选择用户：</span>
          <Select
            style={{ width: 280 }}
            placeholder="请搜索或选择用户"
            onChange={handleUserChange}
            value={selectedUser}
            options={userOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            allowClear
            onClear={() => handleUserChange('')}
          />
        </div>
        {selectedUser ? (
          <Spin spinning={loading || treeLoading}>
            {treeData.length > 0 ? (
              <Tree
                checkable
                treeData={treeData}
                checkedKeys={checkedKeys}
                onCheck={handleCheck}
                defaultExpandAll
              />
            ) : (
              !treeLoading && <Empty description="无栏目数据" />
            )}
          </Spin>
        ) : (
          <Empty description="请先选择用户" />
        )}
      </Card>
    </div>
  );
}
